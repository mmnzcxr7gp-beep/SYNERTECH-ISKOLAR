/// Standardized Spacing, Touch Target, and Sizing System for ISKOLAR Mobile
abstract final class AppSpacing {
  // Spacing scale
  static const double s2 = 2.0;
  static const double s4 = 4.0;
  static const double s8 = 8.0;
  static const double s12 = 12.0;
  static const double s16 = 16.0;
  static const double s20 = 20.0;
  static const double s24 = 24.0;
  static const double s32 = 32.0;
  static const double s40 = 40.0;
  static const double s48 = 48.0;
  static const double s64 = 64.0;

  // Semantic Aliases
  static const double xs = s4;
  static const double sm = s8;
  static const double md = s16;
  static const double lg = s24;
  static const double xl = s32;
  static const double xxl = s48;
  static const double xxxl = s64;

  // Standard Dimensions (Minimum 48x48 touch targets for accessibility)
  static const double screenHorizontal = s16;
  static const double screenPadding = s16;
  static const double cardPadding = s16;
  static const double sectionGap = s24;
  static const double buttonHeight = 48.0;
  static const double controlHeight = 48.0;

  // Locked Corner Radii
  static const double radiusSmall = 10.0;     // Small controls
  static const double radiusControl = 14.0;   // Inputs and buttons
  static const double radiusInput = 14.0;     // Text fields & inputs
  static const double radiusCard = 18.0;      // Cards
  static const double radiusPanel = 18.0;     // Panels
  static const double radiusModal = 24.0;     // Feature cards and modals
  static const double radiusPill = 999.0;     // Pills and filter chips
}
