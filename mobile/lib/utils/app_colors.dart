import 'package:flutter/material.dart';

/// ISKOLAR Enterprise Design System Colors (Inspired by Fluent 2 & Apple HIG)
class AppColors {
  /// Core Brand Palette
  static const Color primaryOrange = Color(0xFFE85D04);
  static const Color primaryHover = Color(0xFFC94E00);
  static const Color primarySoft = Color(0xFFFFF1E8);
  static const Color primaryFocus = Color(0xFFF97316);
  static const Color orangeHighlight = Color(0xFFF97316);
  static const Color orangeDarkAction = Color(0xFFC94E00);
  static const Color orangeLightAction = Color(0xFFE85D04);
  static const Color pureWhite = Color(0xFFFFFFFF);

  /// Status & Feedback (Accessible WCAG 2.2 AA)
  static const Color success = Color(0xFF16A34A);
  static const Color successBg = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFD97706);
  static const Color warningBg = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFDC2626);
  static const Color dangerBg = Color(0xFFFEE2E2);
  static const Color error = Color(0xFFDC2626);
  static const Color information = Color(0xFF2563EB);
  static const Color infoBg = Color(0xFFDBEAFE);
  static const Color neutral = Color(0xFF4B5563);
  static const Color neutralBg = Color(0xFFF3F4F6);

  /// Structural Theme Mappings (Dark Mode)
  static const Color primary = Color(0xFFE85D04);
  static const Color accent = Color(0xFFF97316);
  static const Color background = Color(0xFF111315);
  static const Color backgroundDark = Color(0xFF111315);
  static const Color elevatedBackground = Color(0xFF22262A);
  static const Color darkPanel = Color(0xFF191C1F);
  static const Color panelDark = Color(0xFF191C1F);
  static const Color surface = Color(0xFF191C1F);
  static const Color surfaceDark = Color(0xFF191C1F);
  static const Color glassSurface = Color(0x18FFFFFF);
  static const Color strongGlassSurface = Color(0x28FFFFFF);

  /// Structural Theme Mappings (Light Mode)
  static const Color backgroundLight = Color(0xFFF7F8FA);
  static const Color lightBackground = Color(0xFFF7F8FA);
  static const Color lightElevatedBackground = Color(0xFFFFFFFF);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color panelLight = Color(0xFFFFFFFF);
  static const Color lightPanel = Color(0xFFFFFFFF);
  static const Color softOrangeSurface = Color(0xFFFFF1E8);
  static const Color lightBorder = Color(0xFFDDE1E6);
  static const Color lightFocus = Color(0xFFF97316);

  /// Text Hierarchy (Dark Mode)
  static const Color textPrimary = Color(0xFFF5F6F7);
  static const Color textPrimaryDark = Color(0xFFF5F6F7);
  static const Color textSecondary = Color(0xFFC3C8CE);
  static const Color textSecondaryDark = Color(0xFFC3C8CE);
  static const Color textMuted = Color(0xFF969DA6);
  static const Color textMutedDark = Color(0xFF969DA6);

  /// Text Hierarchy (Light Mode)
  static const Color lightTextPrimary = Color(0xFF171A1F);
  static const Color textPrimaryLight = Color(0xFF171A1F);
  static const Color lightTextSecondary = Color(0xFF5F6670);
  static const Color textSecondaryLight = Color(0xFF5F6670);
  static const Color lightTextMuted = Color(0xFF747C87);
  static const Color textMutedLight = Color(0xFF747C87);

  /// Borders
  static const Color border = Color(0xFF343A40);
  static const Color borderDark = Color(0xFF343A40);
  static const Color borderLight = Color(0xFFDDE1E6);
  static const Color strongBorder = Color(0xFF4A5159);
  static const Color strongBorderLight = Color(0xFFC5CBD3);

  /// Legacy Aliases for seamless component compatibility
  static const Color antiqueBrass = Color(0xFFE85D04);
  static const Color floralWhite = Color(0xFFF7F8FA);
  static const Color spaceCadet = Color(0xFF111315);
  static const Color oxfordBlue = Color(0xFF111315);
  static const Color desertSand = Color(0xFFF97316);
  static const Color primary2 = Color(0xFFF97316);
  static const Color deepBrown = Color(0xFF191C1F);
  static const Color brownSurface = Color(0xFF191C1F);
  static const Color nearBlack = Color(0xFF111315);
  static const Color warmBlack = Color(0xFF191C1F);

  /// Subtle Gradients
  static const LinearGradient liquidHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF111315),
      Color(0xFF191C1F),
      Color(0xFF22262A),
      Color(0xFF111315),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  static const LinearGradient lightHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF7F8FA),
      Color(0xFFFFFFFF),
      Color(0xFFFFF1E8),
      Color(0xFFF7F8FA),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );
}
