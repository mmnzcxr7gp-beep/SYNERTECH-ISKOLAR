import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';

/// Reusable premium styled text field for Material 3.
class StyledTextField extends StatelessWidget {
  const StyledTextField({
    super.key,
    this.label,
    this.hint,
    this.hintText,
    this.controller,
    this.onSaved,
    this.validator,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
    this.textInputAction,
    this.prefixIcon,
    this.suffixIcon,
    this.onSuffixTap,
    this.autovalidateMode,
    this.onChanged,
  });

  final String? label;
  final String? hint;
  final String? hintText;
  final TextEditingController? controller;
  final void Function(String?)? onSaved;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final TextInputAction? textInputAction;
  final Object? prefixIcon;
  final Object? suffixIcon;
  final VoidCallback? onSuffixTap;
  final AutovalidateMode? autovalidateMode;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      autovalidateMode: autovalidateMode,
      maxLines: maxLines,
      textInputAction: textInputAction,
      style: GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: isDark ? AppColors.darkTextPrimary : AppColors.primaryText,
        letterSpacing: 0.1,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w500,
          color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
        ),
        floatingLabelStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: isDark ? AppColors.darkPrimary : AppColors.actionBlue,
        ),
        hintText: hintText ?? hint,
        hintStyle: GoogleFonts.poppins(
          fontSize: 13,
          fontWeight: FontWeight.w400,
          color: isDark ? AppColors.darkTextSecondary.withValues(alpha: 0.6) : AppColors.textMuted,
        ),
        prefixIcon: _buildIcon(prefixIcon, isDark),
        suffixIcon: suffixIcon != null
            ? GestureDetector(
                onTap: onSuffixTap,
                child: _buildIcon(suffixIcon, isDark) ?? const SizedBox.shrink(),
              )
            : null,
        filled: true,
        fillColor: isDark ? AppColors.darkElevated : AppColors.cardSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.border,
            width: 1.0,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.border,
            width: 1.0,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: BorderSide(
            color: isDark ? AppColors.darkPrimary : AppColors.actionBlue,
            width: 1.8,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(
            color: AppColors.error,
            width: 1.5,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      onSaved: onSaved,
      validator: validator,
      onChanged: onChanged,
    );
  }

  Widget? _buildIcon(Object? icon, bool isDark) {
    if (icon == null) return null;
    final iconColor = isDark ? AppColors.darkPrimary : AppColors.actionBlue;
    if (icon is IconData) return Icon(icon, color: iconColor, size: 20);
    if (icon is Widget) return icon;
    return null;
  }
}
