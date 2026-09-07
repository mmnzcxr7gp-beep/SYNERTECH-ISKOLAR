import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/verification_service.dart';
import '../utils/app_colors.dart';
import '../widgets/verification_badge.dart';
import '../widgets/verification_status_widget.dart';
import 'student_identity_verification_screen.dart';
import 'browse_scholarships_screen.dart';
import 'application_history_screen.dart';
import 'notifications_screen.dart';
import 'schedule_screen.dart';
import 'privacy_policy_screen.dart';

/// Ultra-Modern Student Home Screen (Manus + React Bits Style)
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.user,
    required this.token,
    this.onSelectTab,
  });

  final User user;
  final String token;
  final ValueChanged<int>? onSelectTab;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late User _currentUser;
  VerificationStatus? _verificationStatus;
  bool _loadingVerification = true;

  @override
  void initState() {
    super.initState();
    _currentUser = widget.user;
    _loadVerificationStatus();
    _refreshProfile();
  }

  Future<void> _loadVerificationStatus() async {
    try {
      final response = await VerificationService.getStudentVerificationStatus(
        token: widget.token,
      );
      if (mounted) {
        final parsed = VerificationStatus.fromJson(response);
        setState(() {
          _verificationStatus = parsed;
          _loadingVerification = false;
          if (parsed.isVerified || parsed.status.toLowerCase() == 'verified') {
            _currentUser = _currentUser.copyWith(
              studentVerified: true,
              verificationStatus: 'verified',
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingVerification = false);
      }
    }
  }

  Future<void> _refreshProfile() async {
    try {
      final user = await AuthService.fetchProfile(widget.token);
      if (mounted) {
        setState(() {
          _currentUser = user;
          if (user.isVerified) {
            _loadingVerification = false;
          }
        });
      }
    } catch (_) {}
  }

  void _navigateToVerification() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => StudentVerificationScreen(
          user: _currentUser,
          token: widget.token,
        ),
      ),
    ).then((_) {
      _refreshProfile();
      _loadVerificationStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final firstName = _currentUser.firstName.isNotEmpty
        ? _currentUser.firstName
        : _currentUser.name.split(' ').first;

    final verified = _currentUser.isVerified;
    final pending = _currentUser.isPendingVerification;

    return Scaffold(
      backgroundColor: const Color(0xFF0A090C), // Deep Obsidian Canvas
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: RefreshIndicator(
              onRefresh: () async {
                await _refreshProfile();
                await _loadVerificationStatus();
              },
              color: AppColors.primaryOrange,
              backgroundColor: const Color(0xFF161318),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ─── 1. TOP HEADER & NOTIFICATION BELL ──────────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: AppColors.primaryOrange.withValues(alpha: 0.35),
                                        blurRadius: 12,
                                      ),
                                    ],
                                  ),
                                  child: const Icon(Icons.school_rounded, color: Colors.white, size: 22),
                                ),
                                const SizedBox(width: 10),
                                const Flexible(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          'ISKOLAR',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 18,
                                            letterSpacing: 1.5,
                                          ),
                                        ),
                                      ),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          'Student Portal',
                                          style: TextStyle(
                                            color: Color(0xFFB4A9BE),
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                                  ),
                                  child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 20),
                                ),
                                Positioned(
                                  top: 6,
                                  right: 6,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: AppColors.primaryOrange,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => NotificationsScreen(token: widget.token),
                                ),
                              );
                            },
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // ─── 2. USER GREETING & PROFILE HERO CARD ────────────────────
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF141118),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x33000000),
                              blurRadius: 20,
                              offset: Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                if (_currentUser.profilePicture.isNotEmpty)
                                  Container(
                                    width: 60,
                                    height: 60,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      border: Border.all(color: AppColors.primaryOrange, width: 2),
                                    ),
                                    child: ClipOval(
                                      child: Image.network(
                                        '${_currentUser.profilePicture}?v=${DateTime.now().millisecondsSinceEpoch}',
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => _buildAvatarCircle(firstName),
                                      ),
                                    ),
                                  )
                                else
                                  _buildAvatarCircle(firstName),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Hello, $firstName',
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                          color: Colors.white,
                                          letterSpacing: 0.2,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _currentUser.email,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.white.withValues(alpha: 0.65),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 8),
                                      VerificationBadge(
                                        status: _currentUser.normalizedVerificationStatus,
                                        size: 'small',
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 18),
                            const Divider(color: Color(0x22FFFFFF), height: 1),
                            const SizedBox(height: 14),

                            // Quick Stats Metric Bar inside Card
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _buildMetricItem('PORTAL STATUS', verified ? 'VERIFIED' : 'PENDING', verified ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
                                Container(width: 1, height: 28, color: Colors.white12),
                                _buildMetricItem('OCR ENGINE', 'ACTIVE', const Color(0xFF3B82F6)),
                                Container(width: 1, height: 28, color: Colors.white12),
                                _buildMetricItem('ROLE', 'STUDENT', const Color(0xFFFF6D29)),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 22),

                      // ─── 3. VERIFICATION BANNER / CALLOUT ─────────────────────────
                      if (_loadingVerification)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF141118),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                          ),
                          child: const Row(
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primaryOrange)),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Syncing student verification credentials…',
                                  style: TextStyle(color: Color(0xFFB4A9BE), fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (_verificationStatus != null)
                        VerificationStatusBanner(
                          status: _verificationStatus!,
                          onVerifyPressed: _navigateToVerification,
                        )
                      else if (!verified && !pending)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.primaryOrange.withValues(alpha: 0.15),
                                const Color(0xFF1A1620),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.primaryOrange.withValues(alpha: 0.35)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 42,
                                height: 42,
                                decoration: BoxDecoration(
                                  color: AppColors.primaryOrange.withValues(alpha: 0.25),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.shield_outlined, color: AppColors.primaryOrange, size: 22),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Complete Identity Verification',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      'Upload Student ID & Form 137 to unlock grants',
                                      style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 12),
                                    ),
                                    const SizedBox(height: 8),
                                    GestureDetector(
                                      onTap: _navigateToVerification,
                                      child: const Text(
                                        'START VERIFICATION →',
                                        style: TextStyle(color: AppColors.primaryOrange, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 24),

                      // ─── 4. QUICK ACTIONS GRID (BENTO TILES) ──────────────────────
                      const Text(
                        'CORE WORKSPACE',
                        style: TextStyle(
                          color: Color(0xFF796E84),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.4,
                        ),
                      ),
                      const SizedBox(height: 14),

                      LayoutBuilder(
                        builder: (context, constraints) {
                          final columns = constraints.maxWidth > 500 ? 6 : 3;
                          return GridView.count(
                            crossAxisCount: columns,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 14,
                            childAspectRatio: 0.90,
                            children: [
                              _buildBentoActionTile(
                                icon: Icons.search_rounded,
                                label: 'Browse',
                                color: const Color(0xFFFF6D29),
                                onTap: () {
                                  if (widget.onSelectTab != null) {
                                    widget.onSelectTab!(1);
                                  } else {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => BrowseScholarshipsScreen(token: widget.token),
                                      ),
                                    );
                                  }
                                },
                              ),
                              _buildBentoActionTile(
                                icon: Icons.assignment_turned_in_rounded,
                                label: 'Applications',
                                color: const Color(0xFFFF8552),
                                onTap: () {
                                  if (widget.onSelectTab != null) {
                                    widget.onSelectTab!(2);
                                  } else {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => ApplicationHistoryScreen(token: widget.token),
                                      ),
                                    );
                                  }
                                },
                              ),
                              _buildBentoActionTile(
                                icon: Icons.calendar_month_rounded,
                                label: 'Schedule',
                                color: const Color(0xFF10B981),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ScheduleScreen(
                                        token: widget.token,
                                        currentUserId: _currentUser.id,
                                      ),
                                    ),
                                  );
                                },
                              ),
                              _buildBentoActionTile(
                                icon: Icons.verified_user_rounded,
                                label: 'Verification',
                                color: const Color(0xFF3B82F6),
                                onTap: _navigateToVerification,
                              ),
                              _buildBentoActionTile(
                                icon: Icons.notifications_active_rounded,
                                label: 'Alerts',
                                color: const Color(0xFFA855F7),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => NotificationsScreen(token: widget.token),
                                    ),
                                  );
                                },
                              ),
                              _buildBentoActionTile(
                                icon: Icons.privacy_tip_rounded,
                                label: 'Data Policy',
                                color: const Color(0xFF64748B),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => const PrivacyPolicyScreen(),
                                    ),
                                  );
                                },
                              ),
                            ],
                          );
                        },
                      ),

                      const SizedBox(height: 28),

                      // ─── 5. PLATFORM ECOSYSTEM SERVICES ─────────────────────────
                      const Text(
                        'CONNECTED SERVICES',
                        style: TextStyle(
                          color: Color(0xFF796E84),
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.4,
                        ),
                      ),
                      const SizedBox(height: 14),

                      Column(
                        children: [
                          _buildServiceCard(
                            icon: Icons.document_scanner_rounded,
                            accentColor: const Color(0xFFFF6D29),
                            title: 'Automated OCR Verification',
                            subtitle: 'Smart extraction of Student ID & Grades',
                            status: 'ONLINE',
                          ),
                          const SizedBox(height: 10),
                          _buildServiceCard(
                            icon: Icons.cloud_done_rounded,
                            accentColor: const Color(0xFF10B981),
                            title: 'Private Cloud Storage',
                            subtitle: 'End-to-end encrypted document repository',
                            status: 'SECURE',
                          ),
                          const SizedBox(height: 10),
                          _buildServiceCard(
                            icon: Icons.account_tree_rounded,
                            accentColor: const Color(0xFF3B82F6),
                            title: 'Sponsor Direct Matching',
                            subtitle: 'Real-time sync with provider workspaces',
                            status: 'ACTIVE',
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatarCircle(String firstName) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryOrange.withValues(alpha: 0.3),
            blurRadius: 10,
          ),
        ],
      ),
      child: Center(
        child: Text(
          firstName.isNotEmpty ? firstName[0].toUpperCase() : 'S',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, Color color) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              style: const TextStyle(color: Color(0xFF796E84), fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 0.8),
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 0.5),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBentoActionTile({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF141118),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1F000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.35), width: 1.2),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 6),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Color(0xFFFAF8FC),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCard({
    required IconData icon,
    required Color accentColor,
    required String title,
    required String subtitle,
    required String status,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF141118),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: accentColor.withValues(alpha: 0.3)),
            ),
            child: Icon(icon, color: accentColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(color: Color(0xFFB4A9BE), fontSize: 11.5),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: accentColor.withValues(alpha: 0.25)),
            ),
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                status,
                style: TextStyle(color: accentColor, fontSize: 10, fontWeight: FontWeight.w900),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
