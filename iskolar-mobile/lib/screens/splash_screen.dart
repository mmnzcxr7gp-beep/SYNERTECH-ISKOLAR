import 'dart:async';

import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/onboarding_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_constants.dart';
import '../widgets/iskolar_logo.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animationController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );

    _start();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    await Future<void>.delayed(AppConstants.splashDuration);
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
        transitionDuration: AppConstants.transitionDuration,
        pageBuilder: (context, animation, secondaryAnimation) => destination,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
            child: child,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF02070F), Color(0xFF0E1942)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 52),
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ScaleTransition(
                        scale: _pulseAnimation,
                        child: const ISKOLARLogo(size: 96),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'ISKOLAR',
                        style: Theme.of(context).textTheme.displaySmall?.copyWith(
                              color: Colors.white,
                              letterSpacing: 1.8,
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Scholarship Success, Refined',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                      ),
                      const SizedBox(height: 30),
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              AppColors.primary.withValues(alpha: 0.35),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 42, vertical: 32),
                child: Column(
                  children: [
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      backgroundColor: Color(0x22FFFFFF),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Preparing your premium scholarship experience',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: AppColors.textSecondary,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

