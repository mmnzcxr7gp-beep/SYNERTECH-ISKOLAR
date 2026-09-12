import 'package:flutter/material.dart';

/// ISKOLAR Locked Design System Colors
/// Visual Direction:
/// - Navy headers (#15265C)
/// - Royal-blue actions (#305DE0 / #305BFE)
/// - Soft light-blue backgrounds (#F7F9FD / #E8EDF7)
/// - White rounded cards (#FFFFFF)
/// - Organic blue background curves
/// - Modern geometric typography (Poppins)
/// - WCAG AA accessible contrast
class AppColors {
  // ─── LOCKED CORE PALETTE ──────────────────────────────────────────────────
  static const Color primaryNavy = Color(0xFF15265C);
  static const Color primaryBlue = Color(0xFF305DE0);
  static const Color actionBlue = Color(0xFF305BFE);
  static const Color skyBlue = Color(0xFF4F96FF);
  static const Color paleBlue = Color(0xFFDFE6F2);
  static const Color lightBlueSurface = Color(0xFFE8EDF7);
  static const Color mainBackground = Color(0xFFF7F9FD);
  static const Color cardSurface = Color(0xFFFFFFFF);
  static const Color primaryText = Color(0xFF172033);
  static const Color secondaryText = Color(0xFF68758A);
  static const Color border = Color(0xFFDCE5F2);
  static const Color softBlushAccent = Color(0xFFEAB9B3);
  static const Color pureWhite = Color(0xFFFFFFFF);

  // ─── STATUS & FEEDBACK ────────────────────────────────────────────────────
  static const Color success = Color(0xFF1F8A5B);
  static const Color successBg = Color(0xFFE8F5EF);
  static const Color warning = Color(0xFFC57A05);
  static const Color warningBg = Color(0xFFFEF7EC);
  static const Color error = Color(0xFFC33E4D);
  static const Color errorBg = Color(0xFFFDECEE);
  static const Color danger = Color(0xFFC33E4D);
  static const Color dangerBg = Color(0xFFFDECEE);
  static const Color information = Color(0xFF2E67D1);
  static const Color infoBg = Color(0xFFEAF1FC);
  static const Color neutral = Color(0xFF68758A);
  static const Color neutralBg = Color(0xFFF1F4F9);

  // ─── DARK THEME MAPPINGS ─────────────────────────────────────────────────
  static const Color darkBackground = Color(0xFF0B1020);
  static const Color darkNavigation = Color(0xFF101A30);
  static const Color darkSurface = Color(0xFF16213A);
  static const Color darkElevated = Color(0xFF1C2946);
  static const Color darkPrimary = Color(0xFF4F96FF);
  static const Color darkTextPrimary = Color(0xFFF7FAFF);
  static const Color darkTextSecondary = Color(0xFFAFC0D8);
  static const Color darkBorder = Color(0xFF293957);

  // ─── COMPATIBILITY ALIASES (Preserves all existing component calls) ────────
  static const Color primary = actionBlue;
  static const Color accent = skyBlue;
  static const Color primaryOrange = actionBlue;
  static const Color primaryHover = primaryBlue;
  static const Color primarySoft = lightBlueSurface;
  static const Color primaryFocus = actionBlue;
  static const Color orangeHighlight = skyBlue;
  static const Color orangeDarkAction = primaryNavy;
  static const Color orangeLightAction = actionBlue;
  static const Color softOrangeSurface = lightBlueSurface;
  static const Color lightSurface = lightBlueSurface;

  // Structural light mode aliases
  static const Color backgroundLight = mainBackground;
  static const Color lightBackground = mainBackground;
  static const Color lightElevatedBackground = cardSurface;
  static const Color surfaceLight = cardSurface;
  static const Color panelLight = cardSurface;
  static const Color lightPanel = cardSurface;
  static const Color lightBorder = border;
  static const Color lightFocus = actionBlue;

