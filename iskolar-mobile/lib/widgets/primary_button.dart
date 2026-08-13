import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Standard Primary Button using the custom color palette (Space Cadet & Antique Brass).
/// Height set to ergonomic 46px with high contrast typography.
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
      height: 46, // Proportional height (not oversized)
      width: double.infinity,
      decoration: BoxDecoration(
        color: isClickable ? AppColors.spaceCadet : AppColors.spaceCadet.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isClickable ? AppColors.antiqueBrass.withValues(alpha: 0.4) : Colors.transparent,
          width: 1,
        ),
        boxShadow: isClickable
            ? [
                BoxShadow(
                  color: AppColors.spaceCadet.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isClickable ? onPressed : null,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading) ...[
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.floralWhite),
                    ),
                  ),
                  const SizedBox(width: 10),
                ] else if (leftIcon != null) ...[
                  leftIcon!,
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: Text(
                    text.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.floralWhite,
                      fontSize: 13.5,
                      letterSpacing: 0.8,
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
