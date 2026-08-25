import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:mime/mime.dart';

import '../utils/app_constants.dart';
import 'api_service.dart';

class VerificationService {
  // Submit Student Verification Documents
  static Future<Map<String, dynamic>> submitStudentVerification({
    required String token,
    required String lrn,
    required String schoolName,
    File? governmentId,
    File? selfieWithId,
    File? certificateOfRegistration,
    String? gcashNumber,
    String? gcashAccountName,
    String? payMayaNumber,
    String? payMayaAccountName,
    Map<String, String>? bankDetails,
  }) async {
    final uri = Uri.parse(
      '${AppConstants.backendBaseUrl}/verification/student/submit',
    );

    try {
      final request = http.MultipartRequest('POST', uri);

      // Add headers
      request.headers['Authorization'] = 'Bearer $token';

      // Add text fields
      request.fields['lrn'] = lrn;
      request.fields['schoolName'] = schoolName;
      if (gcashNumber != null) request.fields['gcashNumber'] = gcashNumber;
      if (gcashAccountName != null) {
        request.fields['gcashAccountName'] = gcashAccountName;
      }
      if (payMayaNumber != null) {
        request.fields['payMayaNumber'] = payMayaNumber;
      }
      if (payMayaAccountName != null) {
        request.fields['payMayaAccountName'] = payMayaAccountName;
      }
      if (bankDetails != null) {
        request.fields['bankDetails'] = bankDetailsToJson(bankDetails);
      }

      // Add file fields
      if (governmentId != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'governmentId',
            governmentId.path,
            contentType: _mimeTypeForFile(governmentId.path),
          ),
        );
      }

      if (selfieWithId != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'selfieWithId',
            selfieWithId.path,
            contentType: _mimeTypeForFile(selfieWithId.path),
          ),
        );
      }

      if (certificateOfRegistration != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'certificateOfRegistration',
            certificateOfRegistration.path,
            contentType: _mimeTypeForFile(certificateOfRegistration.path),
          ),
        );
      }

      debugPrint('[VerificationService.submitStudentVerification] sending multipart...');

      // Build a log-friendly summary of what we are sending (avoid huge logs)
      debugPrint('[VerificationService.submitStudentVerification] lrn=$lrn schoolName=$schoolName');
      debugPrint('[VerificationService.submitStudentVerification] optional gcashNumber=${gcashNumber != null} gcashAccountName=${gcashAccountName != null} payMayaNumber=${payMayaNumber != null} payMayaAccountName=${payMayaAccountName != null}');
      debugPrint('[VerificationService.submitStudentVerification] bankDetailsPresent=${bankDetails != null}');

      String fileSummary(File? f) {
        if (f == null) return 'null';
        return 'path=${f.path} exists=${f.existsSync()} sizeBytes=${f.lengthSync()}';
      }

      debugPrint('[VerificationService.submitStudentVerification] governmentId=${fileSummary(governmentId)}');
      debugPrint('[VerificationService.submitStudentVerification] selfieWithId=${fileSummary(selfieWithId)}');
      debugPrint('[VerificationService.submitStudentVerification] certificateOfRegistration=${fileSummary(certificateOfRegistration)}');

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      debugPrint('[VerificationService.submitStudentVerification] statusCode=${response.statusCode}');
      debugPrint('[VerificationService.submitStudentVerification] rawBody=$responseBody');

      return ApiService.decodeResponseBody(responseBody, response.statusCode);
    } catch (e) {
      final msg = e is ApiException ? e.message : e.toString();
      throw ApiException('Failed to submit student verification: $msg');
    }
  }

  // Submit Provider Verification Documents
  static Future<Map<String, dynamic>> submitProviderVerification({
    required String token,
    required String organizationName,
    required String industry,
    required String registrationNumber,
    File? businessRegistration,
    File? businessPermit,
    File? taxIdentificationNumber,
    Map<String, String>? bankDetails,
  }) async {
    final uri = Uri.parse(
      '${AppConstants.backendBaseUrl}/verification/provider/submit',
    );

    try {
      final request = http.MultipartRequest('POST', uri);

      // Add headers
      request.headers['Authorization'] = 'Bearer $token';

      // Add text fields
      request.fields['organizationName'] = organizationName;
      request.fields['industry'] = industry;
      request.fields['registrationNumber'] = registrationNumber;
      if (bankDetails != null) {
        request.fields['bankDetails'] = bankDetailsToJson(bankDetails);
      }

      // Add file fields
      if (businessRegistration != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'businessRegistration',
            businessRegistration.path,
            contentType: _mimeTypeForFile(businessRegistration.path),
          ),
        );
      }

      if (businessPermit != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'businessPermit',
            businessPermit.path,
            contentType: _mimeTypeForFile(businessPermit.path),
          ),
        );
      }

      if (taxIdentificationNumber != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'taxIdentificationNumber',
            taxIdentificationNumber.path,
            contentType: _mimeTypeForFile(taxIdentificationNumber.path),
          ),
        );
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      return ApiService.decodeResponseBody(responseBody, response.statusCode);
    } catch (e) {
      throw ApiException('Failed to submit provider verification: $e');
    }
  }

  // Get Student Verification Status
  static Future<Map<String, dynamic>> getStudentVerificationStatus({
    required String token,
  }) async {
    return await ApiService.get('/verification/status', token: token);
  }

  // Get Provider Verification Status
  static Future<Map<String, dynamic>> getProviderVerificationStatus({
    required String token,
  }) async {
    return await ApiService.get('/verification/provider/status', token: token);
  }

  // Helper functions
  static String bankDetailsToJson(Map<String, String> details) {
    return '{"bankName":"${details['bankName'] ?? ''}","accountNumber":"${details['accountNumber'] ?? ''}","accountName":"${details['accountName'] ?? ''}"}';
  }

  static http.MediaType? _mimeTypeForFile(String path) {
    final mimeType = lookupMimeType(path);
    if (mimeType == null) return null;
    final parts = mimeType.split('/');
    return http.MediaType(parts[0], parts[1]);
  }
}

class VerificationStatus {
  final String status; // pending, approved, rejected
  final bool isVerified;
  final DateTime? submittedAt;
  final DateTime? approvedAt;
  final String? rejectionReason;

  VerificationStatus({
    required this.status,
    required this.isVerified,
    this.submittedAt,
    this.approvedAt,
    this.rejectionReason,
  });

  factory VerificationStatus.fromJson(Map<String, dynamic> json) {
    return VerificationStatus(
      status: json['status'] ?? json['verificationStatus'] ?? 'pending',
      isVerified: json['isVerified'] ?? false,
      submittedAt: json['submittedAt'] != null
          ? DateTime.tryParse(json['submittedAt'].toString())
          : null,
      approvedAt: json['approvedAt'] != null
          ? DateTime.tryParse(json['approvedAt'].toString())
          : null,
      rejectionReason: json['rejectionReason'],
    );
  }
}
