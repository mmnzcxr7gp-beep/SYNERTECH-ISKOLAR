import 'package:flutter/material.dart';

import '../models/auth_role.dart';
import '../utils/app_colors.dart';
import '../widgets/role_card.dart';
import 'login_screen.dart';
import 'sponsor_admin_notice_screen.dart';

/// Role selection screen after onboarding.
class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  void _selectRole(BuildContext context, AuthRole role) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            // subtle gradient blobs behind content
            Positioned(
              top: -120,
              left: -90,
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      blurRadius: 80,
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              top: 40,
              right: -100,
              child: Container(
                width: 220,
                height: 220,
decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text(
                      'Choose Your Role',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text(
                      'This helps ISKOLAR tailor your experience.',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Cards container
                  Card(
                    elevation: 0,
color: Colors.white.withValues(alpha: 0.96),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                      side: const BorderSide(color: AppColors.border, width: 1),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          RoleCard(
                            title: AuthRole.student.label,
                            subtitle:
                                'Find scholarships and track applications.',
                            icon: Icons.school_outlined,
                            onTap: () => _selectRole(context, AuthRole.student),
                          ),
                          const SizedBox(height: 12),
                          RoleCard(
                            title: AuthRole.sponsor.label,
                            subtitle:
                                'Support students through funding opportunities (Web Portal Only).',
                            icon: Icons.handshake_outlined,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const SponsorAdminNoticeScreen(userRole: 'sponsor'),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Footer note
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: Text(
                      'Pick your role and continue.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}


