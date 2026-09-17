import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/ocr_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';
import '../widgets/primary_button.dart';

class OcrReviewScreen extends StatefulWidget {
  const OcrReviewScreen({
    super.key,
    required this.token,
    required this.imagePath,
    required this.ocrResult,
    this.imageBytes,
  });

  final String token;
  final String imagePath;
  final OcrResult ocrResult;
  final Uint8List? imageBytes;

  @override
  State<OcrReviewScreen> createState() => _OcrReviewScreenState();
}

class _OcrReviewScreenState extends State<OcrReviewScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _idNumberController;
  late final TextEditingController _expiryController;

  bool _isChecking = false;
  Map<String, dynamic>? _checkResult;
  String? _error;

  @override
  void initState() {
    super.initState();
    final fields = widget.ocrResult.extractedFields;
    _nameController = TextEditingController(text: fields['fullName'] as String? ?? '');
    _idNumberController = TextEditingController(text: fields['idNumber'] as String? ?? '');
    _expiryController = TextEditingController(text: fields['expirationDate'] as String? ?? '');

    // Run verification check on load
    _verifyFields();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _idNumberController.dispose();
    _expiryController.dispose();
    super.dispose();
  }

  Future<void> _verifyFields() async {
    setState(() {
      _isChecking = true;
      _error = null;
    });

    try {
      final res = await OcrService.verifyDocumentData(
        token: widget.token,
        extractedFields: {
          'fullName': _nameController.text.trim(),
          'idNumber': _idNumberController.text.trim(),
          'expirationDate': _expiryController.text.trim(),
        },
      );
      setState(() => _checkResult = res);
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      setState(() => _isChecking = false);
    }
  }

  Color _verdictColor(String verdict) {
    switch (verdict) {
      case 'GENUINE_DOCUMENT':
        return AppColors.success;
      case 'LIKELY_GENUINE':
        return const Color(0xFF0EA5E9);
      case 'UNCERTAIN':
        return AppColors.warning;
      case 'NOT_A_VALID_DOCUMENT':
        return AppColors.error;
      default:
        return AppColors.warning;
    }
  }

  String _verdictLabel(String verdict) {
    switch (verdict) {
      case 'GENUINE_DOCUMENT':
        return '✓ Genuine Document';
      case 'LIKELY_GENUINE':
        return '◎ Likely Genuine';
      case 'UNCERTAIN':
        return '⚠ Uncertain';
      case 'NOT_A_VALID_DOCUMENT':
        return '✕ Not a Valid Document';
      default:
        return '? Unknown';
    }
  }

  IconData _verdictIcon(String verdict) {
    switch (verdict) {
      case 'GENUINE_DOCUMENT':
        return Icons.verified_rounded;
      case 'LIKELY_GENUINE':
        return Icons.check_circle_outline_rounded;
      case 'UNCERTAIN':
        return Icons.help_outline_rounded;
      case 'NOT_A_VALID_DOCUMENT':
        return Icons.dangerous_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final basis = widget.ocrResult.documentBasis;
    final verdict = widget.ocrResult.verdict;
    final score = widget.ocrResult.authenticityScore;
    final verdictCol = _verdictColor(verdict);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.mainBackground,
      appBar: AppBar(
        title: Text(
          'OCR Results Review',
          style: GoogleFonts.poppins(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(
          color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Image Preview Card
              Container(
                height: 180,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.cardSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.border,
                    width: 1.0,
                  ),
                  boxShadow: isDark
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.25),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ]
                      : AppColors.cardShadow,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                  child: widget.imageBytes != null
                      ? Image.memory(
                          widget.imageBytes!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                        )
                      : (!kIsWeb && widget.imagePath.isNotEmpty)
                          ? Image.file(
                              File(widget.imagePath),
                              fit: BoxFit.cover,
                              width: double.infinity,
                            )
                          : Container(
                              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
                              child: const Center(
                                child: Icon(Icons.document_scanner_rounded, color: AppColors.actionBlue, size: 48),
                              ),
                            ),
                ),
              ),
              const SizedBox(height: 20),

              // ═══════════════════════════════════════════════════════
              // DOCUMENT CORRECTNESS BASIS CARD
              // ═══════════════════════════════════════════════════════
              if (basis != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: verdictCol.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                    border: Border.all(
                      color: verdictCol.withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Verdict header
                      Row(
                        children: [
                          Icon(_verdictIcon(verdict), color: verdictCol, size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Document Correctness Basis',
                              style: GoogleFonts.poppins(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: verdictCol.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: verdictCol.withValues(alpha: 0.4)),
                            ),
                            child: Text(
                              _verdictLabel(verdict),
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: verdictCol,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Authenticity score bar
                      Row(
                        children: [
                          Text(
                            'Authenticity Score',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '$score%',
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: verdictCol,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: score / 100,
                          minHeight: 8,
                          backgroundColor: verdictCol.withValues(alpha: 0.12),
                          valueColor: AlwaysStoppedAnimation<Color>(verdictCol),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Structural markers checklist
                      Text(
                        'Structural Markers',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ...widget.ocrResult.markersFound.map((m) {
                        final label = (m is Map) ? (m['label'] ?? 'Marker') : m.toString();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 3),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 15),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  label,
                                  style: GoogleFonts.poppins(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.success,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      ...widget.ocrResult.markersMissing.map((m) {
                        final label = (m is Map) ? (m['label'] ?? 'Marker') : m.toString();
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 3),
                          child: Row(
                            children: [
                              Icon(Icons.cancel_rounded, color: AppColors.error.withValues(alpha: 0.6), size: 15),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  label,
                                  style: GoogleFonts.poppins(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w500,
                                    color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),

                      // Basis warnings
                      if (widget.ocrResult.basisWarnings.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        ...widget.ocrResult.basisWarnings.map((w) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 14),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  w,
                                  style: GoogleFonts.poppins(fontSize: 11, color: AppColors.warning, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                        )),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              Text(
                'Verify Extracted Information',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'We ran AI OCR to extract information. Please correct any mistakes below.',
                style: GoogleFonts.poppins(
                  color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                  fontSize: 13,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),

              // Inputs Card with Source Evidence
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : AppColors.cardSurface,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.border,
                    width: 1.0,
                  ),
                  boxShadow: isDark
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.25),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ]
                      : AppColors.cardShadow,
                ),
                child: Column(
                  children: [
                    _buildFieldWithEvidence(
                      controller: _nameController,
                      label: 'Full Name',
                      icon: Icons.person_outline_rounded,
                      fieldName: 'fullName',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 14),
                    _buildFieldWithEvidence(
                      controller: _idNumberController,
                      label: 'Document/ID Number',
                      icon: Icons.badge_outlined,
                      fieldName: 'idNumber',
                      isDark: isDark,
                    ),
                    const SizedBox(height: 14),
                    _buildFieldWithEvidence(
                      controller: _expiryController,
                      label: 'Expiration Date (if applicable)',
                      icon: Icons.event_outlined,
                      fieldName: 'expirationDate',
                      isDark: isDark,
                      hintText: 'YYYY-MM-DD',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Verification Results
              if (_isChecking)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(color: AppColors.actionBlue, strokeWidth: 2.5),
                  ),
                )
              else if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Error running data matching check: $_error',
                          style: GoogleFonts.poppins(color: AppColors.error, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                )
              else if (_checkResult != null) ...[
                Text(
                  'AI Data Matching Check',
                  style: GoogleFonts.poppins(
                    color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 10),
                // Warnings
                ...((_checkResult!['warnings'] as List? ?? []).map((w) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            w['message'] as String? ?? 'Data discrepancy found',
                            style: GoogleFonts.poppins(color: AppColors.warning, fontSize: 12.5, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  );
                })),
                // Mismatches
                ...((_checkResult!['mismatches'] as List? ?? []).map((m) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                      border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Mismatch on ${m['field']}: profile has "${m['profile']}" but document has "${m['document']}"',
                            style: GoogleFonts.poppins(color: AppColors.error, fontSize: 12.5, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  );
                })),
                // Recommendation
                if ((_checkResult!['mismatches'] as List? ?? []).isEmpty &&
                    (_checkResult!['warnings'] as List? ?? []).isEmpty)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, color: AppColors.success, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Extracted fields match your profile data perfectly.',
                            style: GoogleFonts.poppins(color: AppColors.success, fontSize: 12.5, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
              const SizedBox(height: 28),

              // Not a valid document warning
              if (verdict == 'NOT_A_VALID_DOCUMENT')
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.dangerous_rounded, color: AppColors.error, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'This image does not appear to be a valid document. Please upload a clear photo of the correct paper.',
                          style: GoogleFonts.poppins(color: AppColors.error, fontSize: 12.5, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              PrimaryButton(
                label: verdict == 'NOT_A_VALID_DOCUMENT'
                    ? 'Proceed Anyway (Not Recommended)'
                    : 'Confirm & Save Info',
                onPressed: () {
                  Navigator.of(context).pop({
                    'fullName': _nameController.text.trim(),
                    'idNumber': _idNumberController.text.trim(),
                    'expirationDate': _expiryController.text.trim(),
                  });
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds a text field with source evidence indicator below it
  Widget _buildFieldWithEvidence({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required String fieldName,
    required bool isDark,
    String? hintText,
  }) {
    final evidence = widget.ocrResult.extractionEvidence[fieldName];
    final hasSource = evidence is Map && evidence['source'] != null && evidence['valid'] == true;
    final wasRejected = evidence is Map && evidence['rejected'] == true;
    final notFound = evidence is Map && evidence['valid'] == false && !wasRejected;
    final confidence = evidence is Map ? (evidence['confidence'] as String? ?? '') : '';

    Color confidenceColor;
    switch (confidence) {
      case 'HIGH':
        confidenceColor = AppColors.success;
        break;
      case 'MEDIUM':
        confidenceColor = AppColors.warning;
        break;
      default:
        confidenceColor = AppColors.error;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: controller,
          style: GoogleFonts.poppins(
            color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          decoration: InputDecoration(
            labelText: label,
            labelStyle: GoogleFonts.poppins(
              color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
              fontSize: 13,
            ),
            prefixIcon: Icon(icon, color: AppColors.actionBlue, size: 20),
            hintText: hintText,
            hintStyle: hintText != null
                ? GoogleFonts.poppins(
                    color: isDark
                        ? AppColors.darkTextSecondary.withValues(alpha: 0.5)
                        : AppColors.secondaryText.withValues(alpha: 0.5),
                    fontSize: 13,
                  )
                : null,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
              borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
              borderSide: BorderSide(color: isDark ? AppColors.darkBorder : AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
              borderSide: const BorderSide(color: AppColors.actionBlue, width: 1.5),
            ),
          ),
          onChanged: (_) => _verifyFields(),
        ),

        // Source evidence or status indicator
        if (hasSource) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.format_quote_rounded, size: 13, color: confidenceColor),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Source: "${evidence['source']}"',
                  style: GoogleFonts.poppins(
                    fontSize: 10.5,
                    fontStyle: FontStyle.italic,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: confidenceColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  confidence,
                  style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.w700, color: confidenceColor),
                ),
              ),
            ],
          ),
        ] else if (wasRejected) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.block_rounded, size: 13, color: AppColors.error),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Rejected: ${evidence['rejectionReason'] ?? 'OCR noise'}',
                  style: GoogleFonts.poppins(fontSize: 10.5, color: AppColors.error, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ] else if (notFound && controller.text.isEmpty) ...[
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.search_off_rounded, size: 13, color: AppColors.warning.withValues(alpha: 0.8)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  'Not found on document — enter manually if applicable',
                  style: GoogleFonts.poppins(fontSize: 10.5, color: AppColors.warning, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
