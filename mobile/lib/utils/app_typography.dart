import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// ISKOLAR Standardized Mobile Typography System
/// - Uses GoogleFonts.poppins
/// - Locked Mobile Scale:
///   * Display: 28px / 34px, weight 700
///   * Page Title: 24px / 30px, weight 700
///   * Section Title: 20px / 26px, weight 600
///   * Card Title: 16px / 22px, weight 600
///   * Body: 14px / 21px, weight 400
///   * Button: 14px / 20px, weight 600
///   * Caption: 12px / 16px, weight 400 or 500
class AppTypography {
  // ---------------------------------------------------------------------------
  // LOCKED MOBILE TYPE SCALE (POPPINS)
  // ---------------------------------------------------------------------------

  /// Mobile Display: 28px, Line Height 34px, Bold (700)
  static TextStyle display({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      height: 34 / 28,
      letterSpacing: -0.4,
      color: color ?? AppColors.primaryText,
    );
  }

  /// Mobile Page Title: 24px, Line Height 30px, Bold (700)
  static TextStyle screenTitle({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      height: 30 / 24,
      letterSpacing: -0.3,
      color: color ?? AppColors.primaryNavy,
    );
  }

  /// Mobile Section Title: 20px, Line Height 26px, Semi-bold (600)
  static TextStyle sectionTitle({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      height: 26 / 20,
      letterSpacing: -0.2,
      color: color ?? AppColors.primaryNavy,
    );
  }

  /// Mobile Card Title: 16px, Line Height 22px, Semi-bold (600)
  static TextStyle cardTitle({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      height: 22 / 16,
      letterSpacing: -0.1,
      color: color ?? AppColors.primaryNavy,
    );
  }

  /// Mobile Body: 14px, Line Height 21px, Regular (400)
  static TextStyle body({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 21 / 14,
      color: color ?? AppColors.secondaryText,
    );
  }

  /// Mobile Secondary Body: 14px, Line Height 20px, Regular (400)
  static TextStyle secondaryBody({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 20 / 14,
      color: color ?? AppColors.secondaryText,
    );
  }

  /// Mobile Button: 14px, Line Height 20px, Semi-bold (600)
  static TextStyle button({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile Caption: 12px, Line Height 16px, Medium (500)
  static TextStyle caption({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 12,
      fontWeight: FontWeight.w500,
      height: 16 / 12,
      color: color ?? AppColors.textMuted,
    );
  }

  /// Mobile Label / Form Label: 14px, Line Height 20px, Semi-bold (600)
  static TextStyle label({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      color: color ?? AppColors.primaryText,
    );
  }

  // ---------------------------------------------------------------------------
  // COMPATIBILITY & HELPER ALIASES
  // ---------------------------------------------------------------------------

  static TextStyle h1({Color? color}) => screenTitle(color: color);
  static TextStyle h2({Color? color}) => sectionTitle(color: color);
  static TextStyle h3({Color? color}) => cardTitle(color: color);
  static TextStyle bodyLarge({Color? color}) => body(color: color);
  static TextStyle secondary({Color? color}) => secondaryBody(color: color);
  static TextStyle formLabel({Color? color}) => label(color: color);

  static TextStyle navLabel({Color? color, bool isSelected = false}) {
    return GoogleFonts.poppins(
      fontSize: 11,
      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
      height: 14 / 11,
      color: color ?? (isSelected ? AppColors.actionBlue : AppColors.secondaryText),
    );
  }

  static TextStyle tableHeader({Color? color}) => cardTitle(color: color);
  static TextStyle tableBody({Color? color}) => body(color: color);

  static TextStyle input({Color? color}) {
    return GoogleFonts.poppins(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 20 / 14,
      color: color ?? AppColors.primaryText,
    );
  }

  static TextStyle technical({Color? color, double? fontSize}) {
    return TextStyle(
      fontFamily: 'monospace',
      fontSize: fontSize ?? 13,
      fontWeight: FontWeight.w400,
      height: 18 / 13,
      color: color ?? AppColors.textMuted,
    );
  }

  // ---------------------------------------------------------------------------
  // TEXT THEME BUILDER FOR MATERIAL 3 THEMEDATA
  // ---------------------------------------------------------------------------
  static TextTheme textTheme({bool isDark = false}) {
    final titleColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final bodyColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;
    final mutedColor = isDark ? AppColors.darkTextSecondary : AppColors.textMuted;

    return TextTheme(
      displayLarge: display(color: titleColor),
      displayMedium: screenTitle(color: titleColor),
      displaySmall: sectionTitle(color: titleColor),
      headlineLarge: screenTitle(color: titleColor),
      headlineMedium: sectionTitle(color: titleColor),
      headlineSmall: cardTitle(color: titleColor),
      titleLarge: cardTitle(color: titleColor),
      titleMedium: label(color: titleColor),
      titleSmall: label(color: bodyColor),
      bodyLarge: body(color: bodyColor),
      bodyMedium: secondaryBody(color: bodyColor),
      bodySmall: caption(color: mutedColor),
      labelLarge: button(color: AppColors.pureWhite),
      labelMedium: label(color: bodyColor),
      labelSmall: caption(color: mutedColor),
    );
  }
}