  // Structural dark mode aliases
  static const Color background = darkBackground;
  static const Color backgroundDark = darkBackground;
  static const Color elevatedBackground = darkElevated;
  static const Color darkPanel = darkSurface;
  static const Color panelDark = darkSurface;
  static const Color surface = darkSurface;
  static const Color surfaceDark = darkSurface;
  static const Color borderDark = darkBorder;
  static const Color borderLight = border;
  static const Color strongBorder = darkBorder;
  static const Color strongBorderLight = Color(0xFFC5CBD3);

  // Text aliases (Matching AppColors.background and surface)
  static const Color textPrimary = darkTextPrimary;
  static const Color textPrimaryLight = primaryText;
  static const Color lightTextPrimary = primaryText;
  static const Color textPrimaryDark = darkTextPrimary;

  static const Color textSecondary = darkTextSecondary;
  static const Color textSecondaryLight = secondaryText;
  static const Color lightTextSecondary = secondaryText;
  static const Color textSecondaryDark = darkTextSecondary;

  static const Color textMuted = darkTextSecondary;
  static const Color textMutedLight = Color(0xFF8896AB);
  static const Color lightTextMuted = Color(0xFF8896AB);
  static const Color textMutedDark = darkTextSecondary;

  // Legacy color name compatibility
  static const Color antiqueBrass = actionBlue;
  static const Color floralWhite = mainBackground;
  static const Color spaceCadet = primaryNavy;
  static const Color oxfordBlue = primaryNavy;
  static const Color desertSand = paleBlue;
  static const Color primary2 = skyBlue;
  static const Color deepBrown = primaryNavy;
  static const Color brownSurface = cardSurface;
  static const Color nearBlack = primaryNavy;
  static const Color warmBlack = primaryNavy;

  static const Color glassSurface = Color(0x18FFFFFF);
  static const Color strongGlassSurface = Color(0x28FFFFFF);

  // ─── BRAND GRADIENTS ──────────────────────────────────────────────────────
  /// Locked primary brand gradient: linear-gradient(135deg, #4F96FF 0%, #305BFE 55%, #305DE0 100%)
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF4F96FF),
      Color(0xFF305BFE),
      Color(0xFF305DE0),
    ],
    stops: [0.0, 0.55, 1.0],
  );

  /// Header Navy Gradient
  static const LinearGradient headerNavyGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF15265C),
      Color(0xFF1D357F),
    ],
  );

  /// Soft light surface organic curve gradient
  static const LinearGradient lightHeroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0xFFFFFFFF),
      Color(0xFFF7F9FD),
      Color(0xFFE8EDF7),
    ],
    stops: [0.0, 0.6, 1.0],
  );

  /// Dark mode background gradient
  static const LinearGradient liquidHeroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0B1020),
      Color(0xFF101A30),
      Color(0xFF16213A),
      Color(0xFF0B1020),
    ],
    stops: [0.0, 0.3, 0.7, 1.0],
  );

  // ─── SHADOW DEFINITIONS ───────────────────────────────────────────────────
  /// Card subtle blue-gray shadow
  static List<BoxShadow> get cardShadow => [
    BoxShadow(
      color: const Color(0xFF15265C).withValues(alpha: 0.06),
      blurRadius: 16,
      offset: const Offset(0, 4),
    ),
  ];

  /// Floating mobile navigation shadow
  static List<BoxShadow> get floatingNavShadow => [
    BoxShadow(
      color: const Color(0xFF15265C).withValues(alpha: 0.12),
      blurRadius: 24,
      offset: const Offset(0, 8),
    ),
  ];

  /// Modal and dialog diffused shadow
  static List<BoxShadow> get modalShadow => [
    BoxShadow(
      color: const Color(0xFF15265C).withValues(alpha: 0.20),
      blurRadius: 32,
      offset: const Offset(0, 12),
    ),
  ];
}
