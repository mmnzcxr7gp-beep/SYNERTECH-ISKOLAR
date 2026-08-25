
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user_model.dart';
import 'api_service.dart';
import 'socket_io_service.dart';
import 'firebase_push_service.dart';

/// Authentication service handling login, session persistence,
/// profile management, and document uploads.
class AuthService {
  // SharedPreferences keys
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';
  static const String _refreshTokenKey = 'auth_refresh_token';

  // In-memory session cache
  static AuthResponse? _currentSession;

  // ─── Login ────────────────────────────────────────────────────────────────

  /// Log in with email and password.
  /// If [rememberMe] is true, the session is persisted locally.
  /// Log in with email and password.
  /// If MFA is active, returns a result indicating MFA is required.
  static Future<LoginResult> login({
    required String email,
    required String password,
    bool rememberMe = true,
  }) async {
    final response = await ApiService.post(
      '/auth/login',
      body: {
        'email': email,
        'password': password,
      },
    );

    if (response['requiresMfa'] == true) {
      return LoginResult(
        requiresMfa: true,
        mfaToken: response['mfaToken'] as String?,
        email: response['email'] as String?,
      );
    }

    final authResponse = AuthResponse.fromJson(response);
    _currentSession = authResponse;

    if (rememberMe) {
      await saveSession(authResponse);
    }

    // Initialize socket and push service in background
    initUserServices(authResponse.user, authResponse.token);

    return LoginResult(authResponse: authResponse);
  }

  /// Verify MFA OTP to complete login
  static Future<AuthResponse> verifyLoginOtp({
    required String mfaToken,
    required String otp,
    bool rememberMe = true,
  }) async {
    final response = await ApiService.post(
      '/auth/verify-login-otp',
      body: {
        'mfaToken': mfaToken,
        'otp': otp,
      },
    );

    final authResponse = AuthResponse.fromJson(response);
    _currentSession = authResponse;

    if (rememberMe) {
      await saveSession(authResponse);
    }

    // Initialize socket and push service in background
    initUserServices(authResponse.user, authResponse.token);

    return authResponse;
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  /// Clear all saved session data.
  static Future<void> logout() async {
    _currentSession = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await prefs.remove(_refreshTokenKey);
  }

  // ─── Token retrieval ──────────────────────────────────────────────────────

  /// Get the current auth token (from memory or storage).
  static Future<String?> getToken() async {
    if (_currentSession?.token != null) {
      return _currentSession!.token;
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  // ─── Saved session ────────────────────────────────────────────────────────

  /// Retrieve a previously saved [AuthResponse] from local storage.
  static Future<AuthResponse?> getSavedAuthResponse() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final userJson = prefs.getString(_userKey);

    if (token == null || userJson == null) return null;

    try {
      final user = User.fromJsonString(userJson);
      final refreshToken = prefs.getString(_refreshTokenKey);
      final authResponse = AuthResponse(
        user: user,
        token: token,
        refreshToken: refreshToken,
      );
      _currentSession = authResponse;

      // Initialize socket and push service in background
      initUserServices(user, token);

      return authResponse;
    } catch (e) {
      debugPrint('[AuthService.getSavedAuthResponse] Error: $e');
      return null;
    }
  }

  // ─── Save session ─────────────────────────────────────────────────────────

  /// Persist an [AuthResponse] to local storage.
  static Future<void> saveSession(AuthResponse authResponse) async {
    _currentSession = authResponse;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, authResponse.token);
    await prefs.setString(_userKey, authResponse.user.toJsonString());
    if (authResponse.refreshToken != null) {
      await prefs.setString(_refreshTokenKey, authResponse.refreshToken!);
    }
  }

  // ─── Fetch profile ────────────────────────────────────────────────────────

  /// Fetch the current user's profile from the backend.
  static Future<User> fetchProfile(String token) async {
    final response = await ApiService.get('/auth/me', token: token);

    // Backend may return { user: {...} } or the user object directly
    final userData = response['user'] as Map<String, dynamic>? ?? response;
    final user = User.fromJson(userData);

    // Update local cache
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, user.toJsonString());

    if (_currentSession != null) {
      _currentSession = AuthResponse(
        user: user,
        token: _currentSession!.token,
        refreshToken: _currentSession!.refreshToken,
      );
    }

    return user;
  }

