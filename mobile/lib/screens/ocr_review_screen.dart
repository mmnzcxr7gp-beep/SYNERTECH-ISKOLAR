import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../services/ocr_service.dart';
import '../utils/app_colors.dart';
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
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('OCR Results Review'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Image Preview
              Container(
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white24),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
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
                              color: AppColors.surface,
                              child: const Center(
                                child: Icon(Icons.document_scanner, color: AppColors.primary, size: 48),
                              ),
                            ),
                ),
              ),
              const SizedBox(height: 24),

              Text(
                'Verify Extracted Information',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 6),
              const Text(
                'We ran AI OCR to extract information. Please correct any mistakes below.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),

              // Inputs
              TextFormField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                onChanged: (_) => _verifyFields(),
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _idNumberController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Document/ID Number',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
                onChanged: (_) => _verifyFields(),
              ),
              const SizedBox(height: 14),

              TextFormField(
                controller: _expiryController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Expiration Date (if applicable)',
                  prefixIcon: Icon(Icons.event_outlined),
                  hintText: 'YYYY-MM-DD',
                ),
                onChanged: (_) => _verifyFields(),
              ),
              const SizedBox(height: 24),

              // Verification Results
              if (_isChecking)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_error != null)
                Text(
                  'Error running data matching check: $_error',
                  style: const TextStyle(color: Colors.red, fontSize: 12),
                )
              else if (_checkResult != null) ...[
                const Text(
                  'AI Data Matching Check',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 10),
                // Warnings
                ...((_checkResult!['warnings'] as List? ?? []).map((w) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.yellow.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.yellow.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.yellow),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            w['message'] as String? ?? 'Data discrepancy found',
                            style: const TextStyle(color: Colors.yellow, fontSize: 12),
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
                      color: Colors.red.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Colors.red),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Mismatch on ${m['field']}: profile has "${m['profile']}" but document has "${m['document']}"',
                            style: const TextStyle(color: Colors.red, fontSize: 12),
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
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.check_circle_outline_rounded, color: Colors.green),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Extracted fields match your profile data perfectly.',
                            style: TextStyle(color: Colors.green, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
              const SizedBox(height: 32),

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
