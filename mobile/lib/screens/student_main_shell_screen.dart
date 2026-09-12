import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/user_model.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';
import 'home_screen.dart';
import 'browse_scholarships_screen.dart';
import 'application_history_screen.dart';
import 'chatbot_page.dart';
import 'profile_screen.dart';

/// The redesigned shell screen for the student area.
/// Features a modern rounded floating bottom navigation inspired by the design references:
/// - 5 Standard Tabs: Home, Scholarships, Applications, Messages, Profile
/// - Selected item uses Action Blue (#305BFE) with soft pill indicator
/// - Inactive items use muted blue-gray (#68758A)
/// - Floating rounded card with soft diffused shadow
class StudentMainShellScreen extends StatefulWidget {
  const StudentMainShellScreen({
    super.key,
    required this.user,
    required this.token,
    this.initialIndex = 0,
  });

  final User user;
  final String token;
  final int initialIndex;

  @override
  State<StudentMainShellScreen> createState() => _StudentMainShellScreenState();
}

class _StudentMainShellScreenState extends State<StudentMainShellScreen> {
  late int _currentIndex;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pages = [
      HomeScreen(
        user: widget.user,
        token: widget.token,
        onSelectTab: (index) {
          if (mounted && index >= 0 && index < 5) {
            setState(() => _currentIndex = index);
          }
        },
      ),
      BrowseScholarshipsScreen(token: widget.token),
      ApplicationHistoryScreen(token: widget.token),
      const ChatbotPage(),
      ProfileScreen(user: widget.user, token: widget.token),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A090C),
      extendBody: true,
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
          child: Container(
            height: 66,
            decoration: BoxDecoration(
              color: const Color(0xFF131118),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.12),
                width: 1.0,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.55),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  index: 0,
                  icon: Icons.home_rounded,
                  unselectedIcon: Icons.home_outlined,
                  label: 'Home',
                ),
                _buildNavItem(
                  index: 1,
                  icon: Icons.school_rounded,
                  unselectedIcon: Icons.school_outlined,
                  label: 'Scholarships',
                ),
                _buildNavItem(
                  index: 2,
                  icon: Icons.assignment_rounded,
                  unselectedIcon: Icons.assignment_outlined,
                  label: 'Applications',
                ),
                _buildNavItem(
                  index: 3,
                  icon: Icons.chat_bubble_rounded,
                  unselectedIcon: Icons.chat_bubble_outline_rounded,
                  label: 'Assistant',
                ),
                _buildNavItem(
                  index: 4,
                  icon: Icons.person_rounded,
                  unselectedIcon: Icons.person_outline_rounded,
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required IconData unselectedIcon,
    required String label,
  }) {
    final isSelected = _currentIndex == index;
    const activeColor = AppColors.actionBlue;
    const inactiveColor = Color(0xFFA6A0AF);

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (_currentIndex != index) {
              setState(() => _currentIndex = index);
            }
          },
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.actionBlue.withValues(alpha: 0.20)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusPill),
                  ),
                  child: Icon(
                    isSelected ? icon : unselectedIcon,
                    color: isSelected ? activeColor : inactiveColor,
                    size: 22,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.poppins(
                    fontSize: 10.5,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected ? activeColor : inactiveColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
