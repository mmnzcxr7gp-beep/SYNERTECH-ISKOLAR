import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/onboarding_screen.dart';
import '../utils/app_colors.dart';
import '../widgets/iskolar_logo.dart';

/// Ultra-Modern Manus & Shader-Gradient Inspired Loading Screen
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final AnimationController _rotateController;
  late final AnimationController _progressController;

  late final Animation<double> _pulseAnimation;
  late final Animation<double> _glowAnimation;
  late final Animation<double> _progressAnimation;

  int _loadingStepIndex = 0;
  final List<String> _loadingSteps = [
    'Connecting to Secure Gateway…',
    'Initializing OCR Document Engine…',
    'Syncing Verified Scholarship Grants…',
    'Launching ISKOLAR Workspace…',
  ];

  Timer? _stepTimer;

  @override
  void initState() {
    super.initState();

    // 1. Gentle breathing pulse for the logo & aura
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOutSine),
    );

    _glowAnimation = Tween<double>(begin: 0.35, end: 0.85).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOutSine),
    );

    // 2. Slow continuous rotation for the outer shader halo rings
    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    // 3. Smooth progress bar progression
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2600),
    )..forward();

    _progressAnimation = CurvedAnimation(
      parent: _progressController,
      curve: Curves.easeInOutCubic,
    );

    // Step message cycle
    _stepTimer = Timer.periodic(const Duration(milliseconds: 650), (timer) {
      if (!mounted) return;
      if (_loadingStepIndex < _loadingSteps.length - 1) {
        setState(() {
          _loadingStepIndex++;
        });
      }
    });

    _start();
  }

  @override
  void dispose() {
    _stepTimer?.cancel();
    _pulseController.dispose();
    _rotateController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    // Await minimum presentation duration for aesthetic delight
    await Future<void>.delayed(const Duration(milliseconds: 2800));
    final savedSession = await AuthService.getSavedAuthResponse();
    if (!mounted) return;

    Widget destination = const OnboardingScreen();
    if (savedSession != null) {
      try {
        final profile = await AuthService.fetchProfile(savedSession.token);
        if (!mounted) return;
        destination = StudentDashboardScreen(
          user: profile,
          token: savedSession.token,
        );
      } catch (_) {
        await AuthService.logout();
        destination = const OnboardingScreen();
      }
    }

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 650),
        pageBuilder: (context, animation, secondaryAnimation) => destination,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.98, end: 1.0).animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
              ),
              child: child,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09080B), // True obsidian black
      body: Stack(
        children: [
          // ─── 1. DYNAMIC SHADER MESH GRADIENT BACKGROUND ──────────────────────
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _rotateController,
              builder: (context, child) {
                return CustomPaint(
                  painter: _ShaderGradientPainter(
                    rotation: _rotateController.value * 2 * math.pi,
                    glowIntensity: _glowAnimation.value,
                  ),
                );
              },
            ),
          ),

          // ─── 2. MAIN CENTERPIECE & TYPOGRAPHY ───────────────────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top Minimalist Capsule
                  Align(
                    alignment: Alignment.topCenter,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: AppColors.primaryOrange,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'ISKOLAR v2.0 • ACADEMIC ECOSYSTEM',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.7),
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Center Glowing Emblem & Title
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Rotating Shader Halo around Logo
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          // Outer rotating dash ring
                          AnimatedBuilder(
                            animation: _rotateController,
                            builder: (context, child) {
                              return Transform.rotate(
                                angle: _rotateController.value * 2 * math.pi,
                                child: Container(
                                  width: 170,
                                  height: 170,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppColors.primaryOrange.withValues(alpha: 0.25),
                                      width: 1.5,
                                      strokeAlign: BorderSide.strokeAlignOutside,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),

                          // Inner counter-rotating glow ring
                          AnimatedBuilder(
                            animation: _rotateController,
                            builder: (context, child) {
                              return Transform.rotate(
                                angle: -_rotateController.value * 2 * math.pi,
                                child: Container(
                                  width: 145,
                                  height: 145,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: SweepGradient(
                                      colors: [
                                        AppColors.primaryOrange.withValues(alpha: 0.6),
                                        Colors.transparent,
                                        const Color(0xFFFF8552).withValues(alpha: 0.4),
                                        Colors.transparent,
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),

                          // Ambient radial glow behind emblem
                          AnimatedBuilder(
                            animation: _glowAnimation,
                            builder: (context, child) {
                              return Container(
                                width: 130,
                                height: 130,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primaryOrange.withValues(alpha: _glowAnimation.value * 0.4),
                                      blurRadius: 50,
                                      spreadRadius: 10,
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),

                          // Scaled ISKOLAR Logo Emblem
                          ScaleTransition(
                            scale: _pulseAnimation,
                            child: Container(
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: const Color(0xFF131017),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.18),
                                  width: 1.5,
                                ),
                              ),
                              child: const ISKOLARLogo(size: 76),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 32),

                      // Brand Headline (Manus Style)
                      const Text(
                        'ISKOLAR',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 4.0,
                        ),
                      ),

                      const SizedBox(height: 6),

                      Text(
                        'Scholarship Success, Refined',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.65),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),

                  // Bottom Modern Progress Bar & Status Feed
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Shimmering Gradient Progress Capsule
                      Container(
                        width: 220,
                        height: 6,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: AnimatedBuilder(
                          animation: _progressAnimation,
                          builder: (context, child) {
                            return FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: _progressAnimation.value,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFFFF6D29),
                                      Color(0xFFFF9466),
                                      Color(0xFFFFFFFF),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(999),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primaryOrange.withValues(alpha: 0.6),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Dynamic Step Status Text with animated switcher
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        child: Text(
                          _loadingSteps[_loadingStepIndex],
                          key: ValueKey<int>(_loadingStepIndex),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),

                      const SizedBox(height: 8),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom Shader Mesh Painter for dynamic fluid ambient background
class _ShaderGradientPainter extends CustomPainter {
  _ShaderGradientPainter({
    required this.rotation,
    required this.glowIntensity,
  });

  final double rotation;
  final double glowIntensity;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    // Orb 1: Top-Right Amber Fluid Glow
    final orb1Center = Offset(
      center.dx + math.cos(rotation) * 80,
      center.dy * 0.45 + math.sin(rotation) * 50,
    );
    final paint1 = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFFF6D29).withValues(alpha: 0.28 * glowIntensity),
          const Color(0xFFFF8552).withValues(alpha: 0.10 * glowIntensity),
          Colors.transparent,
        ],
        stops: const [0.0, 0.45, 1.0],
      ).createShader(Rect.fromCircle(center: orb1Center, radius: 180));
    canvas.drawCircle(orb1Center, 180, paint1);

    // Orb 2: Bottom-Left Deep Violet/Warm Ember Fluid Glow
    final orb2Center = Offset(
      center.dx * 0.4 + math.sin(rotation * 0.8) * 60,
      center.dy * 1.4 + math.cos(rotation * 0.8) * 60,
    );
    final paint2 = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFC9470F).withValues(alpha: 0.22 * glowIntensity),
          const Color(0xFF8B5CF6).withValues(alpha: 0.08 * glowIntensity),
          Colors.transparent,
        ],
        stops: const [0.0, 0.5, 1.0],
      ).createShader(Rect.fromCircle(center: orb2Center, radius: 220));
    canvas.drawCircle(orb2Center, 220, paint2);
  }

  @override
  bool shouldRepaint(covariant _ShaderGradientPainter oldDelegate) {
    return oldDelegate.rotation != rotation ||
        oldDelegate.glowIntensity != glowIntensity;
  }
}
