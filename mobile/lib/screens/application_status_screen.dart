import 'package:flutter/material.dart';
import '../services/scholarship_application_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';

class ApplicationStatusScreen extends StatefulWidget {
  const ApplicationStatusScreen({
    super.key,
    required this.token,
    required this.applicationId,
  });

  final String token;
  final String applicationId;

  @override
  State<ApplicationStatusScreen> createState() => _ApplicationStatusScreenState();
}

class _ApplicationStatusScreenState extends State<ApplicationStatusScreen> {
  Map<String, dynamic>? _application;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadApplicationDetails();
  }

  Future<void> _loadApplicationDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await ScholarshipApplicationService.getApplicationDetails(
        widget.applicationId,
        widget.token,
      );

      setState(() {
        _application = result['application'] as Map<String, dynamic>?;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }


  Color _getStatusColorWidget(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return AppColors.success;
      case 'rejected':
        return AppColors.error;
      case 'pending review':
        return AppColors.warning;
      case 'needs resubmission':
        return AppColors.actionBlue;
      default:
        return AppColors.textSecondaryDark;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
        return Icons.check_circle;
      case 'rejected':
        return Icons.cancel;
      case 'pending review':
        return Icons.schedule;
      case 'needs resubmission':
        return Icons.info;
      default:
        return Icons.help;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Application Status'),
        backgroundColor: AppColors.background,
        foregroundColor: Colors.white,
      ),
      backgroundColor: AppColors.background,
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      PrimaryButton(
                        label: 'Retry',
                        onPressed: _loadApplicationDetails,
                      ),
                    ],
                  ),
                )
              : _application == null
                  ? const Center(
                      child: Text(
                        'Application not found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Status Card
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  _getStatusColorWidget(_application!['status'] ?? 'pending')
                                      .withValues(alpha: 0.2),
                                  _getStatusColorWidget(_application!['status'] ?? 'pending')
                                      .withValues(alpha: 0.1),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _getStatusColorWidget(_application!['status'] ?? 'pending')
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                Icon(
                                  _getStatusIcon(_application!['status'] ?? 'pending'),
                                  size: 64,
                                  color: _getStatusColorWidget(
                                    _application!['status'] ?? 'pending',
                                  ),
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  _application!['status'] ?? 'Unknown',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                    color: _getStatusColorWidget(
                                      _application!['status'] ?? 'pending',
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Your application status',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey.shade400,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Timeline
                          _buildTimelineItem(
                            'Application Submitted',
                            _formatDateTime(_application!['appliedAt'] as String?),
                            true,
                          ),
                          const SizedBox(height: 16),
                          if (_application!['reviewedAt'] != null)
                            _buildTimelineItem(
                              'Reviewed',
                              _formatDateTime(_application!['reviewedAt'] as String?),
                              true,
                            )
                          else
                            _buildTimelineItem(
                              'Awaiting Review',
                              'Pending provider review',
                              false,
                            ),
                          const SizedBox(height: 32),

                          // Provider Remarks
                          if (_application!['providerRemarks'] != null &&
                              (_application!['providerRemarks'] as String).isNotEmpty) ...[
                            Text(
                              'Provider Remarks',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade900,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: _getStatusColorWidget(
                                    _application!['status'] ?? 'pending',
                                  ).withValues(alpha: 0.3),
                                ),
                              ),
                              child: Text(
                                _application!['providerRemarks'] as String,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey.shade300,
                                  height: 1.6,
                                ),
                              ),
                            ),
                            const SizedBox(height: 32),
                          ],

                          // Uploaded Documents
                          if (_application!['documents'] != null &&
                              (_application!['documents'] as List).isNotEmpty) ...[
                            Text(
                              'Uploaded Documents',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ...((_application!['documents'] as List?)?.map((doc) =>
                                _buildDocumentItem(doc)) ??
                                []),
                            const SizedBox(height: 32),
                          ],

                          // Action Buttons
                          if (_application!['status'] == 'Needs Resubmission')
                            PrimaryButton(
                              label: 'Resubmit Documents',
                              onPressed: () => Navigator.pop(context, true),
                            ),
                        ],
                      ),
                    ),
    );
  }

  Widget _buildTimelineItem(String title, String? subtitle, bool isCompleted) {
    return Row(
      children: [
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted
                    ? AppColors.primary
                    : Colors.grey.shade700,
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            if (subtitle != null)
              Container(
                width: 2,
                height: 40,
                color: Colors.grey.shade700,
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade400,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDocumentItem(dynamic doc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade900,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    doc['fileName'] ?? 'Document',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Uploaded: ${_formatDateTime(doc['uploadedAt'] as String?)}',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.file_present, size: 20, color: AppColors.primary),
          ],
        ),
      ),
    );
  }

  String _formatDateTime(String? date) {
    if (date == null) return 'N/A';
    try {
      final parsed = DateTime.parse(date);
      return '${parsed.day}/${parsed.month}/${parsed.year} at ${parsed.hour}:${parsed.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return date;
    }
  }
}
