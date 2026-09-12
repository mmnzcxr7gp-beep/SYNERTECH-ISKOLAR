import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../widgets/iskolar_logo.dart';
import '../widgets/primary_button.dart';
import 'login_screen.dart';

/// Screen displayed when a Sponsor/Provider or Administrator attempts to log in via Flutter mobile.
/// Dynamically supports both the default Light Mode and Dark Mode in the locked blue/Poppins system.
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
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final cardColor = isDark ? AppColors.surfaceDark : AppColors.pureWhite;
    final cardBorder = isDark ? const Color(0xFF22314D) : AppColors.border;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

    final displayRole = (userRole.toLowerCase() == 'admin' || userRole.toLowerCase() == 'administrator')
        ? 'Administrator'
        : 'Scholarship Provider / Sponsor';

    return Scaffold(
      backgroundColor: bgColor,
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
                              color: cardColor,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: cardBorder),
                              boxShadow: [
                                BoxShadow(
                                  color: isDark ? Colors.black.withValues(alpha: 0.35) : const Color(0x0C15265C),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 44,
                                      height: 44,
                                      decoration: BoxDecoration(
                                        color: isDark ? const Color(0xFF1E2F52) : AppColors.lightBlueSurface,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(Icons.laptop_mac_rounded, color: AppColors.actionBlue, size: 26),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Text(
                                        '$displayRole Web Portal',
                                        style: GoogleFonts.poppins(
                                          color: textPrimary,
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Provider and administrative features are exclusively available on the ISKOLAR Desktop Web Portal.',
                                  style: GoogleFonts.poppins(
                                    color: textPrimary,
                                    fontSize: 13.5,
                                    height: 1.5,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'Please access ISKOLAR on a desktop web browser to manage scholarship programs, review applicant queues, perform OCR document audits, and export reporting analytics.',
                                  style: GoogleFonts.poppins(
                                    color: textSecondary,
                                    fontSize: 12,
                                    height: 1.45,
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
