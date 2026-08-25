import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import 'dashboard_header.dart';

/// Shared scaffold for all student dashboard pages.
///
/// - Consistent warm-dark theme background
/// - Transparent AppBar with white title
/// - Consistent padding/max width
/// - Reuses [DashboardHeader] for a uniform hero/header area
class StudentDashboardScaffold extends StatelessWidget {
  const StudentDashboardScaffold({
    super.key,
    required this.title,
    required this.child,
    this.showHeader = true,
    this.actions,
  });

  final String title;
  final Widget child;
  final bool showHeader;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
        ),
        actions: actions,
      ),
      body: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.backgroundDark : AppColors.backgroundLight,
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    if (showHeader) const DashboardHeader(),
                    if (showHeader) const SizedBox(height: 18),
                    child,
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
