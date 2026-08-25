import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// ISKOLAR Unified Mobile Typography System
/// Primary: Manrope (Headings, buttons, navigation, controls)
/// Secondary: Source Sans 3 (Body, forms, descriptions, metadata)
/// Technical: IBM Plex Mono (IDs, audit refs, hashes, OCR values)
class AppTypography {
  // ---------------------------------------------------------------------------
  // RAW FONT FAMILY HELPERS
  // ---------------------------------------------------------------------------
  static String? get headingFontFamily => GoogleFonts.manrope().fontFamily;
  static String? get bodyFontFamily => GoogleFonts.sourceSans3().fontFamily;
  static String? get monoFontFamily => GoogleFonts.ibmPlexMono().fontFamily;

  // ---------------------------------------------------------------------------
  // SEMANTIC HEADINGS (Manrope)
  // ---------------------------------------------------------------------------

  /// Mobile Display: 36sp, Weight 800 (ExtraBold), Line Height 42sp
  static TextStyle display({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 36,
      fontWeight: FontWeight.w800,
      height: 42 / 36,
      letterSpacing: -0.5,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile H1 / Page Title: 30sp, Weight 700 (Bold), Line Height 38sp
  static TextStyle h1({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 30,
      fontWeight: FontWeight.w700,
      height: 38 / 30,
      letterSpacing: -0.3,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile H2 / Section Title: 26sp, Weight 700 (Bold), Line Height 34sp
  static TextStyle h2({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      height: 34 / 26,
      letterSpacing: -0.2,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile H3 / Subsection Title: 22sp, Weight 600 (SemiBold), Line Height 30sp
  static TextStyle h3({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      height: 30 / 22,
      letterSpacing: -0.1,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile Card Title: 18sp, Weight 600 (SemiBold), Line Height 24sp
  static TextStyle cardTitle({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      height: 24 / 18,
      color: color ?? AppColors.pureWhite,
    );
  }

  // ---------------------------------------------------------------------------
  // SEMANTIC BODY & METADATA (Source Sans 3)
  // ---------------------------------------------------------------------------

  /// Mobile Body Large: 18sp, Weight 400 (Regular), Line Height 26sp
  static TextStyle bodyLarge({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 18,
      fontWeight: FontWeight.w400,
      height: 26 / 18,
      color: color ?? AppColors.textPrimary,
    );
  }

  /// Mobile Body: 16sp, Weight 400 (Regular), Line Height 24sp
  static TextStyle body({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 24 / 16,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Mobile Secondary: 14sp, Weight 400 (Regular), Line Height 20sp
  static TextStyle secondary({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      height: 20 / 14,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Mobile Caption: 12–13sp, Weight 400 (Regular), Line Height 18sp
  static TextStyle caption({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      height: 18 / 13,
      color: color ?? AppColors.textMuted,
    );
  }

  // ---------------------------------------------------------------------------
  // CONTROLS & FORMS
  // ---------------------------------------------------------------------------

  /// Mobile Button: 15–16sp, Weight 600 (SemiBold), Line Height 20–22sp (Manrope)
  static TextStyle button({Color? color}) {
    return GoogleFonts.manrope(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      height: 22 / 15,
      letterSpacing: -0.1,
      color: color ?? AppColors.pureWhite,
    );
  }

  /// Mobile Navigation Label: 12–13sp, Weight 500 (Medium), Line Height 16–18sp (Manrope)
  static TextStyle navLabel({Color? color, bool isSelected = false}) {
    return GoogleFonts.manrope(
      fontSize: 12,
      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
      height: 16 / 12,
      color: color ?? (isSelected ? AppColors.primaryOrange : AppColors.textMuted),
    );
  }

  /// Form Label: 14sp, Weight 600 (SemiBold), Line Height 20sp (Source Sans 3)
  static TextStyle formLabel({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      height: 20 / 14,
      color: color ?? AppColors.textSecondary,
    );
  }

  /// Form Input: 16sp, Weight 400 (Regular), Line Height 24sp (Source Sans 3)
  static TextStyle formInput({Color? color}) {
    return GoogleFonts.sourceSans3(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      height: 24 / 16,
      color: color ?? AppColors.textPrimary,
    );
  }

  // ---------------------------------------------------------------------------
  // TECHNICAL & MONOSPACE (IBM Plex Mono)
  // ---------------------------------------------------------------------------

  /// Technical reference, audit IDs, file hashes, OCR confidence values
  static TextStyle technical({double fontSize = 13, FontWeight fontWeight = FontWeight.w500, Color? color}) {
    return GoogleFonts.ibmPlexMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: 18 / fontSize,
      letterSpacing: -0.2,
      color: color ?? AppColors.textSecondary,
    );
  }

  // ---------------------------------------------------------------------------
  // TEXT THEME GENERATOR
  // ---------------------------------------------------------------------------

  static TextTheme textTheme({required bool isDark}) {
    final headingColor = isDark ? AppColors.pureWhite : AppColors.lightTextPrimary;
    final primaryBodyColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final secondaryBodyColor = isDark ? AppColors.textSecondary : AppColors.lightTextSecondary;
    final mutedColor = isDark ? AppColors.textMuted : AppColors.lightTextMuted;

    return TextTheme(
      // Headings (Manrope)
      displayLarge: display(color: headingColor),
      displayMedium: h1(color: headingColor),
      displaySmall: h2(color: headingColor),
      headlineLarge: h1(color: headingColor),
      headlineMedium: h2(color: headingColor),
      headlineSmall: h3(color: headingColor),
      titleLarge: h3(color: headingColor),
      titleMedium: cardTitle(color: headingColor),
      titleSmall: GoogleFonts.manrope(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: headingColor,
      ),

      // Body & Content (Source Sans 3)
      bodyLarge: bodyLarge(color: primaryBodyColor),
      bodyMedium: body(color: secondaryBodyColor),
      bodySmall: secondary(color: mutedColor),

      // Labels & Buttons
      labelLarge: button(color: AppColors.pureWhite),
      labelMedium: formLabel(color: secondaryBodyColor),
      labelSmall: caption(color: mutedColor),
    );
  }
}
