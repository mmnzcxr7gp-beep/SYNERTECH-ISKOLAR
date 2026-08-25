import '../services/api_service.dart';

class OcrResult {
  final String rawText;
  final Map<String, dynamic> extractedFields;
  final String documentType;
  final int confidence;
  final String filePath;
  final String message;

  OcrResult({
    required this.rawText,
    required this.extractedFields,
    required this.documentType,
    required this.confidence,
    required this.filePath,
    required this.message,
  });

  factory OcrResult.fromJson(Map<String, dynamic> json) {
    return OcrResult(
      rawText: json['rawText'] as String? ?? '',
      extractedFields: json['extractedFields'] as Map<String, dynamic>? ?? {},
      documentType: json['documentType'] as String? ?? 'unknown',
      confidence: json['confidence'] as int? ?? 0,
      filePath: json['filePath'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

class OcrService {
  /// Upload a document image to backend OCR endpoint for identity extraction
  static Future<OcrResult> extractFromDocument({
    required String token,
    required String filePath,
  }) async {
    final response = await ApiService.multipartUpload(
      '/ocr/extract',
      filePaths: {'document': filePath},
      token: token,
    );

    return OcrResult.fromJson(response);
  }

  /// Verify extracted document fields against current user profile data
  static Future<Map<String, dynamic>> verifyDocumentData({
    required String token,
    required Map<String, dynamic> extractedFields,
  }) async {
    final response = await ApiService.post(
      '/ocr/verify',
      body: {
        'extractedFields': extractedFields,
      },
      token: token,
    );

    return response;
  }
}
