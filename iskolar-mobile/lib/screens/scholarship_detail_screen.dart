import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/scholarship_model.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';
import 'application_upload_screen.dart';
import '../services/auth_service.dart';

class ScholarshipDetailScreen extends StatefulWidget {
  const ScholarshipDetailScreen({
    super.key,
    required this.scholarship,
    required this.token,
    required this.alreadyApplied,
  });

  final Scholarship scholarship;
  final String token;
  final bool alreadyApplied;

  @override
  State<ScholarshipDetailScreen> createState() =>
      _ScholarshipDetailScreenState();
}

class _ScholarshipDetailScreenState extends State<ScholarshipDetailScreen> {
  late bool _applied;
  bool _isVerified = true;
  @override
  void initState() {
    super.initState();
    _applied = widget.alreadyApplied;
    _loadUserVerification();
  }

  Future<void> _loadUserVerification() async {
    final user = await AuthService.getCurrentUser();
    setState(() {
      _isVerified = user?.verificationStatus == 'verified';
    });
  }

  @override
  Widget build(BuildContext context) {
    final scholarship = widget.scholarship;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Scholarship details')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: ListView(
            children: [
              Text(
                scholarship.title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              if (scholarship.sponsorName.isNotEmpty)
                Text(
                  'Sponsor: ${scholarship.sponsorName}',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              const SizedBox(height: 18),
              Text(
                scholarship.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _buildInfoCard('Slots', '${scholarship.slots}'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildInfoCard('Deadline', scholarship.deadline),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _buildSection('Requirements', scholarship.requirements),
              const SizedBox(height: 16),
              const SizedBox(height: 12),
              if (scholarship.requirements.isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border.withValues(alpha: 0.06)),
                  ),
                  child: Text(
                    'Upload the documents required by this provider to submit your application.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),

              const SizedBox(height: 22),
              if (!_isVerified && !_applied)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    'You need to complete student verification before applying for scholarships.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ),
              PrimaryButton(
                label: _applied
                    ? 'Already applied'
                    : (!_isVerified ? 'Verification required' : 'Upload requirements'),
                isLoading: false,
                disabled: _applied || !_isVerified,
                onPressed: () {
                  if (_applied || !_isVerified) return;
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ApplicationUploadScreen(
                        scholarshipId: scholarship.id,
                        token: widget.token,
                        requirements: scholarship.requirements,
                      ),
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

  Widget _buildInfoCard(String title, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<String> requirements) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.montserrat(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.deepPurple,
          ),
        ),
        const SizedBox(height: 12),
        if (requirements.isEmpty)
          Text(
            'No specific requirements listed.',
            style: GoogleFonts.openSans(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: requirements
                  .map((req) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle_rounded,
                              color: Colors.deepPurple,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                req,
                                style: GoogleFonts.openSans(
                                  fontSize: 14,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ))
                  .toList(),
            ),
          ),
      ],
    );
  }
}
