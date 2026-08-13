import 'package:flutter/foundation.dart' show kIsWeb, kDebugMode;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/app_constants.dart';
import '../utils/upload_source_dialog.dart';
import '../widgets/primary_button.dart';

class ApplicationUploadScreen extends StatefulWidget {
  const ApplicationUploadScreen({
    super.key,
    required this.scholarshipId,
    required this.token,
    this.requirements = const [],
  });

  final String scholarshipId;
  final String token;
  final List<String> requirements;

  @override
  State<ApplicationUploadScreen> createState() =>
      _ApplicationUploadScreenState();
}

class _ApplicationUploadScreenState extends State<ApplicationUploadScreen> {
  late Map<String, dynamic> _uploadedFiles;
  bool _isUploading = false;
  final TextEditingController _gpaController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // Initialize uploaded files map based strictly on scholarship requirements.
    _uploadedFiles = {};
    if (widget.requirements.isEmpty) {
      // No requirements -> no rows; UI will block submission.
      return;
    }

    for (int i = 0; i < widget.requirements.length; i++) {
      _uploadedFiles['file_$i'] = null;
    }
  }

  @override
  void dispose() {
    _gpaController.dispose();
    super.dispose();
  }

  Future<void> _pickFile(String key) async {
    final picked = await UploadSourceDialog.pick(
      context: context,
      title: 'Upload document',
    );

    if (picked == null) return;

    if (kIsWeb) {
      // For web we only store bytes.
      if (picked.bytes != null) {
        setState(() {
          _uploadedFiles[key] = {
            'bytes': picked.bytes!,
            'filename': picked.filename,
          };
        });
      }
      return;
    }

    if (picked.path != null && picked.path!.isNotEmpty) {
      setState(() {
        _uploadedFiles[key] = picked.path!;
      });
    } else if (picked.bytes != null) {
      // Fallback
      setState(() {
        _uploadedFiles[key] = {
          'bytes': picked.bytes!,
          'filename': picked.filename,
        };
      });
    }
  }

  Future<void> _upload() async {
    bool isEmptyValue(dynamic v) {
      if (v == null) return true;
      if (v is String) return v.isEmpty;
      if (v is Map<String, dynamic>) {
        final bytes = v['bytes'] as List<int>?;
        return bytes == null || bytes.isEmpty;
      }
      return true;
    }

    // requirements must come from the selected scholarship.
    final requirements = widget.requirements;

    if (requirements.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No requirements found for this scholarship.'),
        ),
      );
      return;
    }

    final missing = <String>[];
    for (int i = 0; i < requirements.length; i++) {
      if (isEmptyValue(_uploadedFiles['file_$i'])) {
        missing.add(requirements[i]);
      }
    }

    if (missing.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please upload: ${missing.join(', ')}')),
      );
      return;
    }

    setState(() => _isUploading = true);
    try {
      final fields = {
        'scholarship_id': widget.scholarshipId.toString(),
        'gpa': _gpaController.text,
      };
      final files = <String, dynamic>{};

      for (int i = 0; i < requirements.length; i++) {
        files['file_$i'] = _uploadedFiles['file_$i'];
      }

      // Debug: log active backend and upload metadata
      final scholarshipIdToSend = widget.scholarshipId;
      // ignore: avoid_print
      print(
        '[ApplicationUploadScreen._upload] backend=${AppConstants.backendBaseUrl} scholarship_id=$scholarshipIdToSend fields=${fields.keys.toList()} files=${files.keys.toList()}',
      );

      // In debug mode show a transient SnackBar so testers can verify the id being sent
      if (kDebugMode && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Debug: sending scholarship_id=$scholarshipIdToSend'), duration: const Duration(seconds: 2)),
        );
      }

      await ApiService.multipartUpload(
        '/applications/submit',
        fields: fields,
        filePaths: files,
        token: widget.token,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Uploaded successfully')));
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Upload failed: ${e.toString()}')));
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requirements = widget.requirements;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          'Upload Requirements',
          style: GoogleFonts.montserrat(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: 18,
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Upload the required documents for your application.',
                  style: GoogleFonts.openSans(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Required documents:',
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF38BDF8),
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: requirements
                        .map(
                          (req) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.check_circle_rounded,
                                  color: Color(0xFF38BDF8),
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    req,
                                    style: GoogleFonts.openSans(
                                      fontSize: 14,
                                      color: Colors.white,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _gpaController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'GPA (optional)',
                    labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF334155)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Upload files:',
                  style: GoogleFonts.montserrat(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF38BDF8),
                  ),
                ),
                const SizedBox(height: 12),
                ...List.generate(
                  requirements.length,
                  (index) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _fileRow(
                      requirements[index],
                      _uploadedFiles['file_$index'],
                      () => _pickFile('file_$index'),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                  label: 'Upload & Submit',
                  isLoading: _isUploading,
                  onPressed: _upload,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _fileRow(String label, dynamic path, VoidCallback onPick) {
    String getDisplayName() {
      if (path == null) return 'Tap to select document';
      if (path is String && path.isNotEmpty) {
        return path.split('/').last.split('\\').last;
      }
      if (path is Map<String, dynamic> && path['filename'] is String) {
        return path['filename'] as String;
      }
      return 'Document selected';
    }

    final isSelected = path != null;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? const Color(0xFF10B981) : const Color(0xFF334155),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.openSans(
                    fontSize: 12,
                    color: const Color(0xFF94A3B8),
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  getDisplayName(),
                  style: GoogleFonts.openSans(
                    fontSize: 14,
                    color: isSelected
                        ? const Color(0xFF34D399)
                        : Colors.white54,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: onPick,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Icon(
                  isSelected
                      ? Icons.check_circle_rounded
                      : Icons.cloud_upload_outlined,
                  color: isSelected ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
