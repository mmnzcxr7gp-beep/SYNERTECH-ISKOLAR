import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../utils/app_colors.dart';
import 'home_screen.dart';
import 'browse_scholarships_screen.dart';
import 'application_history_screen.dart';
import 'profile_screen.dart';

/// The main shell screen for the student area, providing a bottom navigation
/// bar with four tabs: Home, Browse, Applications, and Profile.
class StudentMainShellScreen extends StatefulWidget {
  const StudentMainShellScreen({
    super.key,
    required this.user,
    required this.token,
  });

  final User user;
  final String token;

  @override
  State<StudentMainShellScreen> createState() => _StudentMainShellScreenState();
}

class _StudentMainShellScreenState extends State<StudentMainShellScreen> {
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomeScreen(
        user: widget.user,
        token: widget.token,
        onSelectTab: (index) => setState(() => _currentIndex = index),
      ),
      BrowseScholarshipsScreen(token: widget.token),
      ApplicationHistoryScreen(token: widget.token),
      ProfileScreen(user: widget.user, token: widget.token),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(
              color: AppColors.border.withValues(alpha: 0.08),
            ),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) {
            setState(() => _currentIndex = index);
          },
          backgroundColor: Colors.transparent,
          indicatorColor: AppColors.primary.withValues(alpha: 0.15),
          surfaceTintColor: Colors.transparent,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: AppColors.primary),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.search_outlined),
              selectedIcon: Icon(Icons.search, color: AppColors.primary),
              label: 'Browse',
            ),
            NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment, color: AppColors.primary),
              label: 'Applications',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person, color: AppColors.primary),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
