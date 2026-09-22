import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:mime/mime.dart';

import '../utils/app_constants.dart';

/// Custom exception for API errors.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode, this.details});

  final String message;
  final int? statusCode;
  final dynamic details;

  @override
  String toString() => message;
}

/// Central HTTP client for the ISKOLAR mobile app.
///
/// Provides static helper methods for GET, POST, PUT, and multipart uploads.
/// All methods automatically prepend the backend base URL from [AppConstants].
class ApiService {
  static const Duration _defaultTimeout = Duration(seconds: 15);

  // ─── Candidate Base URLs ──────────────────────────────────────────────────

  static List<String> get _candidateUrls {
    final urls = <String>[AppConstants.backendBaseUrl];
    for (final fb in AppConstants.fallbackBackendUrls) {
      if (!urls.contains(fb)) {
        urls.add(fb);
      }
    }
    return urls;
  }

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

  // ─── URL builder ──────────────────────────────────────────────────────────

  static Uri _uriForBase(String base, String path) {
    if (path.startsWith('http')) return Uri.parse(path);
    final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$cleanBase$cleanPath');
  }

  // ─── Failover Executor ───────────────────────────────────────────────────

  static Future<T> _executeWithFailover<T>(
    String path,
    Future<T> Function(Uri uri, Duration timeout) executeRequest, {
    Duration? timeout,
  }) async {
    final candidates = _candidateUrls;
    ApiException? lastApiException;
    Object? lastError;
    final effectiveTimeout = timeout ?? _defaultTimeout;

    for (int i = 0; i < candidates.length; i++) {
      final base = candidates[i];
      final uri = _uriForBase(base, path);
      try {
        debugPrint('[ApiService] Attempting $uri (attempt ${i + 1}/${candidates.length})');
        final result = await executeRequest(uri, effectiveTimeout);

        // If this fallback succeeded and differs from current base, promote it
        if (base != AppConstants.backendBaseUrl) {
          debugPrint('[ApiService] Promoted working fallback to primary base URL: $base');
          AppConstants.backendBaseUrl = base;
        }

        return result;
      } on SocketException catch (e) {
        debugPrint('[ApiService] Network error on $uri: $e');
        lastError = e;
      } on TimeoutException catch (e) {
        debugPrint('[ApiService] Request timed out on $uri: $e');
        lastError = e;
      } on ApiException catch (e) {
        // Only retry on server/gateway errors (502, 503, 504) or connection dropped
        if (e.statusCode != null && (e.statusCode == 502 || e.statusCode == 503 || e.statusCode == 504)) {
          debugPrint('[ApiService] Server error (${e.statusCode}) on $uri: ${e.message}');
          lastApiException = e;
        } else {
          // Client error like 400, 401, 403, 409 - do NOT failover, rethrow immediately
          rethrow;
        }
      } catch (e) {
        debugPrint('[ApiService] Unexpected error on $uri: $e');
        lastError = e;
      }
    }

    if (lastApiException != null) {
      throw lastApiException;
    }
    if (lastError is TimeoutException) {
      throw ApiException('Request timed out. Please check your internet connection.');
    }
    if (lastError is SocketException) {
      throw ApiException('Unable to connect to server. Please check your network connection.');
    }
    throw ApiException('Network error: ${lastError?.toString() ?? "Failed to connect"}');
  }

  /// Downloads protected document bytes using Authorization: Bearer <token>.
  /// Access tokens are never appended to URLs or query parameters.
  static Future<Uint8List> downloadDocumentBytes(
    String documentId, {
    required String token,
    Duration? timeout,
  }) async {
    return _executeWithFailover(
      '/documents/$documentId/download',
      (uri, t) async {
        final response = await http
            .get(uri, headers: _headers(token: token))
            .timeout(t);
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
      },
      timeout: timeout,
    );
  }

