import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../utils/app_constants.dart';
import 'api_service.dart';

class VerificationService {
  // Submit Student Verification Documents
  static Future<Map<String, dynamic>> submitStudentVerification({
    required String token,
    required String lrn,
    required String schoolName,
    dynamic governmentId,
    dynamic selfieWithId,
    dynamic certificateOfRegistration,
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
        final mf = await ApiService.createMultipartFile('governmentId', governmentId);
        if (mf != null) request.files.add(mf);
      }

      if (selfieWithId != null) {
        final mf = await ApiService.createMultipartFile('selfieWithId', selfieWithId);
        if (mf != null) request.files.add(mf);
      }

      if (certificateOfRegistration != null) {
        final mf = await ApiService.createMultipartFile('certificateOfRegistration', certificateOfRegistration);
        if (mf != null) request.files.add(mf);
      }

      debugPrint('[VerificationService.submitStudentVerification] sending multipart...');

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
    dynamic businessRegistration,
    dynamic businessPermit,
    dynamic taxIdentificationNumber,
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
        final mf = await ApiService.createMultipartFile('businessRegistration', businessRegistration);
        if (mf != null) request.files.add(mf);
      }

      if (businessPermit != null) {
        final mf = await ApiService.createMultipartFile('businessPermit', businessPermit);
        if (mf != null) request.files.add(mf);
      }

      if (taxIdentificationNumber != null) {
        final mf = await ApiService.createMultipartFile('taxIdentificationNumber', taxIdentificationNumber);
        if (mf != null) request.files.add(mf);
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
