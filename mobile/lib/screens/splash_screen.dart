import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/sponsor_admin_notice_screen.dart';
import '../utils/app_colors.dart';
import '../widgets/iskolar_logo.dart';
import '../widgets/primary_button.dart';

/// Redesigned Startup & Splash Screen
/// Visual Requirements:
/// - ISKOLAR 2.0 logo
/// - Soft white-to-pale-blue background (#F7F9FD / #E8EDF7)
/// - Organic blue wave or curved gradient at the bottom
/// - Subtle blue floating shapes
/// - Tagline: "Scholarships made simpler."
/// - Small animated blue progress indicator
/// - Gentle logo fade and scale animation
/// - Real initialization: session restore, token validation, role routing, retry on network error
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _scaleAnimation;

  String _statusMessage = 'Initializing ISKOLAR…';
  bool _hasError = false;
  String? _errorMessage;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.0, 0.7, curve: Curves.easeOut),
    );

    _scaleAnimation = Tween<double>(begin: 0.90, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.8, curve: Curves.easeOutCubic),
      ),
    );

    _animController.forward();
    _initialize();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    if (_navigated) return;

    setState(() {
      _hasError = false;
      _errorMessage = null;
      _statusMessage = 'Restoring secure session…';
    });

    try {
      // 1. Check saved auth session
      final savedSession = await AuthService.getSavedAuthResponse();

      if (!mounted) return;

      if (savedSession == null) {
        // No prior session -> route to Onboarding
        _navigateTo(const OnboardingScreen());
        return;
      }

      setState(() {
        _statusMessage = 'Validating authentication…';
      });

      // 2. Validate session against backend /auth/me
      try {
        final profile = await AuthService.fetchProfile(savedSession.token);
        if (!mounted) return;

        setState(() {
          _statusMessage = 'Preparing workspace…';
        });

        // 3. Resolve role-based routing
        final role = profile.role.toLowerCase();
        if (role == 'student') {
          _navigateTo(StudentDashboardScreen(
            user: profile,
            token: savedSession.token,
          ));
        } else {
          // Sponsor / Admin redirected to mobile notice screen
          _navigateTo(SponsorAdminNoticeScreen(
            userRole: profile.role,
          ));
        }
      } catch (e) {
        debugPrint('[SplashScreen] Validation error: $e');
        // If 401 or authentication invalid, clear session and go to onboarding
        final errStr = e.toString().toLowerCase();
        if (errStr.contains('401') || errStr.contains('unauthorized') || errStr.contains('invalid token')) {
          await AuthService.logout();
          if (!mounted) return;
          _navigateTo(const OnboardingScreen());
        } else {
          // Network connection error / service unreachable -> show Retry button
          if (!mounted) return;
          setState(() {
            _hasError = true;
            _errorMessage = 'Unable to connect to the ISKOLAR service. Please verify your connection.';
          });
        }
      }
    } catch (e) {
      debugPrint('[SplashScreen] General init error: $e');
      if (!mounted) return;
      setState(() {
        _hasError = true;
        _errorMessage = 'Initialization error occurred. Tap Retry to reconnect.';
      });
    }
  }

  void _navigateTo(Widget destination) {
    if (_navigated || !mounted) return;
    final nav = Navigator.maybeOf(context);
    if (nav == null) return;
    _navigated = true;

    nav.pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 500),
        pageBuilder: (context, animation, secondaryAnimation) => destination,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            child: child,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.mainBackground,
      body: Stack(
        children: [
          // ─── 1. ORGANIC BLUE CURVED BACKGROUND ─────────────────────────────
          Positioned.fill(
            child: CustomPaint(
              painter: _SplashWavePainter(isDark: isDark),
            ),
          ),

          // ─── 2. FLOATING AMBIENT ORBS ──────────────────────────────────────
          Positioned(
            top: size.height * 0.12,
            right: -size.width * 0.15,
            child: Container(
              width: size.width * 0.6,
              height: size.width * 0.6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.skyBlue.withValues(alpha: isDark ? 0.08 : 0.12),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: size.height * 0.20,
            left: -size.width * 0.2,
            child: Container(
              width: size.width * 0.7,
              height: size.width * 0.7,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.actionBlue.withValues(alpha: isDark ? 0.06 : 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // ─── 3. CENTER CONTENT ─────────────────────────────────────────────
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 36),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: ScaleTransition(
                    scale: _scaleAnimation,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Spacer(flex: 3),

                        // Rounded Logo Container
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : AppColors.cardSurface,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.border,
                              width: 1.0,
                            ),
                            boxShadow: isDark
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.4),
                                      blurRadius: 30,
                                      offset: const Offset(0, 10),
                                    ),
                                  ]
                                : AppColors.modalShadow,
                          ),
                          child: const ISKOLARLogo(size: 80),
                        ),

                        const SizedBox(height: 28),

                        // Brand Title
                        Text(
                          'ISKOLAR',
                          style: GoogleFonts.poppins(
                            fontSize: 32,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 3.0,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Modern Tagline
                        Text(
                          'Scholarships made simpler.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                            letterSpacing: 0.2,
                          ),
                        ),

                        const Spacer(flex: 2),

                        // Loading Indicator & Status or Error Retry
                        if (!_hasError) ...[
                          // Small animated blue progress indicator
                          SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                isDark ? AppColors.darkPrimary : AppColors.actionBlue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _statusMessage,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textMuted,
                            ),
                          ),
                        ] else ...[
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.errorBg,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: AppColors.error.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Column(
                              children: [
                                Text(
                                  _errorMessage ?? 'Unable to connect to service.',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.error,
                                  ),
                                ),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: 140,
                                  child: PrimaryButton(
                                    text: 'Retry',
                                    onPressed: _initialize,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],

                        const Spacer(flex: 2),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Organic Blue Wave Painter for splash background
class _SplashWavePainter extends CustomPainter {
  const _SplashWavePainter({required this.isDark});

  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    if (isDark) {
      final rect = Rect.fromLTWH(0, 0, size.width, size.height);
      final paint = Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF0B1020),
            Color(0xFF101A30),
            Color(0xFF16213A),
          ],
        ).createShader(rect);
      canvas.drawRect(rect, paint);
      return;
    }

    // Bottom organic wave
    final path = Path();
    path.moveTo(0, size.height * 0.78);
    path.cubicTo(
      size.width * 0.25,
      size.height * 0.72,
      size.width * 0.65,
      size.height * 0.84,
      size.width,
      size.height * 0.76,
    );
    path.lineTo(size.width, size.height);
    path.lineTo(0, size.height);
    path.close();

    final paint = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFDFE6F2),
          Color(0xFFE8EDF7),
        ],
      ).createShader(Rect.fromLTWH(0, size.height * 0.70, size.width, size.height * 0.30));

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SplashWavePainter oldDelegate) {
    return oldDelegate.isDark != isDark;
  }
}
