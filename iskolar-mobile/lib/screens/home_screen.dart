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

/// Student home screen featuring top hero header, status card, overlapping
/// content sheet, circular quick-action grid, and status list tiles.
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
  }

  Future<void> _loadVerificationStatus() async {
    try {
      final response = await VerificationService.getStudentVerificationStatus(
        token: widget.token,
      );
      if (mounted) {
        setState(() {
          _verificationStatus = VerificationStatus.fromJson(response);
          _loadingVerification = false;
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
        setState(() => _currentUser = user);
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
      backgroundColor: const Color(0xFF0F172A), // Dark Navy Top Header
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: SingleChildScrollView(
              child: Column(
            children: [
              // ─── TOP HERO BANNER (REF SCREEN #3) ─────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  children: [
                    // Navigation Top Bar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.school_rounded, color: AppColors.primary, size: 28),
                            SizedBox(width: 8),
                            Text(
                              'ISKOLAR',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 20,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 26),
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

                    // User Profile Hero Card
                    Row(
                      children: [
                        if (_currentUser.profilePicture.isNotEmpty)
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.primary, width: 2),
                            ),
                            child: ClipOval(
                              child: Image.network(
                                '${_currentUser.profilePicture}?v=${DateTime.now().millisecondsSinceEpoch}',
                                key: ValueKey(_currentUser.profilePicture),
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
                                'WELCOME, ${firstName.toUpperCase()}',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _currentUser.email,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.white.withValues(alpha: 0.7),
                                ),
                              ),
                              const SizedBox(height: 6),
                              VerificationBadge(
                                status: _currentUser.normalizedVerificationStatus,
                                size: 'small',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Overview Balance / Status Metric Card (Ref Screen #3)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildHeaderMetric('ACCOUNT', verified ? 'VERIFIED' : 'PENDING'),
                          Container(width: 1, height: 32, color: Colors.white24),
                          _buildHeaderMetric('ROLE', _currentUser.role.toUpperCase()),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // ─── MAIN CONTENT SHEET (REF SCREEN LAYOUT OVERLAP) ─────────────
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Verification Status Widget Banner
                    if (_loadingVerification)
                      Container(
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Row(
                          children: [
                            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(width: 12),
                            Text('Checking verification status...', style: TextStyle(color: AppColors.textSecondary)),
                          ],
                        ),
                      )
                    else if (_verificationStatus != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: VerificationStatusBanner(
                          status: _verificationStatus!,
                          onVerifyPressed: _navigateToVerification,
                        ),
                      )
                    else if (!verified && !pending)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              backgroundColor: AppColors.primary,
                              radius: 20,
                              child: Icon(Icons.shield_outlined, color: Colors.white, size: 20),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Complete Student Verification',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 2),
                                  const Text(
                                    'Upload IDs & Student Documents to apply',
                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                  ),
                                  const SizedBox(height: 6),
                                  GestureDetector(
                                    onTap: _navigateToVerification,
                                    child: const Text(
                                      'VERIFY NOW →',
                                      style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                    // ─── QUICK ACTIONS GRID (REF SCREEN #9) ───────────────────
                    const Text(
                      'QUICK ACTIONS',
                      style: TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // 3x2 Grid of Colored Circular Feature Badges (Ref Screen #9)
                    GridView.count(
                      crossAxisCount: 3,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 18,
                      childAspectRatio: 0.85,
                      children: [
                        _buildCircularFeatureItem(
                          icon: Icons.search_rounded,
                          color: const Color(0xFF06B6D4), // Cyan
                          label: 'Browse',
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
                        _buildCircularFeatureItem(
                          icon: Icons.assignment_turned_in_rounded,
                          color: const Color(0xFF10B981), // Emerald
                          label: 'Applications',
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
                        _buildCircularFeatureItem(
                          icon: Icons.verified_user_rounded,
                          color: const Color(0xFFF59E0B), // Amber
                          label: 'Verify ID',
                          onTap: _navigateToVerification,
                        ),
                        _buildCircularFeatureItem(
                          icon: Icons.event_note_rounded,
                          color: const Color(0xFF8B5CF6), // Violet
                          label: 'Schedules',
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
                        _buildCircularFeatureItem(
                          icon: Icons.notifications_rounded,
                          color: const Color(0xFFF43F5E), // Rose
                          label: 'Notifications',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => NotificationsScreen(token: widget.token),
                              ),
                            );
                          },
                        ),
                        _buildCircularFeatureItem(
                          icon: Icons.privacy_tip_rounded,
                          color: const Color(0xFF6366F1), // Indigo
                          label: 'Privacy Policy',
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const PrivacyPolicyScreen(),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // ─── RECENT SYSTEM SERVICES (REF SCREEN #3 & #8 LIST) ─────
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'SYSTEM SERVICES',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    _buildServiceListTile(
                      icon: Icons.document_scanner_rounded,
                      iconBg: const Color(0xFF0284C7),
                      title: 'OCR Encoding Service',
                      subtitle: 'Extract text from Student ID & Form 137',
                      status: 'Active',
                    ),
                    const SizedBox(height: 10),
                    _buildServiceListTile(
                      icon: Icons.lock_person_rounded,
                      iconBg: const Color(0xFF7C3AED),
                      title: 'MFA Security Authentication',
                      subtitle: 'Multi-factor login email verification',
                      status: 'Enabled',
                    ),
                    const SizedBox(height: 10),
                    _buildServiceListTile(
                      icon: Icons.assessment_rounded,
                      iconBg: const Color(0xFF059669),
                      title: 'Deterministic Ranking System',
                      subtitle: 'Server-side weighted scoring & tie handling',
                      status: 'Active',
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  ),
);
}

  Widget _buildAvatarCircle(String name) {
    final initials = name.split(' ').where((e) => e.isNotEmpty).map((e) => e[0]).join().toUpperCase();
    return Container(
      width: 64,
      height: 64,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: AppColors.primaryGradient,
      ),
      child: Center(
        child: Text(
          initials.isNotEmpty ? initials : 'U',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22),
        ),
      ),
    );
  }

  Widget _buildHeaderMetric(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 11, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900),
        ),
      ],
    );
  }

  Widget _buildCircularFeatureItem({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              shape: BoxShape.circle,
              border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildServiceListTile({
    required IconData icon,
    required Color iconBg,
    required String title,
    required String subtitle,
    required String status,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: iconBg.withValues(alpha: 0.2),
            radius: 22,
            child: Icon(icon, color: iconBg, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: iconBg.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              status,
              style: TextStyle(color: iconBg, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
