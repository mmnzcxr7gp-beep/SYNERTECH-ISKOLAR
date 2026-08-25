import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../services/scholarship_application_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';

class ApplicationFormScreen extends StatefulWidget {
  const ApplicationFormScreen({
    super.key,
    required this.token,
    required this.opportunityId,
    required this.requirements,
    this.isResubmission = false,
  });

  final String token;
  final String opportunityId;
  final List<dynamic> requirements;
  final bool isResubmission;

  @override
  State<ApplicationFormScreen> createState() => _ApplicationFormScreenState();
}

class _ApplicationFormScreenState extends State<ApplicationFormScreen> {
  final _selectedFiles = <String, String>{}; // requirementId -> filePath
  bool _submitting = false;
  String? _error;
  String? _success;

  Future<void> _pickFile(String requirementId, String requirementName) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png'],
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          _selectedFiles[requirementId] = result.files.first.path!;
          _error = null;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error picking file: ${e.toString()}';
      });
    }
  }

  Future<void> _submitApplication() async {
    // Validate all required files are selected
    final requiredReqs = widget.requirements
        .where((r) => r['isRequired'] == true)
        .map((r) => r['_id'] as String)
        .toList();

    final missingReqs = requiredReqs
        .where((req) => !_selectedFiles.containsKey(req))
        .toList();

    if (missingReqs.isNotEmpty) {
      setState(() {
        _error = 'Please upload all required documents';
      });
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });

    try {
      await ScholarshipApplicationService.submitApplication(
        widget.opportunityId,
        _selectedFiles,
        widget.token,
      );

      setState(() {
        _success = widget.isResubmission
            ? 'Documents resubmitted successfully!'
            : 'Application submitted successfully!';
        _submitting = false;
        _selectedFiles.clear();
      });

      // Navigate back after 2 seconds
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) {
        Navigator.popUntil(context, (route) => route.isFirst);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isResubmission ? 'Resubmit Documents' : 'Submit Application'),
        backgroundColor: AppColors.background,
        foregroundColor: Colors.white,
      ),
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info text
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                widget.isResubmission
                    ? 'Please resubmit the documents requested by the provider.'
                    : 'Please upload all required documents to complete your application.',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.primary,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Required Documents
            Text(
              'Required Documents',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...widget.requirements.map((req) => _buildDocumentUploadField(
              req['_id'] as String,
              req['requirementName'] as String,
              req['isRequired'] as bool? ?? true,
            )),
            const SizedBox(height: 24),

            // Error message
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red, fontSize: 14),
                ),
              ),
            const SizedBox(height: 12),

            // Success message
            if (_success != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
                ),
                child: Text(
                  _success!,
                  style: const TextStyle(color: Colors.green, fontSize: 14),
                ),
              ),
            const SizedBox(height: 24),

            // Submit button
            PrimaryButton(
              label: _submitting
                  ? 'Submitting...'
                  : (widget.isResubmission ? 'Resubmit' : 'Submit Application'),
              onPressed: _submitting ? null : _submitApplication,
              isLoading: _submitting,
            ),
            const SizedBox(height: 16),

            // Cancel button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.grey.shade800,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Cancel'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentUploadField(
    String requirementId,
    String requirementName,
    bool isRequired,
  ) {
    final filePath = _selectedFiles[requirementId];
    final fileName = filePath?.split('/').last;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GestureDetector(
        onTap: () => _pickFile(requirementId, requirementName),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.grey.shade900,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: filePath != null
                  ? AppColors.primary.withValues(alpha: 0.5)
                  : Colors.grey.shade700,
              width: 2,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          requirementName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        if (isRequired)
                          const Text(
                            '(Required)',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.red,
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (filePath != null)
                    const Icon(Icons.check_circle,
                        color: AppColors.primary, size: 24)
                  else
                    const Icon(Icons.cloud_upload_outlined,
                        color: Colors.grey, size: 24),
                ],
              ),
              if (filePath != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          fileName ?? 'File selected',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade300,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedFiles.remove(requirementId);
                          });
                        },
                        child: const Icon(Icons.close,
                            size: 16, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ] else
                const SizedBox(height: 12),
              Text(
                'Tap to select file (PDF, JPG, PNG)',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
