import '../services/api_service.dart';

class OcrResult {
  final String rawText;
  final Map<String, dynamic> extractedFields;
  final String documentType;
  final int confidence;
  final String filePath;
  final String message;
  final Map<String, dynamic>? documentBasis;

  OcrResult({
    required this.rawText,
    required this.extractedFields,
    required this.documentType,
    required this.confidence,
    required this.filePath,
    required this.message,
    this.documentBasis,
  });

  factory OcrResult.fromJson(Map<String, dynamic> json) {
    return OcrResult(
      rawText: json['rawText'] as String? ?? '',
      extractedFields: json['extractedFields'] as Map<String, dynamic>? ?? {},
      documentType: json['documentType'] as String? ?? 'unknown',
      confidence: json['confidence'] as int? ?? 0,
      filePath: json['filePath'] as String? ?? '',
      message: json['message'] as String? ?? '',
      documentBasis: json['documentBasis'] as Map<String, dynamic>?,
    );
  }

  /// Whether the document was identified as a correct/genuine paper
  bool get isCorrectPaper => documentBasis?['isCorrectPaper'] == true;

  /// Authenticity score 0-100
  int get authenticityScore => (documentBasis?['authenticityScore'] as num?)?.toInt() ?? 0;

  /// Verdict: GENUINE_DOCUMENT, LIKELY_GENUINE, UNCERTAIN, NOT_A_VALID_DOCUMENT
  String get verdict => documentBasis?['verdict'] as String? ?? 'UNKNOWN';

  /// Structural markers that were found
  List<dynamic> get markersFound =>
      (documentBasis?['structuralMarkers']?['found'] as List?) ?? [];

  /// Structural markers that are missing
  List<dynamic> get markersMissing =>
      (documentBasis?['structuralMarkers']?['missing'] as List?) ?? [];

  /// Extraction evidence per field
  Map<String, dynamic> get extractionEvidence =>
      (documentBasis?['extractionEvidence'] as Map<String, dynamic>?) ?? {};

  /// Warnings from authenticity assessment
  List<String> get basisWarnings =>
      ((documentBasis?['warnings'] as List?) ?? [])
          .map((w) => w.toString())
          .toList();

  /// Whether the OCR actually scanned the paper (vs. returning empty)
  bool get ocrActuallyScanned =>
      documentBasis?['ocrActuallyScanned'] == true;
}

class OcrService {
  /// Upload a document image to backend OCR endpoint for identity extraction
  static Future<OcrResult> extractFromDocument({
    required String token,
    String? filePath,
    dynamic file,
  }) async {
    final response = await ApiService.multipartUpload(
      '/ocr/extract',
      filePaths: {'document': file ?? filePath},
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
