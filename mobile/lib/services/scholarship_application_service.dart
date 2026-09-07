import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/app_constants.dart';
import 'api_service.dart';

class ScholarshipApplicationService {
  /// Submit scholarship application with documents
  /// Files should be a map of requirementId -> File path
  static Future<Map<String, dynamic>> submitApplication(
    String scholarshipId,
    Map<String, String> files,
    String token,
  ) async {
    try {
      final base = AppConstants.backendBaseUrl.replaceAll(RegExp(r'/api/?$'), '');
      final uri = Uri.parse('$base/api/scholarship-applications/$scholarshipId/submit');

      final request = http.MultipartRequest('POST', uri)
        ..headers['Authorization'] = 'Bearer $token';

      // Add files to request
      for (final entry in files.entries) {
        final mf = await ApiService.createMultipartFile(
          entry.key,
          entry.value,
        );
        if (mf != null) {
          request.files.add(mf);
        }
      }

      final response = await request.send().timeout(
        const Duration(seconds: 60),
        onTimeout: () => throw ApiException(
          'Request timed out while uploading documents',
        ),
      );

      final responseBody = await response.stream.bytesToString();
      Map<String, dynamic>? data;
      try {
        data = jsonDecode(responseBody) as Map<String, dynamic>?;
      } catch (_) {}

      if (response.statusCode == 201 || response.statusCode == 200) {
        return data ?? {'success': true};
      }

      final errorMsg = data?['message'] ?? data?['error'] ?? 'Failed to submit application: ${response.statusCode}';
      throw ApiException(
        errorMsg.toString(),
        statusCode: response.statusCode,
        details: data,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Error submitting application: ${e.toString()}');
    }
  }

  /// Get student's application for a scholarship
  static Future<Map<String, dynamic>> getStudentApplication(
    String scholarshipId,
    String token,
  ) async {
    try {
      final response = await ApiService.get(
        '/scholarship-applications/$scholarshipId/my-application',
        token: token,
      );

      return response['application'] as Map<String, dynamic>? ?? {};
    } on ApiException catch (_) {
      return {}; // No application found
    } catch (e) {
      throw ApiException('Error loading application: ${e.toString()}');
    }
  }

  /// Get all student applications
  static Future<List<dynamic>> getStudentApplications(
    String token, {
    String? status,
  }) async {
    try {
      final path = status != null
          ? '/scholarship-applications/student/list?status=$status'
          : '/scholarship-applications/student/list';

      final response = await ApiService.get(path, token: token);

      return response['applications'] as List<dynamic>? ?? [];
    } catch (e) {
      throw ApiException('Error loading applications: ${e.toString()}');
    }
  }

  /// Get application details
  static Future<Map<String, dynamic>> getApplicationDetails(
    String applicationId,
    String token,
  ) async {
    try {
      final response = await ApiService.get(
        '/scholarship-applications/$applicationId/details',
        token: token,
      );

      return response;
    } catch (e) {
      throw ApiException('Error loading application details: ${e.toString()}');
    }
  }

  /// Resubmit documents for an application that needs resubmission
  static Future<Map<String, dynamic>> resubmitDocuments(
    String scholarshipId,
    Map<String, String> files,
    String token,
  ) async {
    try {
      // For resubmission, we submit to the same endpoint but it will detect the existing application
      return await submitApplication(scholarshipId, files, token);
    } catch (e) {
      throw ApiException('Error resubmitting documents: ${e.toString()}');
    }
  }
}
