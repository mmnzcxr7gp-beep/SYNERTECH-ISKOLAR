import 'package:flutter/material.dart';
import '../services/scholarship_service.dart';
import '../services/scholarship_application_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';
import 'application_form_screen.dart';
import 'application_status_screen.dart';

class OpportunityDetailsScreen extends StatefulWidget {
  const OpportunityDetailsScreen({
    super.key,
    required this.token,
    required this.opportunityId,
  });

  final String token;
  final String opportunityId;

  @override
  State<OpportunityDetailsScreen> createState() =>
      _OpportunityDetailsScreenState();
}

class _OpportunityDetailsScreenState extends State<OpportunityDetailsScreen> {
  Map<String, dynamic>? _opportunity;
  List<dynamic> _requirements = [];
  bool _hasApplied = false;
  Map<String, dynamic>? _existingApplication;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOpportunityDetails();
  }

  Future<void> _loadOpportunityDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await ScholarshipService.getOpportunityDetails(
        widget.opportunityId,
        widget.token,
      );

      setState(() {
        _opportunity = result['opportunity'] as Map<String, dynamic>?;
        _requirements = result['requirements'] as List<dynamic>? ?? [];
        _hasApplied = result['hasApplied'] as bool? ?? false;
      });

      // If already applied, load application details
      if (_hasApplied) {
        try {
          final appResult = await ScholarshipApplicationService.getStudentApplication(
            widget.opportunityId,
            widget.token,
          );
          setState(() {
            _existingApplication = appResult;
          });
        } catch (e) {
          // Continue without application details
        }
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  String _formatDate(String? date) {
    if (date == null) return 'N/A';
    try {
      final parsed = DateTime.parse(date);
      return '${parsed.day}/${parsed.month}/${parsed.year}';
    } catch (e) {
      return date;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Opportunity Details'),
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
                        onPressed: _loadOpportunityDetails,
                      ),
                    ],
                  ),
                )
              : _opportunity == null
                  ? const Center(
                      child: Text(
                        'Opportunity not found',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title and Type
                          Text(
                            _opportunity!['title'] ?? '',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _opportunity!['type'] ?? 'Scholarship',
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Key Information
                          _buildInfoCard('Slots Available', '${_opportunity!['totalSlots'] ?? 0}'),
                          const SizedBox(height: 12),
                          _buildInfoCard(
                            'Application Deadline',
                            _formatDate(_opportunity!['applicationDeadline'] as String?),
                          ),
                          const SizedBox(height: 12),
                          if (_opportunity!['allowance'] != null && _opportunity!['allowance'] != 0)
                            _buildInfoCard(
                              'Monthly Allowance',
                              '₱${_opportunity!['allowance']}',
                            ),
                          const SizedBox(height: 24),

                          // Description
                          Text(
                            'About',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _opportunity!['description'] ?? '',
                            style: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Benefits
                          Text(
                            'Benefits',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _opportunity!['benefits'] ?? '',
                            style: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Eligibility
                          Text(
                            'Eligibility Requirements',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _opportunity!['eligibilityRequirements'] ?? '',
                            style: TextStyle(
                              color: Colors.grey.shade400,
                              fontSize: 14,
                              height: 1.6,
                            ),
                          ),
                          const SizedBox(height: 24),

                          // Required Documents
                          if (_requirements.isNotEmpty) ...[
                            Text(
                              'Required Documents',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            ..._requirements.map((req) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle,
                                      size: 20, color: AppColors.primary),
                                  const SizedBox(width: 12),
                                  Text(
                                    req['requirementName'] ?? '',
                                    style: TextStyle(
                                      color: Colors.grey.shade300,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            )),
                            const SizedBox(height: 24),
                          ],

                          // Application Status or Apply Button
                          if (_hasApplied && _existingApplication != null) ...[
                            _buildApplicationStatus(_existingApplication!),
                            const SizedBox(height: 16),
                            if (_existingApplication!['status'] == 'Needs Resubmission')
                              PrimaryButton(
                                label: 'Resubmit Documents',
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          ApplicationFormScreen(
                                        token: widget.token,
                                        opportunityId: widget.opportunityId,
                                        requirements: _requirements,
                                        isResubmission: true,
                                      ),
                                    ),
                                  );
                                },
                              )
                            else
                              PrimaryButton(
                                label: 'View Application',
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          ApplicationStatusScreen(
                                        token: widget.token,
                                        applicationId:
                                            _existingApplication!['_id'],
                                      ),
                                    ),
                                  );
                                },
                              ),
                          ] else
                            PrimaryButton(
                              label: 'Apply Now',
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => ApplicationFormScreen(
                                      token: widget.token,
                                      opportunityId: widget.opportunityId,
                                      requirements: _requirements,
                                    ),
                                  ),
                                );
                              },
                            ),
                          const SizedBox(height: 16),
                        ],
                      ),
                    ),
    );
  }

  Widget _buildInfoCard(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade400,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildApplicationStatus(Map<String, dynamic> application) {
    final status = application['status'] ?? 'Unknown';
    final remarks = application['providerRemarks'] ?? '';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Application Status',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
          if (remarks.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Provider Remarks:',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade400,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              remarks,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey.shade300,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
