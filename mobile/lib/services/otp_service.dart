import 'api_service.dart';

class OtpService {
  /// Send OTP to email for student registration
  static Future<OtpResponse> sendOtp({
    required String email,
    required String firstName,
    String middleName = '',
    required String lastName,
    required String password,
    bool privacyPolicyAccepted = true,
  }) async {
    final response = await ApiService.post(
      '/auth/send-otp',
      body: {
        'email': email,
        'firstName': firstName,
        'middleName': middleName,
        'lastName': lastName,
        'name': '$firstName $middleName $lastName'.replaceAll('  ', ' ').trim(),
        'password': password,
        'privacyPolicyAccepted': privacyPolicyAccepted,
      },
    );

    return OtpResponse.fromJson(response);
  }

  /// Verify OTP and create account
  static Future<OtpVerificationResponse> verifyOtp({
    required String email,
    required String otp,
  }) async {
    final response = await ApiService.post(
      '/auth/verify-otp',
      body: {
        'email': email,
        'otp': otp,
      },
    );

    return OtpVerificationResponse.fromJson(response);
  }

  /// Resend OTP to email
  static Future<OtpResponse> resendOtp({
    required String email,
  }) async {
    final response = await ApiService.post(
      '/auth/resend-otp',
      body: {
        'email': email,
      },
    );

    return OtpResponse.fromJson(response);
  }
}

class OtpResponse {
  OtpResponse({
    required this.message,
    required this.email,
    required this.expiresIn,
    this.devOTP, // For development only
  });

  final String message;
  final String email;
  final int expiresIn; // in seconds
  final String? devOTP;

  factory OtpResponse.fromJson(Map<String, dynamic> json) {
    return OtpResponse(
      message: json['message'] as String? ?? '',
      email: json['email'] as String? ?? '',
      expiresIn: json['expiresIn'] as int? ?? 300,
      devOTP: json['devOTP'] as String?,
    );
  }
}

class OtpVerificationResponse {
  OtpVerificationResponse({
    required this.message,
    required this.user,
    required this.token,
  });

  final String message;
  final Map<String, dynamic> user;
  final String token;

  factory OtpVerificationResponse.fromJson(Map<String, dynamic> json) {
    return OtpVerificationResponse(
      message: json['message'] as String? ?? '',
      user: json['user'] as Map<String, dynamic>? ?? {},
      token: json['token'] as String? ?? '',
    );
  }
}
