import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../widgets/iskolar_logo.dart';
import '../widgets/primary_button.dart';
import 'login_screen.dart';

/// Screen displayed when a Sponsor/Provider or Administrator attempts to log in via Flutter mobile.
class SponsorAdminNoticeScreen extends StatelessWidget {
  const SponsorAdminNoticeScreen({
    super.key,
    required this.userRole,
  });

  final String userRole;

  Future<void> _handleLogout(BuildContext context) async {
    await AuthService.logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayRole = (userRole.toLowerCase() == 'admin' || userRole.toLowerCase() == 'administrator')
        ? 'Administrator'
        : 'Scholarship Provider / Sponsor';

    return Scaffold(
      backgroundColor: AppColors.backgroundDark,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minHeight: constraints.maxHeight - 48),
                    child: IntrinsicHeight(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 12),
                          const ISKOLARLogo(size: 72),
                          const SizedBox(height: 24),

                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceDark,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  blurRadius: 20,
                                  offset: const Offset(0, 10),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.laptop_mac_rounded, color: AppColors.primaryOrange, size: 28),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        '$displayRole Web Portal',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'Provider and administrative features are exclusively available on the ISKOLAR Desktop Web Portal.',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    height: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Please access ISKOLAR on a desktop web browser to manage scholarship programs, review applicant queues, perform OCR document audits, and export reporting analytics.',
                                  style: TextStyle(
                                    color: AppColors.textSecondaryDark,
                                    fontSize: 12,
                                    height: 1.4,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 28),

                          PrimaryButton(
                            label: 'LOG OUT & RETURN TO LOGIN',
                            onPressed: () => _handleLogout(context),
                          ),
                          const SizedBox(height: 12),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
