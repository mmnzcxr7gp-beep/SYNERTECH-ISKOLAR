import 'package:flutter/material.dart';

import '../models/application_model.dart';
import '../services/scholarship_service.dart';
import '../utils/app_colors.dart';
import 'application_detail_screen.dart';

/// Application History screen matching Tabbed Status List layout (Ref Screen #8)
class ApplicationHistoryScreen extends StatefulWidget {
  const ApplicationHistoryScreen({super.key, required this.token});

  final String token;

  @override
  State<ApplicationHistoryScreen> createState() => _ApplicationHistoryScreenState();
}

class _ApplicationHistoryScreenState extends State<ApplicationHistoryScreen> {
  int _tabIndex = 0; // 0 = ALL, 1 = IN PROGRESS, 2 = COMPLETE

  late Future<List<ApplicationEntry>> _futureApplications;

  @override
  void initState() {
    super.initState();
    _futureApplications = ScholarshipService.getApplications(widget.token);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Column(
          children: [
            // ─── TOP HEADER BAR ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Row(
                children: [
                  const Icon(Icons.history_edu_rounded, color: AppColors.primaryOrange, size: 28),
                  const SizedBox(width: 10),
                  const Text(
                    'APPLICATIONS',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                    onPressed: () {
                      setState(() {
                        _futureApplications = ScholarshipService.getApplications(widget.token);
                      });
                    },
                  ),
                ],
              ),
            ),

            // ─── SEGMENTED TAB PILL BAR ───────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                height: 48,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    _buildTabPill(0, 'ALL'),
                    _buildTabPill(1, 'IN PROGRESS'),
                    _buildTabPill(2, 'COMPLETE'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ─── OVERLAPPING LIST CONTENT SHEET ───────────────────────────
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: AppColors.backgroundDark,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                child: FutureBuilder<List<ApplicationEntry>>(
                  future: _futureApplications,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    if (snapshot.hasError) {
                      return Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                            const SizedBox(height: 12),
                            const Text(
                              'Unable to load applications',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _futureApplications = ScholarshipService.getApplications(widget.token);
                                });
                              },
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      );
                    }

                    final all = snapshot.data ?? [];
                    final filtered = _filterByTab(all);

                    if (filtered.isEmpty) {
                      return const Center(
                        child: Text(
                          'No applications found in this category.',
                          style: TextStyle(color: AppColors.textSecondaryDark),
                        ),
                      );
                    }

                    return Column(
                      children: [
                        Expanded(
                          child: ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final app = filtered[index];
                              final status = app.status.toLowerCase();
                              final isApproved = status == 'approved';
                              final isRejected = status == 'rejected' || status == 'denied' || status == 'disqualified';

                              Color badgeColor = isApproved
                                  ? AppColors.success
                                  : isRejected
                                      ? AppColors.error
                                      : AppColors.warning;

                              IconData icon = isApproved
                                  ? Icons.check_circle_rounded
                                  : isRejected
                                      ? Icons.cancel_rounded
                                      : Icons.hourglass_top_rounded;

                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(20),
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ApplicationDetailScreen(
                                          application: app,
                                          token: widget.token,
                                        ),
                                      ),
                                    );
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceDark,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                                    ),
                                    child: Row(
                                      children: [
                                        // Circular Colored Badge (Ref Screen #8)
                                        CircleAvatar(
                                          backgroundColor: badgeColor.withValues(alpha: 0.18),
                                          radius: 22,
                                          child: Icon(icon, color: badgeColor, size: 22),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                app.scholarshipTitle.isNotEmpty ? app.scholarshipTitle : 'Scholarship Program',
                                                style: const TextStyle(
                                                  color: AppColors.textPrimary,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 15,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                app.appliedAt.isNotEmpty ? 'Applied: ${app.appliedAt}' : 'Recently submitted',
                                                style: const TextStyle(
                                                  color: AppColors.textSecondary,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: badgeColor.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            app.status.toUpperCase(),
                                            style: TextStyle(
                                              color: badgeColor,
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Icon(Icons.chevron_right_rounded, color: Colors.white38, size: 20),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ─── PAGINATION INDICATOR (REF SCREEN #8) ─────────────
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.chevron_left, color: Colors.white54),
                              onPressed: () {},
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                '1',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text('2', style: TextStyle(color: Colors.white54)),
                            const SizedBox(width: 8),
                            const Text('3', style: TextStyle(color: Colors.white54)),
                            IconButton(
                              icon: const Icon(Icons.chevron_right, color: Colors.white54),
                              onPressed: () {},
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabPill(int index, String label) {
    final isSelected = _tabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabIndex = index),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white70,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<ApplicationEntry> _filterByTab(List<ApplicationEntry> applications) {
    if (_tabIndex == 0) return applications;
    return applications.where((app) {
      final s = app.status.toLowerCase();
      if (_tabIndex == 1) {
        // IN PROGRESS
        return s != 'approved' && s != 'rejected' && s != 'denied';
      }
      // COMPLETE
      return s == 'approved' || s == 'rejected' || s == 'denied';
    }).toList();
  }
}
