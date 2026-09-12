import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final headerTextColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final tabContainerBg = isDark ? Colors.white.withValues(alpha: 0.08) : AppColors.lightBlueSurface;
    final sheetBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final cardBg = isDark ? AppColors.darkElevated : AppColors.pureWhite;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: SafeArea(
        child: Column(
          children: [
            // ─── TOP HEADER BAR ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              child: Row(
                children: [
                  const Icon(Icons.history_edu_rounded, color: AppColors.actionBlue, size: 28),
                  const SizedBox(width: 10),
                  Text(
                    'APPLICATIONS',
                    style: GoogleFonts.poppins(
                      color: headerTextColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.refresh_rounded, color: headerTextColor),
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
                  color: tabContainerBg,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  children: [
                    _buildTabPill(0, 'ALL', isDark),
                    _buildTabPill(1, 'IN PROGRESS', isDark),
                    _buildTabPill(2, 'COMPLETE', isDark),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ─── OVERLAPPING LIST CONTENT SHEET ───────────────────────────
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: sheetBg,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: isDark
                          ? Colors.black.withValues(alpha: 0.25)
                          : const Color(0xFF15265C).withValues(alpha: 0.05),
                      blurRadius: 14,
                      offset: const Offset(0, -3),
                    ),
                  ],
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
                            Text(
                              'Unable to load applications',
                              style: GoogleFonts.poppins(color: textPrimary, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _futureApplications = ScholarshipService.getApplications(widget.token);
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.actionBlue,
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      );
                    }

                    final allApps = snapshot.data ?? [];
                    final filtered = _filterByTab(allApps);

                    if (filtered.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.inbox_rounded, size: 56, color: textSecondary.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            Text(
                              'No applications found in this view',
                              style: GoogleFonts.poppins(color: textSecondary, fontSize: 14),
                            ),
                          ],
                        ),
                      );
                    }

                    return Column(
                      children: [
                        Expanded(
                          child: ListView.separated(
                            itemCount: filtered.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final app = filtered[index];
                              final statusLower = app.status.toLowerCase();

                              Color badgeColor;
                              IconData icon;
                              if (statusLower == 'approved') {
                                badgeColor = AppColors.success;
                                icon = Icons.check_circle_rounded;
                              } else if (statusLower == 'rejected' || statusLower == 'denied') {
                                badgeColor = AppColors.error;
                                icon = Icons.cancel_rounded;
                              } else if (statusLower == 'under review') {
                                badgeColor = AppColors.information;
                                icon = Icons.rate_review_rounded;
                              } else {
                                badgeColor = AppColors.warning;
                                icon = Icons.access_time_rounded;
                              }

                              return RepaintBoundary(
                                child: Material(
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
                                        color: cardBg,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: cardBorder),
                                        boxShadow: [
                                          BoxShadow(
                                            color: isDark
                                                ? Colors.black.withValues(alpha: 0.15)
                                                : const Color(0xFF15265C).withValues(alpha: 0.04),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: Row(
                                        children: [
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
                                                  style: GoogleFonts.poppins(
                                                    color: textPrimary,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 15,
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  app.appliedAt.isNotEmpty ? 'Applied: ${app.appliedAt}' : 'Recently submitted',
                                                  style: GoogleFonts.poppins(
                                                    color: textSecondary,
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
                                              style: GoogleFonts.poppins(
                                                color: badgeColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Icon(Icons.chevron_right_rounded, color: textSecondary, size: 20),
                                        ],
                                      ),
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
                              icon: Icon(Icons.chevron_left, color: textSecondary),
                              onPressed: () {},
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.actionBlue,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '1',
                                style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text('2', style: GoogleFonts.poppins(color: textSecondary)),
                            const SizedBox(width: 8),
                            Text('3', style: GoogleFonts.poppins(color: textSecondary)),
                            IconButton(
                              icon: Icon(Icons.chevron_right, color: textSecondary),
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

  Widget _buildTabPill(int index, String label, bool isDark) {
    final isSelected = _tabIndex == index;
    final unselectedTextColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _tabIndex = index),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppColors.actionBlue : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                color: isSelected ? Colors.white : unselectedTextColor,
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
