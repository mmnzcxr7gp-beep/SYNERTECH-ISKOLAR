import 'package:flutter/material.dart';

import '../models/user_model.dart';
import 'student_main_shell_screen.dart';

/// Entry point for the student area.
///
/// This file now delegates to a themed multi-page BottomNavigation shell.
class StudentDashboardScreen extends StatelessWidget {
  const StudentDashboardScreen({
    super.key,
    required this.user,
    required this.token,
  });

  final User user;
  final String token;

  @override
  Widget build(BuildContext context) {
    return StudentMainShellScreen(
      user: user,
      token: token,
    );
  }
}

