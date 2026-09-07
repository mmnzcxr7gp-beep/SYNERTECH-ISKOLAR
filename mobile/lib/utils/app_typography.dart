import 'package:flutter/material.dart';
import 'app_colors.dart';

/// ISKOLAR Standardized Mobile Typography System (Fluent 2 & Apple HIG inspired)
/// - Clean native system sans-serif font
/// - Regular (400), Medium (500), Semibold (600), Bold (700)
/// - Exact mobile type scale supporting 200% text scaling and WCAG 2.2 AA contrast.
class AppTypography {
  // ---------------------------------------------------------------------------
  // RAW FONT FAMILY HELPERS
  // ---------------------------------------------------------------------------
  static String? get headingFontFamily => null; // Native clean system sans-serif
  static String? get bodyFontFamily => null;
  static String? get monoFontFamily => 'monospace';

  // ---------------------------------------------------------------------------
  // STANDARDIZED MOBILE TYPE SCALE
  // ---------------------------------------------------------------------------

  /// Mobile Screen Title: 28sp, Line Height 34sp, Semibold (600)
  static TextStyle screenTitle({Color? color}) {
    return TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w600,
      height: 34 / 28,
      letterSpacing: -0.4,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Mobile Section Title: 20sp, Line Height 26sp, Semibold (600)
  static TextStyle sectionTitle({Color? color}) {
    return TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 26 / 20,
      letterSpacing: -0.2,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Mobile Card Title: 17sp, Line Height 24sp, Semibold (600)
  static TextStyle cardTitle({Color? color}) {
    return TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      height: 24 / 17,
      letterSpacing: -0.1,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Mobile Body: 16sp, Line Height 24sp, Regular (400)
  static TextStyle body({Color? color}) {
    return TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 24 / 16,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Mobile Secondary Body: 14sp, Line Height 20sp, Regular (400)
  static TextStyle secondaryBody({Color? color}) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 20 / 14,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Mobile Label / Form Label: 14sp, Line Height 20sp, Medium (500)
  static TextStyle label({Color? color}) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      height: 20 / 14,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Mobile Caption: 12sp, Line Height 16sp, Regular (400)
  static TextStyle caption({Color? color}) {
    return TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      height: 16 / 12,
      color: color ?? AppColors.textMuted,
    );
  }

  // ---------------------------------------------------------------------------
  // COMPATIBILITY & HELPER ALIASES
  // ---------------------------------------------------------------------------

  /// Display: 34sp, Semibold (600)
  static TextStyle display({Color? color}) {
    return TextStyle(
      fontSize: 34,
      fontWeight: FontWeight.w600,
      height: 40 / 34,
      letterSpacing: -0.5,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// H1: 28sp, Semibold (600)
  static TextStyle h1({Color? color}) => screenTitle(color: color);

  /// H2: 20sp, Semibold (600)
  static TextStyle h2({Color? color}) => sectionTitle(color: color);

  /// H3: 17sp, Semibold (600)
  static TextStyle h3({Color? color}) => cardTitle(color: color);

  /// Body Large: 16sp, Regular (400)
  static TextStyle bodyLarge({Color? color}) => body(color: color);

  /// Secondary: 14sp, Regular (400)
  static TextStyle secondary({Color? color}) => secondaryBody(color: color);

  /// Form Label: 14sp, Semibold (600)
  static TextStyle formLabel({Color? color}) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Navigation Label: 12sp, Medium/Semibold (500/600)
  static TextStyle navLabel({Color? color, bool isSelected = false}) {
    return TextStyle(
      fontSize: 12,
      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
      height: 16 / 12,
      color: color ?? (isSelected ? AppColors.primaryOrange : AppColors.textMuted),
    );
  }

  /// Table Header: 14sp, Semibold (600)
  static TextStyle tableHeader({Color? color}) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Table Body: 14sp, Regular (400)
  static TextStyle tableBody({Color? color}) {
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 20 / 14,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Button: 15sp, Line Height 20sp, Semibold (600)
  static TextStyle button({Color? color}) {
    return TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      height: 20 / 15,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Form Input: 15sp, Regular (400)
  static TextStyle input({Color? color}) {
    return TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w400,
      height: 20 / 15,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Technical / Monospace for IDs and Timestamps
  static TextStyle technical({Color? color, double? fontSize}) {
    return TextStyle(
      fontFamily: 'monospace',
      fontSize: fontSize ?? 13,
      fontWeight: FontWeight.w400,
      height: 18 / 13,
      color: color ?? AppColors.textMuted,
    );
  }

  /// TextTheme Builder for Material 3 ThemeData
  static TextTheme textTheme({bool isDark = true}) {
    final textColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final secondaryColor = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final mutedColor = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return TextTheme(
      displayLarge: display(color: textColor),
      displayMedium: screenTitle(color: textColor),
      displaySmall: sectionTitle(color: textColor),
      headlineLarge: screenTitle(color: textColor),
      headlineMedium: sectionTitle(color: textColor),
      headlineSmall: cardTitle(color: textColor),
      titleLarge: cardTitle(color: textColor),
      titleMedium: label(color: textColor),
      titleSmall: label(color: secondaryColor),
      bodyLarge: body(color: secondaryColor),
      bodyMedium: secondaryBody(color: secondaryColor),
      bodySmall: caption(color: mutedColor),
      labelLarge: button(color: textColor),
      labelMedium: label(color: secondaryColor),
      labelSmall: caption(color: mutedColor),
    );
  }
}