  // ─── GET ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> get(
    String path, {
    String? token,
    Duration? timeout,
  }) async {
    return _executeWithFailover(
      path,
      (uri, t) async {
        final response = await http
            .get(uri, headers: _headers(token: token))
            .timeout(t);
        return decodeResponseBody(response.body, response.statusCode);
      },
      timeout: timeout,
    );
  }

  // ─── POST ─────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    String? token,
    Duration? timeout,
  }) async {
    return _executeWithFailover(
      path,
      (uri, t) async {
        final response = await http
            .post(
              uri,
              headers: _headers(token: token),
              body: body != null ? jsonEncode(body) : null,
            )
            .timeout(t);
        return decodeResponseBody(response.body, response.statusCode);
      },
      timeout: timeout,
    );
  }

  // ─── PUT ──────────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
    String? token,
    Duration? timeout,
  }) async {
    return _executeWithFailover(
      path,
      (uri, t) async {
        final response = await http
            .put(
              uri,
              headers: _headers(token: token),
              body: body != null ? jsonEncode(body) : null,
            )
            .timeout(t);
        return decodeResponseBody(response.body, response.statusCode);
      },
      timeout: timeout,
    );
  }

  // ─── Multipart Upload ─────────────────────────────────────────────────────

  /// Upload files via multipart/form-data.
  ///
  /// Safely create a MultipartFile across Flutter Web, Android, iOS, Desktop
  static Future<http.MultipartFile?> createMultipartFile(
    String fieldName,
    dynamic value, {
    String? defaultFilename,
  }) async {
    if (value == null) return null;

    Uint8List? bytes;
    String filename = defaultFilename ?? '$fieldName.jpg';

    if (value is Uint8List) {
      bytes = value;
    } else if (value is List<int>) {
      bytes = Uint8List.fromList(value);
    } else if (value is Map && value['bytes'] != null) {
      final raw = value['bytes'];
      bytes = raw is Uint8List ? raw : Uint8List.fromList(List<int>.from(raw));
      filename = value['filename'] as String? ?? filename;
    } else {
      // Dynamic check for XFile or File without hard crash on web
      try {
        final dynamic dyn = value;
        final dynamic b = await dyn.readAsBytes();
        if (b != null) {
          bytes = b is Uint8List ? b : Uint8List.fromList(List<int>.from(b));
        }
        filename = (dyn.name as String?) ??
            (dyn.path as String?)?.split(RegExp(r'[/\\]')).last ??
            filename;
      } catch (_) {
        if (!kIsWeb && value is String) {
          try {
            final f = File(value);
            if (await f.exists()) {
              bytes = await f.readAsBytes();
              filename = value.split(Platform.pathSeparator).last;
            }
          } catch (_) {}
        }
      }
    }

    if (bytes == null || bytes.isEmpty) return null;

    http.MediaType? mediaType;
    try {
      final mimeType = lookupMimeType(filename) ?? 'application/octet-stream';
      final parts = mimeType.split('/');
      if (parts.length == 2) {
        mediaType = http.MediaType(parts[0], parts[1]);
      }
    } catch (_) {}

    return http.MultipartFile.fromBytes(
      fieldName,
      bytes,
      filename: filename,
      contentType: mediaType,
    );
  }

  /// [filePaths] is a map of field-name → value, where value can be:
  ///   - A `String` (file path on disk or asset)
  ///   - An `XFile` / `File` / `Uint8List`
  ///   - A `List<dynamic>` of file objects/paths or `{bytes, filename}` maps
  ///   - A `Map` with `bytes` (Uint8List) and `filename` keys (for web)
  static Future<Map<String, dynamic>> multipartUpload(
    String path, {
    String method = 'POST',
    Map<String, String> fields = const {},
    Map<String, dynamic> filePaths = const {},
    String? token,
    Duration? timeout,
  }) async {
    return _executeWithFailover(
      path,
      (uri, t) async {
        debugPrint('[ApiService.multipartUpload] $method $uri');
        final request = http.MultipartRequest(method, uri);

        if (token != null && token.isNotEmpty) {
          request.headers['Authorization'] = 'Bearer $token';
        }

        request.fields.addAll(fields);

        for (final entry in filePaths.entries) {
          final fieldName = entry.key;
          final value = entry.value;

          if (value is List) {
            for (final item in value) {
              final mf = await createMultipartFile(fieldName, item);
              if (mf != null) {
                request.files.add(mf);
              }
            }
          } else {
            final mf = await createMultipartFile(fieldName, value);
            if (mf != null) {
              request.files.add(mf);
            }
          }
        }

        final streamedResponse = await request.send().timeout(t);
        final responseBody = await streamedResponse.stream.bytesToString();

        return decodeResponseBody(responseBody, streamedResponse.statusCode);
      },
      timeout: timeout ?? const Duration(seconds: 60),
    );
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
      String? htmlError;
      final preMatch = RegExp(r'<pre>(.*?)</pre>', caseSensitive: false, dotAll: true).firstMatch(body);
      if (preMatch != null) {
        htmlError = preMatch.group(1)?.trim();
      }
      decoded = {'rawBody': body, if (htmlError != null) 'message': htmlError};
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
