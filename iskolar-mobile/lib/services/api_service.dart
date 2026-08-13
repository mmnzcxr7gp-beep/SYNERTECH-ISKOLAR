import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../utils/app_constants.dart';

/// Custom exception for API errors.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Central HTTP client for the ISKOLAR mobile app.
///
/// Provides static helper methods for GET, POST, PUT, and multipart uploads.
/// All methods automatically prepend the backend base URL from [AppConstants].
class ApiService {
  static const Duration _defaultTimeout = Duration(seconds: 30);

  // ─── Headers ──────────────────────────────────────────────────────────────

  static Map<String, String> _headers({String? token}) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Downloads protected document bytes using Authorization: Bearer <token>.
  /// Access tokens are never appended to URLs or query parameters.
  static Future<Uint8List> downloadDocumentBytes(
    String documentId, {
    required String token,
    Duration? timeout,
  }) async {
    final uri = _uri('/documents/$documentId/download');
    try {
      final response = await http.get(
        uri,
        headers: _headers(token: token),
      ).timeout(timeout ?? _defaultTimeout);

      if (response.statusCode == 200) {
        return response.bodyBytes;
      } else if (response.statusCode == 401) {
        throw ApiException('Authentication required', statusCode: 401);
      } else if (response.statusCode == 403) {
        throw ApiException('Forbidden document access', statusCode: 403);
      } else if (response.statusCode == 404) {
        throw ApiException('Document not found', statusCode: 404);
      } else {
        throw ApiException('Failed to download document: ${response.statusCode}', statusCode: response.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error during document download: $e');
    }
  }

  // ─── URL builder ──────────────────────────────────────────────────────────

  static Uri _uri(String path) {
    final base = AppConstants.backendBaseUrl;
    // If the path already starts with http, use as-is
    if (path.startsWith('http')) return Uri.parse(path);
    // Ensure no double-slash between base and path
    final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$cleanBase$cleanPath');
  }

  // ─── GET ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> get(
    String path, {
    String? token,
    Duration? timeout,
  }) async {
    try {
      debugPrint('[ApiService.get] ${_uri(path)}');
      final response = await http
          .get(_uri(path), headers: _headers(token: token))
          .timeout(timeout ?? _defaultTimeout);
      return decodeResponseBody(response.body, response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection');
    } on TimeoutException {
      throw ApiException('Request timed out');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: ${e.toString()}');
    }
  }

  // ─── POST ─────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
    Duration? timeout,
  }) async {
    try {
      debugPrint('[ApiService.post] ${_uri(path)}');
      final response = await http
          .post(
            _uri(path),
            headers: _headers(token: token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout ?? _defaultTimeout);
      return decodeResponseBody(response.body, response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection');
    } on TimeoutException {
      throw ApiException('Request timed out');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: ${e.toString()}');
    }
  }

  // ─── PUT ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    String? token,
    Duration? timeout,
  }) async {
    try {
      debugPrint('[ApiService.put] ${_uri(path)}');
      final response = await http
          .put(
            _uri(path),
            headers: _headers(token: token),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout ?? _defaultTimeout);
      return decodeResponseBody(response.body, response.statusCode);
    } on SocketException {
      throw ApiException('No internet connection');
    } on TimeoutException {
      throw ApiException('Request timed out');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Network error: ${e.toString()}');
    }
  }

  // ─── Multipart Upload ─────────────────────────────────────────────────────

  /// Upload files via multipart/form-data.
  ///
  /// [filePaths] is a map of field-name → value, where value can be:
  ///   - A `String` (file path on disk)
  ///   - A `List<dynamic>` of file paths or `{bytes, filename}` maps
  ///   - A `Map` with `bytes` (Uint8List) and `filename` keys (for web)
  static Future<Map<String, dynamic>> multipartUpload(
    String path, {
    Map<String, String> fields = const {},
    Map<String, dynamic> filePaths = const {},
    String? token,
    Duration? timeout,
  }) async {
    try {
      final uri = _uri(path);
      debugPrint('[ApiService.multipartUpload] $uri');

      final request = http.MultipartRequest('POST', uri);

      // Auth header
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      // Text fields
      request.fields.addAll(fields);

      // File fields
      for (final entry in filePaths.entries) {
        final fieldName = entry.key;
        final value = entry.value;

        if (value is String) {
          // Single file path
          request.files.add(
            await http.MultipartFile.fromPath(fieldName, value),
          );
        } else if (value is List) {
          // List of files
          for (final item in value) {
            if (item is String) {
              request.files.add(
                await http.MultipartFile.fromPath(fieldName, item),
              );
            } else if (item is Map) {
              // Web upload: {bytes: Uint8List, filename: String}
              final bytes = item['bytes'];
              final filename = item['filename'] as String? ?? 'file';
              if (bytes is List<int>) {
                request.files.add(
                  http.MultipartFile.fromBytes(
                    fieldName,
                    bytes,
                    filename: filename,
                  ),
                );
              }
            }
          }
        } else if (value is Map) {
          final bytes = value['bytes'];
          final filename = value['filename'] as String? ?? 'file';
          if (bytes is List<int>) {
            request.files.add(
              http.MultipartFile.fromBytes(
                fieldName,
                bytes,
                filename: filename,
              ),
            );
          }
        }
      }

      final streamedResponse = await request.send().timeout(
            timeout ?? const Duration(seconds: 60),
          );
      final responseBody = await streamedResponse.stream.bytesToString();

      return decodeResponseBody(responseBody, streamedResponse.statusCode);
    } on SocketException {
      throw ApiException('No internet connection');
    } on TimeoutException {
      throw ApiException('Upload timed out');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Upload error: ${e.toString()}');
    }
  }

  // ─── Response decoder ─────────────────────────────────────────────────────

  /// Decodes a JSON response body and throws [ApiException] on error status codes.
  static Map<String, dynamic> decodeResponseBody(
    String body,
    int statusCode,
  ) {
    Map<String, dynamic> decoded;
    try {
      final parsed = jsonDecode(body);
      if (parsed is Map<String, dynamic>) {
        decoded = parsed;
      } else {
        decoded = {'data': parsed};
      }
    } catch (_) {
      decoded = {'rawBody': body};
    }

    if (statusCode >= 200 && statusCode < 300) {
      return decoded;
    }

    // Extract the most useful error message from the response
    final message = decoded['message'] as String? ??
        decoded['error'] as String? ??
        'Request failed with status $statusCode';

    throw ApiException(message, statusCode: statusCode);
  }
}
