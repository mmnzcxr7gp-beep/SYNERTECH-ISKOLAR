import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Standard High-Contrast Primary Button with Loading and Disabled States
/// Styled with locked ISKOLAR primary gradient, 14px radius, and 48px touch target.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    String? label,
    required this.onPressed,
    String? text,
    this.isLoading = false,
    this.leftIcon,
    this.disabled = false,
  }) : text = text ?? label ?? '';

  const PrimaryButton.text({
    super.key,
    required this.text,
    required this.onPressed,
    this.isLoading = false,
    this.leftIcon,
    this.disabled = false,
  });

  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final Widget? leftIcon;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    final isClickable = !disabled && !isLoading && onPressed != null;

    return Container(
      height: AppSpacing.buttonHeight,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: isClickable ? AppColors.primaryGradient : null,
        color: isClickable ? null : const Color(0xFFDFE6F2),
        borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
        border: Border.all(
          color: isClickable
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.transparent,
          width: 1.0,
        ),
        boxShadow: isClickable
            ? [
                BoxShadow(
                  color: AppColors.actionBlue.withValues(alpha: 0.28),
                  blurRadius: 16,
                  offset: const Offset(0, 5),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isClickable ? onPressed : null,
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading) ...[
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s12),
                ] else if (leftIcon != null) ...[
                  leftIcon!,
                  const SizedBox(width: AppSpacing.s8),
                ],
                Flexible(
                  child: Text(
                    text,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.poppins(
                      fontWeight: FontWeight.w600,
                      color: isClickable ? Colors.white : AppColors.secondaryText,
                      fontSize: 14.0,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
