import 'dart:ui';
import 'package:flutter/material.dart';

import '../models/scholarship_model.dart';
import '../services/auth_service.dart';
import '../utils/app_typography.dart';
import 'application_upload_screen.dart';
import 'student_identity_verification_screen.dart';

/// Minimalist Apple-Style Liquid Glass Scholarship Detail Screen
class ScholarshipDetailScreen extends StatefulWidget {
  const ScholarshipDetailScreen({
    super.key,
    required this.scholarship,
    required this.token,
    required this.alreadyApplied,
  });

  final Scholarship scholarship;
  final String token;
  final bool alreadyApplied;

  @override
  State<ScholarshipDetailScreen> createState() => _ScholarshipDetailScreenState();
}

class _ScholarshipDetailScreenState extends State<ScholarshipDetailScreen> {
  late bool _applied;
  bool _isVerified = true;
  bool _isLoadingUser = true;

  @override
  void initState() {
    super.initState();
    _applied = widget.alreadyApplied;
    _loadUserVerification();
  }

  Future<void> _loadUserVerification() async {
    try {
      final user = await AuthService.getCurrentUser();
      if (mounted) {
        setState(() {
          _isVerified = user?.verificationStatus == 'verified';
          _isLoadingUser = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingUser = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scholarship = widget.scholarship;

    return Scaffold(
      backgroundColor: const Color(0xFF0D0B0F),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          'Scholarship Details',
          style: AppTypography.cardTitle(color: Colors.white),
        ),
      ),
      body: Stack(
        children: [
          // ─── AMBIENT BACKGROUND GRADIENT & GLOWS ─────────────────────────
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

          // Glowing Amber Orb
          Positioned(
            top: -40,
            right: -40,
            width: 240,
            height: 240,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFFF6D29).withValues(alpha: 0.28),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Glowing Violet Orb
          Positioned(
            bottom: 120,
            left: -50,
            width: 260,
            height: 260,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFF8B5CF6).withValues(alpha: 0.16),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Blur filter
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 45, sigmaY: 45),
              child: Container(color: Colors.transparent),
            ),
          ),

          // ─── MAIN CONTENT ─────────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 540),
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ─── 1. HEADER GLASS CARD ───────────────────────────────
                      _buildGlassContainer(
                        borderRadius: 26,
                        padding: const EdgeInsets.all(22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (scholarship.sponsorName.isNotEmpty) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFF6D29).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: const Color(0xFFFF6D29).withValues(alpha: 0.30),
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.verified_rounded,
                                      size: 13,
                                      color: Color(0xFFFF8552),
                                    ),
                                    const SizedBox(width: 5),
                                    Text(
                                      scholarship.sponsorName,
                                      style: const TextStyle(
                                        color: Color(0xFFFF8552),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.4,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 12),
                            ],

                            Text(
                              scholarship.title,
                              style: AppTypography.h3(color: Colors.white),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              scholarship.description,
                              style: AppTypography.secondary(
                                color: Colors.white.withValues(alpha: 0.72),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // ─── 2. METRICS STATS (SLOTS & DEADLINE) ────────────────
                      Row(
                        children: [
                          Expanded(
                            child: _buildMetricTile(
                              icon: Icons.group_outlined,
                              accentColor: const Color(0xFF38BDF8),
                              label: 'Available Slots',
                              value: '${scholarship.slots} Slots',
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildMetricTile(
                              icon: Icons.calendar_today_rounded,
                              accentColor: const Color(0xFFFF6D29),
                              label: 'Deadline',
                              value: scholarship.deadline.isNotEmpty ? scholarship.deadline : 'Open Intake',
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 18),

                      // ─── 3. REQUIREMENTS SECTION ────────────────────────────
                      _buildGlassContainer(
                        borderRadius: 26,
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFF6D29).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(
                                        Icons.description_outlined,
                                        size: 16,
                                        color: Color(0xFFFF8552),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Mandatory Requirements',
                                      style: AppTypography.cardTitle(color: Colors.white),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '${scholarship.requirements.length} Required',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.7),
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),

                            if (scholarship.requirements.isEmpty)
                              Padding(
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                child: Text(
                                  'No specific document requirements specified.',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.5),
                                    fontSize: 12,
                                  ),
                                ),
                              )
                            else
                              Column(
                                children: scholarship.requirements.asMap().entries.map((entry) {
                                  final idx = entry.key;
                                  final req = entry.value;
                                  final isLast = idx == scholarship.requirements.length - 1;

                                  return Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      border: isLast
                                          ? null
                                          : Border(
                                              bottom: BorderSide(
                                                color: Colors.white.withValues(alpha: 0.08),
                                                width: 1,
                                              ),
                                            ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 28,
                                          height: 28,
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.06),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(
                                              color: Colors.white.withValues(alpha: 0.12),
                                            ),
                                          ),
                                          child: Center(
                                            child: Text(
                                              '${idx + 1}',
                                              style: const TextStyle(
                                                color: Color(0xFFFF8552),
                                                fontSize: 11,
                                                fontWeight: FontWeight.w800,
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            req,
                                            style: AppTypography.secondary(
                                              color: Colors.white.withValues(alpha: 0.9),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // ─── 4. INSTRUCTION CALLOUT ──────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.10),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline_rounded,
                              size: 16,
                              color: Colors.white.withValues(alpha: 0.5),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'You will select and upload each required file in the intake review step.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.6),
                                  fontSize: 11.5,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // ─── 5. ACTION BUTTON ───────────────────────────────────
                      if (_applied)
                        Container(
                          width: double.infinity,
                          height: 52,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.14),
                            ),
                          ),
                          child: const Center(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
                                SizedBox(width: 8),
                                Text(
                                  'Application Already Submitted',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (!_isVerified && !_isLoadingUser)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Container(
                              width: double.infinity,
                              height: 52,
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFD97706), Color(0xFFF59E0B)],
                                ),
                                borderRadius: BorderRadius.circular(16),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFFD97706).withValues(alpha: 0.35),
                                    blurRadius: 16,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(16),
                                  onTap: () async {
                                    final currentUser = await AuthService.getCurrentUser();
                                    if (currentUser != null && mounted) {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => StudentVerificationScreen(
                                            user: currentUser,
                                            token: widget.token,
                                          ),
                                        ),
                                      );
                                    }
                                  },
                                  child: const Center(
                                    child: Text(
                                      'Verify Identity To Apply',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 13,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Center(
                              child: Text(
                                'Identity verification is required before scholarship submission.',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.5),
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        )
                      else
                        Container(
                          width: double.infinity,
                          height: 52,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
                            ),
                            borderRadius: BorderRadius.circular(16),
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
                              borderRadius: BorderRadius.circular(16),
                              onTap: () async {
                                final result = await Navigator.of(context).push<bool>(
                                  MaterialPageRoute(
                                    builder: (_) => ApplicationUploadScreen(
                                      scholarshipId: int.tryParse(scholarship.id.toString()) ?? 0,
                                      scholarshipTitle: scholarship.title,
                                      token: widget.token,
                                      requirements: scholarship.requirements,
                                    ),
                                  ),
                                );

                                if (result == true && mounted) {
                                  setState(() => _applied = true);
                                }
                              },
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'UPLOAD REQUIREMENTS',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                                ],
                              ),
                            ),
                          ),
                        ),

                      const SizedBox(height: 20),
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

  // ─── REUSABLE FROSTED GLASS CONTAINER ───────────────────────────────────
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
                Colors.white.withValues(alpha: 0.08),
                Colors.white.withValues(alpha: 0.03),
              ],
            ),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.14),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.22),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }

  // ─── REUSABLE METRIC STAT CARD ──────────────────────────────────────────
  Widget _buildMetricTile({
    required IconData icon,
    required Color accentColor,
    required String label,
    required String value,
  }) {
    return _buildGlassContainer(
      borderRadius: 20,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: accentColor),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.55),
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: AppTypography.button(color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
