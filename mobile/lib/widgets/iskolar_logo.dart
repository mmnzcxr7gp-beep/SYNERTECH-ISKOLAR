import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Authoritative ISKOLAR brand logo widget using the official brand emblem.
class ISKOLARLogo extends StatelessWidget {
  const ISKOLARLogo({super.key, this.size = 64});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(size * 0.22),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.12),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        'assets/logo.png',
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) {
          return Center(
            child: Icon(
              Icons.school_outlined,
              color: AppColors.primary,
              size: size * 0.5,
            ),
          );
        },
      ),
    );
  }
}

