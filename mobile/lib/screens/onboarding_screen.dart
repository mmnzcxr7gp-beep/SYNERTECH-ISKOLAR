import 'dart:ui';
import 'package:flutter/material.dart';

import '../screens/login_screen.dart';
import '../screens/register_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Ultra-Modern Apple-Inspired Liquid Glass Onboarding Screen with Multi-Scale Support
class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D0B0F),
      body: Stack(
        children: [
          // ─── 1. AMBIENT MESH GRADIENT BACKGROUND ───────────────────────────
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0F0C12),
                    Color(0xFF160F16),
                    Color(0xFF1A1215),
                    Color(0xFF0D0B0F),
                  ],
                ),
              ),
            ),
          ),

          // Top-Right Glowing Amber/Orange Orb
          Positioned(
            top: -60,
            right: -60,
            width: 260,
            height: 260,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFFF6D29).withValues(alpha: 0.35),
                    const Color(0xFFFF8552).withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Center-Left Subtle Purple/Violet Orb
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
                    const Color(0xFF8B5CF6).withValues(alpha: 0.20),
                    const Color(0xFF6366F1).withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Bottom-Right Deep Warm Ember Orb
          Positioned(
            bottom: 60,
            right: -40,
            width: 240,
            height: 240,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFFF6D29).withValues(alpha: 0.25),
                    const Color(0xFF453027).withValues(alpha: 0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Ambient Blur Filter Layer
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
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
                      // ─── A. TOP GLASS NAVIGATION BAR ─────────────────────────
                      _buildGlassContainer(
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
                                  colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
                                ),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFF6D29).withValues(alpha: 0.4),
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
                                  const Text(
                                    'ISKOLAR',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 16,
                                      letterSpacing: 1.2,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    'Scholarship Portal',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.6),
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

                            // Frosted Glass Sign In Pill Button
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
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: Colors.white.withValues(alpha: 0.18),
                                      width: 1,
                                    ),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Sign In',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 12,
                                        ),
                                      ),
                                      SizedBox(width: 4),
                                      Icon(
                                        Icons.arrow_forward_ios_rounded,
                                        color: AppColors.primaryOrange,
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

                      // ─── B. APPLE-STYLE HERO GLASS SHOWCASE ───────────────────
                      _buildGlassContainer(
                        borderRadius: 28,
                        padding: const EdgeInsets.all(AppSpacing.s24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Live Status Pill Badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFF6D29).withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFFF6D29).withValues(alpha: 0.30),
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
                                      color: Color(0xFFFF6D29),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Color(0xFFFF6D29),
                                          blurRadius: 6,
                                          spreadRadius: 1,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Flexible(
                                    child: Text(
                                      'ACADEMIC SCHOLARSHIP PLATFORM',
                                      style: TextStyle(
                                        color: Color(0xFFFF8552),
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
                            const Text(
                              'Find Scholarships.\nBuild Your Future.',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                height: 1.15,
                                letterSpacing: -0.5,
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s12),

                            // Sub-headline
                            Text(
                              'Browse verified grant programs, apply with automated OCR document intake, and track your application status in real-time.',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.72),
                                fontSize: 13,
                                height: 1.45,
                                fontWeight: FontWeight.w400,
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s16),

                            // Trust / Highlight Chips
                            Wrap(
                              spacing: AppSpacing.s8,
                              runSpacing: AppSpacing.s8,
                              children: [
                                _buildPillChip(Icons.verified_rounded, 'Verified Grants', const Color(0xFF10B981)),
                                _buildPillChip(Icons.bolt_rounded, 'AI OCR Intake', const Color(0xFF38BDF8)),
                                _buildPillChip(Icons.security_rounded, 'Official Portal', const Color(0xFFA78BFA)),
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
                            const Expanded(
                              child: Text(
                                'PLATFORM CAPABILITIES',
                                style: TextStyle(
                                  color: Colors.white,
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
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.45),
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.s12),

                      // ─── D. 2x2 APPLE-STYLE GLASS BENTO TILES ─────────────────
                      Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: _buildGlassBentoCard(
                                  icon: Icons.verified_user_rounded,
                                  accentColor: const Color(0xFF10B981),
                                  title: 'Verified Sponsors',
                                  subtitle: 'Official providers',
                                ),
                              ),
                              const SizedBox(width: AppSpacing.s12),
                              Expanded(
                                child: _buildGlassBentoCard(
                                  icon: Icons.document_scanner_rounded,
                                  accentColor: const Color(0xFF38BDF8),
                                  title: 'OCR Verification',
                                  subtitle: 'Fast ID extraction',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.s12),
                          Row(
                            children: [
                              Expanded(
                                child: _buildGlassBentoCard(
                                  icon: Icons.radar_rounded,
                                  accentColor: const Color(0xFFFF6D29),
                                  title: 'Live Tracking',
                                  subtitle: 'Real-time updates',
                                ),
                              ),
                              const SizedBox(width: AppSpacing.s12),
                              Expanded(
                                child: _buildGlassBentoCard(
                                  icon: Icons.auto_awesome_rounded,
                                  accentColor: const Color(0xFFA78BFA),
                                  title: 'Merit Ranking',
                                  subtitle: 'Criteria scoring',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: AppSpacing.s24),

                      // ─── E. FLOATING GLASS ACTION DOCK ────────────────────────
                      _buildGlassContainer(
                        borderRadius: AppSpacing.radiusPanel,
                        padding: const EdgeInsets.all(AppSpacing.s16),
                        child: Column(
                          children: [
                            // Primary Apple-style Glow Button
                            Container(
                              width: double.infinity,
                              height: AppSpacing.buttonHeight,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
                                ),
                                borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFFF6D29).withValues(alpha: 0.40),
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
                                  child: const Padding(
                                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.s12),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          child: Text(
                                            'CREATE STUDENT ACCOUNT',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                              fontSize: 12.5,
                                              letterSpacing: 0.6,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        SizedBox(width: 6),
                                        Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),

                            const SizedBox(height: AppSpacing.s12),

                            // Secondary Frosted Glass Button
                            Container(
                              width: double.infinity,
                              height: 48,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.16),
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
                                        style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.9),
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
                                Icon(Icons.lock_outline_rounded, size: 11, color: Colors.white.withValues(alpha: 0.4)),
                                const SizedBox(width: 5),
                                Flexible(
                                  child: Text(
                                    'Encrypted & Student-Centered Platform',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.45),
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

  // ─── REUSABLE APPLE-STYLE GLASS CARD HELPER ─────────────────────────────
  Widget _buildGlassContainer({
    required Widget child,
    required double borderRadius,
    EdgeInsetsGeometry? padding,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white.withValues(alpha: 0.09),
                Colors.white.withValues(alpha: 0.04),
              ],
            ),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.16),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }

  // ─── REUSABLE BENTO GLASS TILE ──────────────────────────────────────────
  Widget _buildGlassBentoCard({
    required IconData icon,
    required Color accentColor,
    required String title,
    required String subtitle,
  }) {
    return _buildGlassContainer(
      borderRadius: AppSpacing.radiusCard,
      padding: const EdgeInsets.all(AppSpacing.s12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: accentColor.withValues(alpha: 0.35),
                width: 1,
              ),
            ),
            child: Icon(icon, color: accentColor, size: 16),
          ),
          const SizedBox(height: AppSpacing.s8),
          Text(
            title,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 12,
              letterSpacing: -0.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.55),
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
  Widget _buildPillChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.85),
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
