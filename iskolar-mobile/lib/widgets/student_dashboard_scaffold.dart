import 'package:flutter/material.dart';


import 'dashboard_header.dart';

/// Shared scaffold for all student dashboard pages.
///
/// - Consistent dark gradient background
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
    return Scaffold(
      backgroundColor: const Color(0xFF050B18),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
        ),
        actions: actions,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF050B18),
              Color(0xFF0B1020),
              Color(0xFF061126),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
                child: ListView(
                  // allow long content
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

