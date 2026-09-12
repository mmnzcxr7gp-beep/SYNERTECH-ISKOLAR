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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
              const SizedBox(height: 24),

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

              // Inputs Card
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
                    TextFormField(
                      controller: _nameController,
                      style: GoogleFonts.poppins(
                        color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Full Name',
                        labelStyle: GoogleFonts.poppins(
                          color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                          fontSize: 13,
                        ),
                        prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.actionBlue, size: 20),
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
                    const SizedBox(height: 14),

                    TextFormField(
                      controller: _idNumberController,
                      style: GoogleFonts.poppins(
                        color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Document/ID Number',
                        labelStyle: GoogleFonts.poppins(
                          color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                          fontSize: 13,
                        ),
                        prefixIcon: const Icon(Icons.badge_outlined, color: AppColors.actionBlue, size: 20),
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
                    const SizedBox(height: 14),

                    TextFormField(
                      controller: _expiryController,
                      style: GoogleFonts.poppins(
                        color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Expiration Date (if applicable)',
                        labelStyle: GoogleFonts.poppins(
                          color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                          fontSize: 13,
                        ),
                        prefixIcon: const Icon(Icons.event_outlined, color: AppColors.actionBlue, size: 20),
                        hintText: 'YYYY-MM-DD',
                        hintStyle: GoogleFonts.poppins(
                          color: isDark ? AppColors.darkTextSecondary.withValues(alpha: 0.5) : AppColors.secondaryText.withValues(alpha: 0.5),
                          fontSize: 13,
                        ),
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

              PrimaryButton(
                label: 'Confirm & Save Info',
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
}
