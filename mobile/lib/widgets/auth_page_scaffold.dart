import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Shared scaffold for auth pages (Login/Register/OTP/MFA).
///
/// Implements the locked visual direction:
/// - White rounded authentication card (18px radius)
/// - Soft blue curved background (#F7F9FD) with organic blue curves (#4F96FF / #305BFE)
/// - Primary Navy headers (#15265C)
/// - Responsive SingleChildScrollView for keyboard insets & 320px–600px widths
class AuthPageScaffold extends StatelessWidget {
  const AuthPageScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.card,
    this.appBar,
    this.roleLabel,
  });

  final String title;
  final String subtitle;
  final Widget card;
  final PreferredSizeWidget? appBar;
  final String? roleLabel;

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.mainBackground,
      extendBodyBehindAppBar: true,
      appBar: appBar != null
          ? AppBar(
              toolbarHeight: appBar!.preferredSize.height,
              backgroundColor: Colors.transparent,
              elevation: 0,
              scrolledUnderElevation: 0,
              flexibleSpace: appBar,
            )
          : AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              scrolledUnderElevation: 0,
              centerTitle: false,
              iconTheme: IconThemeData(
                color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
              ),
            ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final minHeight = mq.size.height;

          return Stack(
            children: [
              // 1. Organic blue curved background
              Positioned.fill(
                child: CustomPaint(
                  painter: OrganicBlueCurvesPainter(isDark: isDark),
                ),
              ),

              // 2. Centered content with scroll protection
              SafeArea(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: minHeight),
                  child: SingleChildScrollView(
                    physics: const ClampingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: minHeight - mq.padding.top - mq.padding.bottom - 32,
                      ),
                      child: IntrinsicHeight(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 12),
                            // Header Title
                            Text(
                              title,
                              style: GoogleFonts.poppins(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                height: 32 / 26,
                                letterSpacing: -0.4,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Subtitle
                            Text(
                              roleLabel != null
                                  ? subtitle.replaceAll('{role}', roleLabel!)
                                  : subtitle,
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                height: 19 / 13,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                              ),
                            ),
                            const SizedBox(height: 24),

                            // White rounded card centered
                            Expanded(
                              child: Center(
                                child: Container(
                                  width: double.infinity,
                                  constraints: const BoxConstraints(maxWidth: 480),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.darkSurface : AppColors.cardSurface,
                                    borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
                                    border: Border.all(
                                      color: isDark ? AppColors.darkBorder : AppColors.border,
                                      width: 1.0,
                                    ),
                                    boxShadow: isDark
                                        ? [
                                            BoxShadow(
                                              color: Colors.black.withValues(alpha: 0.35),
                                              blurRadius: 24,
                                              offset: const Offset(0, 8),
                                            ),
                                          ]
                                        : AppColors.cardShadow,
                                  ),
                                  padding: const EdgeInsets.all(22),
                                  child: card,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Custom Painter that creates smooth organic blue background curves
class OrganicBlueCurvesPainter extends CustomPainter {
  const OrganicBlueCurvesPainter({required this.isDark});

  final bool isDark;

  @override
  void paint(Canvas canvas, Size size) {
    if (isDark) {
      // Dark mode subtle ambient blue glow
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [
            AppColors.darkPrimary.withValues(alpha: 0.12),
            AppColors.actionBlue.withValues(alpha: 0.05),
            Colors.transparent,
          ],
          stops: const [0.0, 0.5, 1.0],
        ).createShader(Rect.fromCircle(center: Offset(size.width * 0.8, size.height * 0.15), radius: size.width * 0.7));
      canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
      return;
    }

    // Light mode organic soft blue curves
    final path1 = Path();
    path1.moveTo(0, size.height * 0.35);
    path1.cubicTo(
      size.width * 0.4,
      size.height * 0.25,
      size.width * 0.7,
      size.height * 0.45,
      size.width,
      size.height * 0.30,
    );
    path1.lineTo(size.width, 0);
    path1.lineTo(0, 0);
    path1.close();

    final paint1 = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color(0xFFE8EDF7),
          Color(0xFFF7F9FD),
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height * 0.45));

    canvas.drawPath(path1, paint1);

    // Decorative floating soft blue circle
    final orbPaint = Paint()
      ..color = const Color(0xFF4F96FF).withValues(alpha: 0.08);
    canvas.drawCircle(Offset(size.width * 0.88, size.height * 0.12), 70, orbPaint);

    final blushPaint = Paint()
      ..color = const Color(0xFFEAB9B3).withValues(alpha: 0.12);
    canvas.drawCircle(Offset(size.width * 0.1, size.height * 0.22), 45, blushPaint);
  }

  @override
  bool shouldRepaint(covariant OrganicBlueCurvesPainter oldDelegate) {
    return oldDelegate.isDark != isDark;
  }
}
