import 'package:flutter/material.dart';

/// ISKOLAR Premium Minimal Liquid Glass System Colors
class AppColors {
  /// Core Palette
  static const Color primaryOrange = Color(0xFFFF6D29);
  static const Color orangeHighlight = Color(0xFFFF8A4D);
  static const Color deepBrown = Color(0xFF453027);
  static const Color nearBlack = Color(0xFF161316);
  static const Color warmBlack = Color(0xFF221711);
  static const Color neutralGray = Color(0xFFBABABA);
  static const Color pureWhite = Color(0xFFFFFFFF);

  /// Supporting Colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color error = Color(0xFFEF4444);
  static const Color information = Color(0xFF3B82F6);

  /// Legacy Palette Aliases (Mapped to Liquid Glass Theme Tokens)
  static const Color antiqueBrass = Color(0xFFFF6D29);
  static const Color floralWhite = Color(0xFFFFFFFF);
  static const Color spaceCadet = Color(0xFFFF6D29);
  static const Color oxfordBlue = Color(0xFF161316);
  static const Color desertSand = Color(0xFFFF8A4D);
  static const Color primary2 = Color(0xFFFF8A4D);

  /// Structural Theme Mappings (Dark Mode Defaults)
  static const Color primary = Color(0xFFFF6D29);
  static const Color accent = Color(0xFFFF8A4D);
  static const Color background = Color(0xFF161316);
  static const Color elevatedBackground = Color(0xFF211A18);
  static const Color surface = Color(0xFF211A18);
  static const Color glassSurface = Color(0x0FFFFFFF);
  static const Color strongGlassSurface = Color(0x17FFFFFF);

  /// Light Mode Surfaces
  static const Color lightBackground = Color(0xFFFAF7F5);
  static const Color lightElevatedBackground = Color(0xFFFFFFFF);
  static const Color softOrangeSurface = Color(0xFFFFF1E9);
  static const Color lightBorder = Color(0xFFE9DDD7);

  /// Text Hierarchy (Dark Mode)
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFD6D0CD);
  static const Color textMuted = Color(0xFFBABABA);

  /// Text Hierarchy (Light Mode)
  static const Color lightTextPrimary = Color(0xFF201714);
  static const Color lightTextSecondary = Color(0xFF665A55);
  static const Color lightTextMuted = Color(0xFF847872);

  /// Borders
  static const Color border = Color(0x1AFFFFFF);
  static const Color strongBorder = Color(0x29FFFFFF);

  /// Gradients
  static const LinearGradient liquidHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF161316),
      Color(0xFF221711),
      Color(0xFF453027),
      Color(0xFF161316),
    ],
    stops: [0.0, 0.25, 0.65, 1.0],
  );

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF6D29), Color(0xFFFF8A4D)],
  );

  static const LinearGradient glassGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x0FFFFFFF), Color(0x08FFFFFF)],
  );
}
