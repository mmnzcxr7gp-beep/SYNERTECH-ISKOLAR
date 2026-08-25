import 'package:flutter/material.dart';

import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Standard High-Contrast Primary Button with Loading and Disabled States (Manus + React Bits Style)
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
        gradient: isClickable
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
              )
            : null,
        color: isClickable ? null : const Color(0xFF1A1620),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isClickable
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.white.withValues(alpha: 0.08),
          width: 1.2,
        ),
        boxShadow: isClickable
            ? [
                BoxShadow(
                  color: AppColors.primaryOrange.withValues(alpha: 0.40),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isClickable ? onPressed : null,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading) ...[
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.s8),
                ] else if (leftIcon != null) ...[
                  leftIcon!,
                  const SizedBox(width: AppSpacing.s8),
                ],
                Flexible(
                  child: Text(
                    text.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: isClickable ? Colors.white : Colors.white38,
                      fontSize: 13.0,
                      letterSpacing: 1.0,
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
