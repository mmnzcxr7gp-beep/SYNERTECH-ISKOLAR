import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

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
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      autovalidateMode: autovalidateMode,
      maxLines: maxLines,
      textInputAction: textInputAction,
      style: const TextStyle(
        fontSize: 14.5,
        fontWeight: FontWeight.w600,
        color: AppColors.floralWhite,
        letterSpacing: 0.2,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary,
        ),
        floatingLabelStyle: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w800,
          color: AppColors.antiqueBrass,
        ),
        hintText: hintText ?? hint,
        hintStyle: const TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w500,
          color: AppColors.textSecondary,
        ),
        prefixIcon: _buildIcon(prefixIcon),
        suffixIcon: suffixIcon != null
            ? GestureDetector(
                onTap: onSuffixTap,
                child: _buildIcon(suffixIcon) ?? const SizedBox.shrink(),
              )
            : null,
      ),
      onSaved: onSaved,
      validator: validator,
      onChanged: onChanged,
    );
  }
}

Widget? _buildIcon(Object? icon) {
  if (icon == null) return null;
  if (icon is IconData) return Icon(icon, color: AppColors.antiqueBrass, size: 20);
  if (icon is Widget) return icon;
  return null;
}