  // ─── Get current user (from cache) ────────────────────────────────────────

  /// Get the current user from memory or local storage without a network call.
  static Future<User?> getCurrentUser() async {
    if (_currentSession != null) {
      return _currentSession!.user;
    }
    final saved = await getSavedAuthResponse();
    return saved?.user;
  }

  // ─── Update student profile ───────────────────────────────────────────────

  /// Update the student's profile fields and optionally upload a profile picture.
  static Future<User> updateStudentProfile({
    required String token,
    String? firstName,
    String? middleName,
    String? lastName,
    String? school,
    String? course,
    String? yearLevel,
    String? mobileNumber,
    dynamic profilePicture,
  }) async {
    // If there's a profile picture, use multipart upload
    if (profilePicture != null && (profilePicture is! String || profilePicture.isNotEmpty)) {
      final fields = <String, String>{};
      if (firstName != null) fields['firstName'] = firstName;
      if (middleName != null) fields['middleName'] = middleName;
      if (lastName != null) fields['lastName'] = lastName;
      if (school != null) fields['school'] = school;
      if (course != null) fields['course'] = course;
      if (yearLevel != null) fields['yearLevel'] = yearLevel;
      if (mobileNumber != null) fields['mobileNumber'] = mobileNumber;

      final response = await ApiService.multipartUpload(
        '/auth/student/profile',
        fields: fields,
        filePaths: {'profilePicture': profilePicture},
        token: token,
      );

      final userData = response['user'] as Map<String, dynamic>? ?? response;
      final user = User.fromJson(userData);
      await _updateCachedUser(user, token);
      return user;
    }

    // Otherwise use a regular PUT
    final body = <String, dynamic>{};
    if (firstName != null) body['firstName'] = firstName;
    if (middleName != null) body['middleName'] = middleName;
    if (lastName != null) body['lastName'] = lastName;
    if (school != null) body['school'] = school;
    if (course != null) body['course'] = course;
    if (yearLevel != null) body['yearLevel'] = yearLevel;
    if (mobileNumber != null) body['mobileNumber'] = mobileNumber;

    final response = await ApiService.put(
      '/auth/student/profile',
      token: token,
      body: body,
    );

    final userData = response['user'] as Map<String, dynamic>? ?? response;
    final user = User.fromJson(userData);
    await _updateCachedUser(user, token);
    return user;
  }

  // ─── Upload provider document ─────────────────────────────────────────────

  /// Upload organization/provider verification documents.
  static Future<Map<String, dynamic>> uploadProviderDocument({
    required String token,
    required List<dynamic> files,
  }) async {
    final response = await ApiService.multipartUpload(
      '/auth/provider/upload-document',
      filePaths: {'organization_documents': files},
      token: token,
    );

    return response;
  }

  // ─── Submit student verification documents ────────────────────────────────

  /// Submit verification documents and receive updated user profile.
  /// Uses the correct backend endpoint: /auth/student/verify
  static Future<User> submitStudentVerificationDocuments({
    required String token,
    required List<dynamic> files,
  }) async {
    final response = await ApiService.multipartUpload(
      '/auth/student/verify',
      fields: {},
      filePaths: {'verification_documents': files},
      token: token,
    );

    // Extract user from response — backend returns updated user
    final userData = response['user'] as Map<String, dynamic>? ?? response;
    final user = User.fromJson(userData);
    await _updateCachedUser(user, token);
    return user;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  static Future<void> _updateCachedUser(User user, String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, user.toJsonString());

    if (_currentSession != null) {
      _currentSession = AuthResponse(
        user: user,
        token: token,
        refreshToken: _currentSession!.refreshToken,
      );
    }
  }

  /// Initialize background user services (Socket.IO & Firebase Push notifications)
  static Future<void> initUserServices(User user, String token) async {
    try {
      // 1. Connect Socket.IO
      final socketService = SocketIOClientService();
      await socketService.connect(user.id.toString(), role: user.role);

      // 2. Initialize Firebase Push Notifications
      final pushService = FirebasePushService();
      await pushService.initialize(token);
    } catch (e) {
      debugPrint('[AuthService.initUserServices] Error initializing services: $e');
    }
  }
}
