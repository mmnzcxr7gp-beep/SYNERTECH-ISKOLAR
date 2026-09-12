import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

/// Glassmorphism premium card widget (Manus.im + React Bits inspired)
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.gradient = false,
  });

  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final bool gradient;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? AppColors.darkSurface
                : AppColors.cardSurface,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkBorder
                  : AppColors.border,
              width: 1.0,
            ),
            boxShadow: Theme.of(context).brightness == Brightness.dark
                ? const [
                    BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 18,
                      offset: Offset(0, 6),
                    ),
                  ]
                : AppColors.cardShadow,
          ),
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}

/// Premium gradient card for highlight sections
class GradientGlassCard extends StatelessWidget {
  const GradientGlassCard({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
  });

  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.skyBlue, AppColors.actionBlue, AppColors.primaryBlue],
            ),
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.25),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.actionBlue.withValues(alpha: 0.35),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}
