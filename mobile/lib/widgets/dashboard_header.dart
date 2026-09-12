import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../utils/app_typography.dart';

/// Warm near-black glassmorphism dashboard header.
class DashboardHeader extends StatelessWidget {
  const DashboardHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        child: Stack(
          children: [
            // Warm black base
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: AppColors.liquidHeroGradient,
                ),
              ),
            ),
            // Subtle blue accent glow
            Positioned(
              top: -80,
              left: -80,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  color: AppColors.actionBlue.withAlpha(35),
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Positioned(
              bottom: -100,
              right: -100,
              child: Container(
                width: 220,
                height: 220,
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy.withAlpha(28),
                  shape: BoxShape.circle,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome Back!',
                          style: AppTypography.h2(color: Colors.white),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Here’s your dashboard overview',
                          style: AppTypography.secondary(color: AppColors.textSecondaryDark),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(18),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: Colors.white.withAlpha(30),
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.dashboard_customize_rounded,
                      color: AppColors.actionBlue,
                      size: 32,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
