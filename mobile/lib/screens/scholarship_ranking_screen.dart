import 'package:flutter/material.dart';

import '../models/scholarship_model.dart';
import '../models/scholarship_ranking_model.dart';
import '../services/scholarship_service.dart';
import '../utils/app_colors.dart';

class ScholarshipRankingScreen extends StatefulWidget {
  const ScholarshipRankingScreen({
    super.key,
    required this.scholarship,
    required this.token,
  });

  final Scholarship scholarship;
  final String token;

  @override
  State<ScholarshipRankingScreen> createState() => _ScholarshipRankingScreenState();
}

class _ScholarshipRankingScreenState extends State<ScholarshipRankingScreen> {
  late Future<List<ScholarshipRankingEntry>> _futureRankings;

  @override
  void initState() {
    super.initState();
    _futureRankings = ScholarshipService.getScholarshipRankings(widget.scholarship.id, widget.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('${widget.scholarship.title} Rankings'),
      ),
      body: FutureBuilder<List<ScholarshipRankingEntry>>(
        future: _futureRankings,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          final rankings = snapshot.data ?? [];
          if (rankings.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Text(
                  'No ranked applications are available for this scholarship yet.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(18),
            separatorBuilder: (context, _) => const SizedBox(height: 12),
            itemCount: rankings.length,
            itemBuilder: (context, index) {
              final ranking = rankings[index];
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
                            'Rank #${index + 1}',
                            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textSecondary,
                                ),
                          ),
                          Chip(
                            label: Text(ranking.status),
                            backgroundColor: ranking.status == 'approved'
                                ? const Color.fromRGBO(16, 185, 129, 0.12)
                                : ranking.status == 'rejected'
                                    ? const Color.fromRGBO(239, 68, 68, 0.12)
                                    : const Color.fromRGBO(245, 158, 11, 0.12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        ranking.studentName.isNotEmpty ? ranking.studentName : 'Applicant ${ranking.studentId}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 10),
                      Text('Score: ${ranking.score.toStringAsFixed(2)}'),
                      const SizedBox(height: 8),
                      Text('School: ${ranking.school.isNotEmpty ? ranking.school : 'N/A'}'),
                      const SizedBox(height: 4),
                      Text('Course: ${ranking.course.isNotEmpty ? ranking.course : 'N/A'}'),
                      const SizedBox(height: 4),
                      Text('GPA: ${ranking.gpa.isNotEmpty ? ranking.gpa : 'N/A'}'),
                      const SizedBox(height: 4),
                      Text('Income: ${ranking.familyIncome.isNotEmpty ? ranking.familyIncome : 'N/A'}'),
                      const SizedBox(height: 4),
                      Text('Achievements: ${ranking.achievements.isNotEmpty ? ranking.achievements : 'N/A'}'),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
