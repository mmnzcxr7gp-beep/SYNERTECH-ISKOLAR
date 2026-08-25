import 'api_service.dart';

class StudentService {
  /// Submit student verification documents
  static Future<Map<String, dynamic>> submitVerification({
    required String token,
    required String corUrl,
    required String schoolIdUrl,
    required String selfieWithIdUrl,
  }) async {
    final response = await ApiService.post(
      '/auth/student/verify',
      token: token,
      body: {
        'corUrl': corUrl,
        'schoolIdUrl': schoolIdUrl,
        'selfieWithIdUrl': selfieWithIdUrl,
      },
    );

    return response;
  }

  /// Update student profile information
  static Future<Map<String, dynamic>> updateProfile({
    required String token,
    String? firstName,
    String? middleName,
    String? lastName,
    String? profilePicture,
    String? mobileNumber,
    String? school,
    String? course,
    String? yearLevel,
  }) async {
    final body = <String, dynamic>{};

    if (firstName != null) body['firstName'] = firstName;
    if (middleName != null) body['middleName'] = middleName;
    if (lastName != null) body['lastName'] = lastName;
    if (profilePicture != null) body['profilePicture'] = profilePicture;
    if (mobileNumber != null) body['mobileNumber'] = mobileNumber;
    if (school != null) body['school'] = school;
    if (course != null) body['course'] = course;
    if (yearLevel != null) body['yearLevel'] = yearLevel;

    final response = await ApiService.put(
      '/auth/student/profile',
      token: token,
      body: body,
    );

    return response;
  }

  /// Get student profile
  static Future<Map<String, dynamic>> getProfile({
    required String token,
  }) async {
    final response = await ApiService.get(
      '/auth/me',
      token: token,
    );

    return response;
  }
}
