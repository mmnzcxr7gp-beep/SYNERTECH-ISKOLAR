import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Simple ISKOLAR logo built using Flutter widgets (no external assets needed).
class ISKOLARLogo extends StatelessWidget {
  const ISKOLARLogo({super.key, this.size = 64});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(size * 0.28),
            ),
          ),
          Container(
            width: size * 0.72,
            height: size * 0.72,
            decoration: const BoxDecoration(
              color: Color.fromRGBO(255, 255, 255, 0.18),
              shape: BoxShape.circle,
            ),
          ),
          Icon(
            Icons.school,
            color: Colors.white,
            size: size * 0.42,
          ),
        ],
      ),
    );
  }
}

