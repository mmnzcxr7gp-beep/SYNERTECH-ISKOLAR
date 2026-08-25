import 'package:flutter/material.dart';

import '../models/application_model.dart';
import '../models/scholarship_model.dart';
import '../screens/scholarship_ranking_screen.dart';
import '../services/scholarship_service.dart';
import '../utils/app_colors.dart';

class ScholarshipApplicationsScreen extends StatefulWidget {
  const ScholarshipApplicationsScreen({
    super.key,
    required this.scholarship,
    required this.token,
  });

  final Scholarship scholarship;
  final String token;

  @override
  State<ScholarshipApplicationsScreen> createState() => _ScholarshipApplicationsScreenState();
}

class _ScholarshipApplicationsScreenState extends State<ScholarshipApplicationsScreen> {
  late Future<List<ApplicationEntry>> _futureApplications;

  @override
  void initState() {
    super.initState();
    _futureApplications = ScholarshipService.getScholarshipApplications(widget.scholarship.id, widget.token);
  }

  Future<void> _refresh() async {
    setState(() {
      _futureApplications = ScholarshipService.getScholarshipApplications(widget.scholarship.id, widget.token);
    });
    await _futureApplications;
  }

  Future<void> _updateStatus(int applicationId, String status) async {
    await ScholarshipService.updateApplicationStatus(applicationId, status, widget.token);
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(widget.scholarship.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.assessment_rounded),
            tooltip: 'View rankings',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => ScholarshipRankingScreen(
                    scholarship: widget.scholarship,
                    token: widget.token,
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<List<ApplicationEntry>>(
        future: _futureApplications,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          final applications = snapshot.data ?? [];
          if (applications.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(
                  'No applications have been submitted for this scholarship yet.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(18),
              separatorBuilder: (context, index) => const SizedBox(height: 12),
              itemCount: applications.length,
              itemBuilder: (context, index) {
                final application = applications[index];
                return Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              application.studentName.isNotEmpty ? application.studentName : application.studentEmail,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                            Chip(
                              label: Text(application.status),
                              backgroundColor: application.status == 'approved'
                                  ? const Color.fromRGBO(16, 185, 129, 0.12)
                                  : application.status == 'rejected'
                                      ? const Color.fromRGBO(239, 68, 68, 0.12)
                                      : const Color.fromRGBO(245, 158, 11, 0.12),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Score: ${application.score.toStringAsFixed(2)}'),
                        const SizedBox(height: 4),
                        Text('GPA: ${application.gpa}'),
                        const SizedBox(height: 4),
                        Text('Income: ${application.familyIncome}'),
                        const SizedBox(height: 4),
                        Text('Achievements: ${application.achievements}'),
                        const SizedBox(height: 16),
                        if (application.status == 'pending')
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: () => _updateStatus(int.parse(application.id), 'approved'),
                                  child: const Text('Approve'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: FilledButton.tonal(
                                  onPressed: () => _updateStatus(int.parse(application.id), 'rejected'),
                                  child: const Text('Reject'),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
