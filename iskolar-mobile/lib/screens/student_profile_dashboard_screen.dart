import 'package:flutter/material.dart';

import '../models/user_model.dart';
import 'profile_screen.dart';

/// Simple wrapper that delegates to [ProfileScreen].
///
/// Exists so that any code referencing `StudentProfileDashboardScreen`
/// continues to compile.
class StudentProfileDashboardScreen extends StatelessWidget {
  const StudentProfileDashboardScreen({
    super.key,
    required this.user,
    required this.token,
  });

  final User user;
  final String token;

  @override
  Widget build(BuildContext context) {
    return ProfileScreen(user: user, token: token);
  }
}
