import 'package:flutter/material.dart';

/// ISKOLAR Manus & React Bits Minimal High-Contrast Design System Colors
class AppColors {
  /// Core Brand Palette
  static const Color primaryOrange = Color(0xFFFF6D29);
  static const Color orangeHighlight = Color(0xFFFF8552);
  static const Color orangeDarkAction = Color(0xFFFF8552);
  static const Color orangeLightAction = Color(0xFFC9470F);
  static const Color deepBrown = Color(0xFF241C1A);
  static const Color brownSurface = Color(0xFF241C1A);
  static const Color nearBlack = Color(0xFF0A090C); // Deep Obsidian
  static const Color warmBlack = Color(0xFF141118);
  static const Color pureWhite = Color(0xFFFFFFFF);

  /// Status & Feedback (Accessible WCAG AA)
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color error = Color(0xFFEF4444);
  static const Color information = Color(0xFF3B82F6);

  /// Structural Theme Mappings (Dark Mode)
  static const Color primary = Color(0xFFFF6D29);
  static const Color accent = Color(0xFFFF8552);
  static const Color background = Color(0xFF0A090C);
  static const Color backgroundDark = Color(0xFF0A090C);
  static const Color backgroundLight = Color(0xFFF8F6F4);
  static const Color elevatedBackground = Color(0xFF141118);
  static const Color darkPanel = Color(0xFF1A1620);
  static const Color panelDark = Color(0xFF1A1620);
  static const Color panelLight = Color(0xFFF0EAE5);
  static const Color surface = Color(0xFF141118);
  static const Color surfaceDark = Color(0xFF141118);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color glassSurface = Color(0x18FFFFFF); // ~9% white
  static const Color strongGlassSurface = Color(0x28FFFFFF); // ~16% white

  /// Structural Theme Mappings (Light Mode)
  static const Color lightBackground = Color(0xFFF8F6F4);
  static const Color lightElevatedBackground = Color(0xFFFFFFFF);
  static const Color lightPanel = Color(0xFFF0EAE5);
  static const Color softOrangeSurface = Color(0xFFFFF2EC);
  static const Color lightBorder = Color(0xFFE5DDD8);
  static const Color lightFocus = Color(0xFFFF6D29);

  /// Text Hierarchy (Dark Mode)
  static const Color textPrimary = Color(0xFFFAF8FC);
  static const Color textPrimaryDark = Color(0xFFFAF8FC);
  static const Color textSecondary = Color(0xFFB4A9BE);
  static const Color textSecondaryDark = Color(0xFFB4A9BE);
  static const Color textMuted = Color(0xFF796E84);
  static const Color textMutedDark = Color(0xFF796E84);

  /// Text Hierarchy (Light Mode)
  static const Color lightTextPrimary = Color(0xFF151118);
  static const Color textPrimaryLight = Color(0xFF151118);
  static const Color lightTextSecondary = Color(0xFF524755);
  static const Color textSecondaryLight = Color(0xFF524755);
  static const Color lightTextMuted = Color(0xFF827586);
  static const Color textMutedLight = Color(0xFF827586);

  /// Borders
  static const Color border = Color(0x1FFFFFFF); // rgba(255,255,255,0.12)
  static const Color borderDark = Color(0x1FFFFFFF);
  static const Color borderLight = Color(0xFFE5DDD8);
  static const Color strongBorder = Color(0x38FFFFFF); // rgba(255,255,255,0.22)

  /// Legacy Palette Aliases
  static const Color antiqueBrass = Color(0xFFFF6D29);
  static const Color floralWhite = Color(0xFFF8F6F4);
  static const Color spaceCadet = Color(0xFF0A090C);
  static const Color oxfordBlue = Color(0xFF0A090C);
  static const Color desertSand = Color(0xFFFF8552);
  static const Color primary2 = Color(0xFFFF8552);

  /// Gradients
  static const LinearGradient liquidHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF09080B),
      Color(0xFF141118),
      Color(0xFF241C1A),
      Color(0xFF09080B),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  static const LinearGradient lightHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFF8F6F4),
      Color(0xFFF0EAE5),
      Color(0xFFFFF2EC),
      Color(0xFFF8F6F4),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
  );

  static const LinearGradient glassGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x1AFFFFFF), Color(0x0AFFFFFF)],
  );
}
