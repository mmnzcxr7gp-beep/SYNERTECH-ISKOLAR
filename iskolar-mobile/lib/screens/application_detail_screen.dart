import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/application_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/app_colors.dart';

class ApplicationDetailScreen extends StatefulWidget {
  const ApplicationDetailScreen({
    super.key,
    required this.application,
    this.token,
    this.onReauthenticate,
  });

  final ApplicationEntry application;
  final String? token;
  final VoidCallback? onReauthenticate;

  @override
  State<ApplicationDetailScreen> createState() => _ApplicationDetailScreenState();
}

class _ApplicationDetailScreenState extends State<ApplicationDetailScreen> {
  String? _downloadingDocId;

  Future<void> _viewDocument(DocumentEntry doc) async {
    if (_downloadingDocId != null) return;

    if (doc.id.isEmpty) {
      _showSnackBar('Document identifier missing.');
      return;
    }

    setState(() {
      _downloadingDocId = doc.id;
    });

    File? tempPdfFile;

    try {
      final token = widget.token ?? await AuthService.getToken();
      if (token == null || token.isEmpty) {
        _showSnackBar('Authentication required. Please log in again.');
        widget.onReauthenticate?.call();
        return;
      }

      final bytes = await ApiService.downloadDocumentBytes(
        doc.id,
        token: token,
      );

      if (bytes.isEmpty) {
        throw ApiException('Corrupt or empty file received.', statusCode: 422);
      }

      if (!mounted) return;

      if (doc.isImage) {
        _showImagePreviewDialog(doc, bytes);
      } else if (doc.isPdf) {
        if (!kIsWeb) {
          final tempDir = Directory.systemTemp;
          tempPdfFile = File('${tempDir.path}/temp_${doc.id}.pdf');
          await tempPdfFile.writeAsBytes(bytes);
        }
        if (!mounted) return;
        _showPdfPreviewDialog(doc, bytes, tempPdfFile);
      } else {
        _showUnsupportedFileDialog(doc);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.statusCode == 401) {
        _showSnackBar('Authentication required. Please log in again.');
        widget.onReauthenticate?.call();
      } else if (e.statusCode == 403) {
        _showSnackBar('Access denied. You do not have permission to view this document.');
      } else if (e.statusCode == 404) {
        _showSnackBar('Document not found.');
      } else {
        _showSnackBar(e.message);
      }
    } catch (e) {
      if (!mounted) return;
      _showSnackBar('Network or file processing error: $e');
    } finally {
      if (mounted) {
        setState(() {
          _downloadingDocId = null;
        });
      }
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _showImagePreviewDialog(DocumentEntry doc, Uint8List bytes) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(doc.requirementName.isNotEmpty ? doc.requirementName : doc.originalname),
        content: SingleChildScrollView(
          child: Image.memory(
            bytes,
            errorBuilder: (_, __, ___) => const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Corrupt or unsupported image format.'),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showPdfPreviewDialog(DocumentEntry doc, Uint8List bytes, File? tempFile) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(doc.requirementName.isNotEmpty ? doc.requirementName : doc.originalname),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.picture_as_pdf, size: 64, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text('PDF Document loaded (${bytes.lengthInBytes} bytes).'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              if (tempFile != null && await tempFile.exists()) {
                try {
                  await tempFile.delete();
                } catch (_) {}
              }
            },
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showUnsupportedFileDialog(DocumentEntry doc) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Unsupported File Format'),
        content: Text('Cannot preview file format for "${doc.originalname}".'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final application = widget.application;
    final documents = application.documents;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Application details'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                application.scholarshipTitle,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 10),
              Chip(
                label: Text(application.status.toUpperCase()),
                backgroundColor: application.status == 'approved'
                    ? const Color.fromRGBO(16, 185, 129, 0.12)
                    : application.status == 'rejected'
                        ? const Color.fromRGBO(239, 68, 68, 0.12)
                        : const Color.fromRGBO(245, 158, 11, 0.12),
              ),
              const SizedBox(height: 18),
              _buildInfoRow(context, 'Score', application.score.toStringAsFixed(2)),
              const SizedBox(height: 8),
              _buildInfoRow(context, 'Submitted', application.appliedAt),
              const SizedBox(height: 8),
              _buildInfoRow(context, 'Student', application.studentName.isNotEmpty ? application.studentName : application.studentEmail),
              const SizedBox(height: 24),
              Text(
                'Supporting details',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 14),
              _buildDetailCard(context, 'GPA', application.gpa),
              const SizedBox(height: 10),
              _buildDetailCard(context, 'Family income', application.familyIncome),
              const SizedBox(height: 10),
              _buildDetailCard(context, 'Achievements', application.achievements),
              const SizedBox(height: 24),

              // ─── ATTACHED DOCUMENTS SECTION ─────────────────────────
              Text(
                'Attached Documents',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 14),

              if (documents.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text(
                    'No attached documents found for this application.',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: documents.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final doc = documents[index];
                    final isDownloading = _downloadingDocId == doc.id;

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Icon(
                            doc.isImage
                                ? Icons.image
                                : doc.isPdf
                                    ? Icons.picture_as_pdf
                                    : Icons.insert_drive_file,
                            color: AppColors.primary,
                            size: 32,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  doc.requirementName.isNotEmpty ? doc.requirementName : 'Document #${doc.id}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Status: ${doc.status}',
                                  style: const TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: isDownloading ? null : () => _viewDocument(doc),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: isDownloading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('View'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(BuildContext context, String title, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w600,
              ),
        ),
        Expanded(
          child: Text(
            value.isEmpty ? 'Not provided' : value,
            textAlign: TextAlign.right,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailCard(BuildContext context, String title, String content) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            content.isEmpty ? 'No details available.' : content,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ],
      ),
    );
  }
}
