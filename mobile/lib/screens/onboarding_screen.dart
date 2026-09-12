import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Ultra-Modern Apple-Inspired Blue & Poppins Onboarding Screen
/// Implements the locked ISKOLAR 2.0 visual system:
/// - Light Mode default: Soft light-blue background (#F7F9FD), White rounded cards (#FFFFFF),
///   Navy (#15265C) headers, Action Blue (#305BFE) actions, Sky Blue (#4F96FF) accents,
///   Border (#DCE5F2), Poppins typography.
/// - Dynamic Dark Mode: Sleek dark surface (#0B1020 / #16213A) with responsive typography.
class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bgColor = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final cardColor = isDark ? const Color(0xFF131C2E) : AppColors.pureWhite;
    final cardBorder = isDark ? const Color(0xFF22314D) : AppColors.border;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;
    final surfaceTint = isDark ? const Color(0xFF1B273F) : AppColors.lightBlueSurface;

    return Scaffold(
      backgroundColor: bgColor,
      body: Stack(
        children: [
          // ─── 1. ORGANIC AMBIENT BACKGROUND CURVES & GRADIENTS ───────────────
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: isDark
                      ? const [
                          Color(0xFF090D18),
                          Color(0xFF0E1526),
                          Color(0xFF0B1020),
                        ]
                      : const [
                          Color(0xFFEFF5FF),
                          Color(0xFFF7F9FD),
                          Color(0xFFF3F7FD),
                        ],
                ),
              ),
            ),
          ),

          // Top-Right Glowing Blue Orb
          Positioned(
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    isDark
                        ? AppColors.actionBlue.withValues(alpha: 0.22)
                        : const Color(0xFFBAD5FF).withValues(alpha: 0.50),
                    isDark
                        ? AppColors.skyBlue.withValues(alpha: 0.10)
                        : const Color(0xFFDDEBFF).withValues(alpha: 0.20),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Center-Left Subtle Cyan/Sky Blue Orb
          Positioned(
            top: 240,
            left: -80,
            width: 280,
            height: 280,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    isDark
                        ? const Color(0xFF4F96FF).withValues(alpha: 0.16)
                        : const Color(0xFFD6E6FF).withValues(alpha: 0.45),
                    isDark
                        ? const Color(0xFF305BFE).withValues(alpha: 0.06)
                        : const Color(0xFFE8F1FF).withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Bottom-Right Deep Blue Orb
          Positioned(
            bottom: 60,
            right: -40,
            width: 260,
            height: 260,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    isDark
                        ? AppColors.actionBlue.withValues(alpha: 0.18)
                        : const Color(0xFFC7DEFF).withValues(alpha: 0.40),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Ambient Blur Filter Layer
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 45, sigmaY: 45),
              child: Container(color: Colors.transparent),
            ),
          ),

          // ─── 2. FOREGROUND CONTENT ───────────────────────────────────────────
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s20, vertical: AppSpacing.s16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ─── A. TOP NAVIGATION BAR ─────────────────────────────────
                      _buildContainerCard(
                        cardColor: cardColor,
                        cardBorder: cardBorder,
                        isDark: isDark,
                        borderRadius: AppSpacing.radiusPanel,
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16, vertical: AppSpacing.s12),
                        child: Row(
                          children: [
                            Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [Color(0xFF4F96FF), Color(0xFF305BFE)],
                                ),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.actionBlue.withValues(alpha: 0.35),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.school_rounded,
                                color: Colors.white,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.s12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'ISKOLAR',
                                    style: GoogleFonts.poppins(
                                      color: textPrimary,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                      letterSpacing: 1.1,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    'Scholarship Portal',
                                    style: GoogleFonts.poppins(
                                      color: textSecondary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: AppSpacing.s8),

                            // Sign In Pill Button
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                                  );
                                },
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: surfaceTint,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isDark ? const Color(0xFF2C3E61) : const Color(0xFFBFDBFE),
                                      width: 1,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Sign In',
                                        style: GoogleFonts.poppins(
                                          color: AppColors.actionBlue,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      const Icon(
                                        Icons.arrow_forward_ios_rounded,
                                        color: AppColors.actionBlue,
                                        size: 10,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.s16),

                      // ─── B. HERO SHOWCASE CARD ────────────────────────────────
                      _buildContainerCard(
                        cardColor: cardColor,
                        cardBorder: cardBorder,
                        isDark: isDark,
                        borderRadius: 24,
                        padding: const EdgeInsets.all(AppSpacing.s24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Live Status Pill Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: surfaceTint,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF2C3E61) : const Color(0xFFBFDBFE),
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.actionBlue,
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.actionBlue,
                                          blurRadius: 6,
                                          spreadRadius: 1,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'ACADEMIC SCHOLARSHIP PLATFORM',
                                      style: GoogleFonts.poppins(
                                        color: AppColors.actionBlue,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.8,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s16),

                            // Main Headline
                            Text(
                              'Find Scholarships.\nBuild Your Future.',
                              style: GoogleFonts.poppins(
                                color: textPrimary,
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                height: 1.2,
                                letterSpacing: -0.5,
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s12),

                            // Sub-headline
                            Text(
                              'Browse verified grant programs, apply with automated OCR document intake, and track your application status in real-time.',
                              style: GoogleFonts.poppins(
                                color: textSecondary,
                                fontSize: 13,
                                height: 1.5,
                                fontWeight: FontWeight.w400,
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s16),

                            // Trust / Highlight Chips
                            Wrap(
                              spacing: AppSpacing.s8,
                              runSpacing: AppSpacing.s8,
                              children: [
                                _buildPillChip(Icons.verified_rounded, 'Verified Grants', const Color(0xFF10B981), surfaceTint, cardBorder, textPrimary),
                                _buildPillChip(Icons.bolt_rounded, 'AI OCR Intake', const Color(0xFF0284C7), surfaceTint, cardBorder, textPrimary),
                                _buildPillChip(Icons.security_rounded, 'Official Portal', const Color(0xFF7C3AED), surfaceTint, cardBorder, textPrimary),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.s20),

                      // ─── C. CAPABILITIES SECTION HEADER ─────────────────────
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                'PLATFORM CAPABILITIES',
                                style: GoogleFonts.poppins(
                                  color: textPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.1,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text(
                              'Core Features',
                              style: GoogleFonts.poppins(
                                color: textSecondary,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.s12),

                      // ─── D. 2x2 BENTO TILES ─────────────────────────────────
                      Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: _buildBentoCard(
                                  icon: Icons.verified_user_rounded,
                                  accentColor: const Color(0xFF10B981),
                                  title: 'Verified Sponsors',
                                  subtitle: 'Official providers',
                                  cardColor: cardColor,
                                  cardBorder: cardBorder,
                                  isDark: isDark,
                                  textPrimary: textPrimary,
                                  textSecondary: textSecondary,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.s12),
                              Expanded(
                                child: _buildBentoCard(
                                  icon: Icons.document_scanner_rounded,
                                  accentColor: const Color(0xFF0284C7),
                                  title: 'OCR Verification',
                                  subtitle: 'Fast ID extraction',
                                  cardColor: cardColor,
                                  cardBorder: cardBorder,
                                  isDark: isDark,
                                  textPrimary: textPrimary,
                                  textSecondary: textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.s12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildBentoCard(
                                  icon: Icons.radar_rounded,
                                  accentColor: AppColors.actionBlue,
                                  title: 'Live Tracking',
                                  subtitle: 'Real-time updates',
                                  cardColor: cardColor,
                                  cardBorder: cardBorder,
                                  isDark: isDark,
                                  textPrimary: textPrimary,
                                  textSecondary: textSecondary,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.s12),
                              Expanded(
                                child: _buildBentoCard(
                                  icon: Icons.auto_awesome_rounded,
                                  accentColor: const Color(0xFF7C3AED),
                                  title: 'Merit Ranking',
                                  subtitle: 'Criteria scoring',
                                  cardColor: cardColor,
                                  cardBorder: cardBorder,
                                  isDark: isDark,
                                  textPrimary: textPrimary,
                                  textSecondary: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: AppSpacing.s24),

                      // ─── E. ACTION DOCK ──────────────────────────────────────
                      _buildContainerCard(
                        cardColor: cardColor,
                        cardBorder: cardBorder,
                        isDark: isDark,
                        borderRadius: AppSpacing.radiusPanel,
                        padding: const EdgeInsets.all(AppSpacing.s16),
                        child: Column(
                          children: [
                            // Primary Action Blue Button
                            Container(
                              width: double.infinity,
                              height: AppSpacing.buttonHeight,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [Color(0xFF305DE0), Color(0xFF305BFE)],
                                ),
                                borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.actionBlue.withValues(alpha: 0.35),
                                    blurRadius: 18,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s12),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            'CREATE STUDENT ACCOUNT',
                                            style: GoogleFonts.poppins(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13,
                                              letterSpacing: 0.5,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s12),

                            // Secondary Light Surface Button
                            Container(
                              width: double.infinity,
                              height: 48,
                              decoration: BoxDecoration(
                                color: surfaceTint,
                                borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                border: Border.all(
                                  color: isDark ? const Color(0xFF2B3A57) : const Color(0xFFDCE5F2),
                                  width: 1,
                                ),
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                  child: Center(
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s12),
                                      child: Text(
                                        'SIGN IN TO EXISTING ACCOUNT',
                                        style: GoogleFonts.poppins(
                                          color: textPrimary,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                          letterSpacing: 0.4,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s8),

                            // Minimalist Privacy & Security Note
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.lock_outline_rounded, size: 12, color: textSecondary),
                                const SizedBox(width: 5),
                                Flexible(
                                  child: Text(
                                    'Encrypted & Student-Centered Platform',
                                    style: GoogleFonts.poppins(
                                      color: textSecondary,
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.s12),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── REUSABLE CARD CONTAINER HELPER ─────────────────────────────────────
  Widget _buildContainerCard({
    required Widget child,
    required Color cardColor,
    required Color cardBorder,
    required bool isDark,
    required double borderRadius,
    EdgeInsetsGeometry? padding,
  }) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: cardBorder,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.35) : const Color(0x0C15265C),
            blurRadius: isDark ? 20 : 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }

  // ─── REUSABLE BENTO CARD ────────────────────────────────────────────────
  Widget _buildBentoCard({
    required IconData icon,
    required Color accentColor,
    required String title,
    required String subtitle,
    required Color cardColor,
    required Color cardBorder,
    required bool isDark,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.s12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        border: Border.all(
          color: cardBorder,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark ? Colors.black.withValues(alpha: 0.30) : const Color(0x0A15265C),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: isDark ? 0.16 : 0.10),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: accentColor.withValues(alpha: isDark ? 0.35 : 0.25),
                width: 1,
              ),
            ),
            child: Icon(icon, color: accentColor, size: 16),
          ),
          const SizedBox(height: AppSpacing.s8),
          Text(
            title,
            style: GoogleFonts.poppins(
              color: textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 12,
              letterSpacing: -0.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: GoogleFonts.poppins(
              color: textSecondary,
              fontSize: 10.0,
              height: 1.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // ─── REUSABLE PILL CHIP ────────────────────────────────────────────────
  Widget _buildPillChip(
    IconData icon,
    String label,
    Color color,
    Color surfaceTint,
    Color borderColor,
    Color textColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: surfaceTint,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              style: GoogleFonts.poppins(
                color: textColor,
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
