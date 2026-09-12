import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_typography.dart';

/// ISKOLAR Material 3 Theme Configuration
/// Implements the locked visual direction:
/// - Light mode default with #F7F9FD background, #FFFFFF cards, #15265C navy titles, #305BFE action blue
/// - Complete dark mode with #0B1020 background, #16213A surface, #4F96FF primary
/// - Poppins typography scale
/// - 48px touch targets, rounded cards (18px), controls (14px)
class AppTheme {
  /// Default Theme is Light Mode (matches reference aesthetics)
  static ThemeData get theme => lightTheme;

  /// Light Theme
  static ThemeData get lightTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.actionBlue,
      onPrimary: AppColors.pureWhite,
      primaryContainer: AppColors.lightBlueSurface,
      onPrimaryContainer: AppColors.primaryNavy,
      secondary: AppColors.primaryNavy,
      onSecondary: AppColors.pureWhite,
      secondaryContainer: AppColors.paleBlue,
      onSecondaryContainer: AppColors.primaryNavy,
      tertiary: AppColors.skyBlue,
      onTertiary: AppColors.pureWhite,
      error: AppColors.error,
      onError: AppColors.pureWhite,
      errorContainer: AppColors.errorBg,
      onErrorContainer: AppColors.error,
      surface: AppColors.cardSurface,
      onSurface: AppColors.primaryText,
      surfaceContainerHighest: AppColors.lightBlueSurface,
      outline: AppColors.border,
      outlineVariant: AppColors.paleBlue,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.mainBackground,
      fontFamily: GoogleFonts.poppins().fontFamily,
      textTheme: AppTypography.textTheme(isDark: false),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppColors.primaryNavy,
        centerTitle: true,
        titleTextStyle: AppTypography.cardTitle(color: AppColors.primaryNavy),
        iconTheme: const IconThemeData(color: AppColors.primaryNavy),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.cardSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.actionBlue, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.error, width: 1.8),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: AppTypography.body(color: AppColors.textMuted),
        labelStyle: AppTypography.label(color: AppColors.secondaryText),
        floatingLabelStyle: AppTypography.label(color: AppColors.actionBlue),
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
          side: const BorderSide(color: AppColors.border, width: 1.0),
        ),
        elevation: 0,
        color: AppColors.cardSurface,
        shadowColor: const Color(0xFF15265C).withValues(alpha: 0.06),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.cardSurface,
        elevation: 16,
        shadowColor: const Color(0xFF15265C).withValues(alpha: 0.20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusModal),
        ),
        titleTextStyle: AppTypography.sectionTitle(color: AppColors.primaryNavy),
        contentTextStyle: AppTypography.body(color: AppColors.secondaryText),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.cardSurface,
        elevation: 16,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppSpacing.radiusModal),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.lightBlueSurface,
        labelStyle: AppTypography.caption(color: AppColors.primaryNavy),
        shape: const StadiumBorder(),
        side: const BorderSide(color: AppColors.border, width: 1.0),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.primaryNavy,
        contentTextStyle: AppTypography.body(color: AppColors.pureWhite),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.cardSurface,
        elevation: 0,
        indicatorColor: AppColors.lightBlueSurface,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return AppTypography.navLabel(isSelected: isSelected);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: isSelected ? AppColors.actionBlue : AppColors.secondaryText,
            size: 22,
          );
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.actionBlue,
          foregroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, AppSpacing.buttonHeight),
          elevation: 0,
          textStyle: AppTypography.button(),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.actionBlue,
          side: const BorderSide(color: AppColors.actionBlue, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, AppSpacing.buttonHeight),
          textStyle: AppTypography.button(color: AppColors.actionBlue),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.actionBlue,
          textStyle: AppTypography.button(color: AppColors.actionBlue),
          minimumSize: const Size(48, 48),
        ),
      ),
    );
  }

  /// Dark Theme
  static ThemeData get darkTheme {
    const colorScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.darkPrimary,
      onPrimary: AppColors.darkBackground,
      primaryContainer: AppColors.darkElevated,
      onPrimaryContainer: AppColors.darkTextPrimary,
      secondary: AppColors.skyBlue,
      onSecondary: AppColors.darkBackground,
      secondaryContainer: AppColors.darkSurface,
      onSecondaryContainer: AppColors.darkTextPrimary,
      tertiary: AppColors.actionBlue,
      onTertiary: AppColors.pureWhite,
      error: AppColors.error,
      onError: AppColors.pureWhite,
      errorContainer: AppColors.errorBg,
      onErrorContainer: AppColors.error,
      surface: AppColors.darkSurface,
      onSurface: AppColors.darkTextPrimary,
      surfaceContainerHighest: AppColors.darkElevated,
      outline: AppColors.darkBorder,
      outlineVariant: const Color(0xFF1D2C4D),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.darkBackground,
      fontFamily: GoogleFonts.poppins().fontFamily,
      textTheme: AppTypography.textTheme(isDark: true),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        foregroundColor: AppColors.darkTextPrimary,
        centerTitle: true,
        titleTextStyle: AppTypography.cardTitle(color: AppColors.darkTextPrimary),
        iconTheme: const IconThemeData(color: AppColors.darkTextPrimary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkElevated,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.darkBorder, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.darkBorder, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.darkPrimary, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          borderSide: const BorderSide(color: AppColors.error, width: 1.8),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: AppTypography.body(color: AppColors.darkTextSecondary),
        labelStyle: AppTypography.label(color: AppColors.darkTextSecondary),
        floatingLabelStyle: AppTypography.label(color: AppColors.darkPrimary),
      ),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
          side: const BorderSide(color: AppColors.darkBorder, width: 1.0),
        ),
        elevation: 0,
        color: AppColors.darkSurface,
        shadowColor: Colors.black.withValues(alpha: 0.35),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.darkElevated,
        elevation: 16,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusModal),
        ),
        titleTextStyle: AppTypography.sectionTitle(color: AppColors.darkTextPrimary),
        contentTextStyle: AppTypography.body(color: AppColors.darkTextSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.darkElevated,
        elevation: 16,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppSpacing.radiusModal),
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.darkElevated,
        labelStyle: AppTypography.caption(color: AppColors.darkTextPrimary),
        shape: const StadiumBorder(),
        side: const BorderSide(color: AppColors.darkBorder, width: 1.0),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.darkElevated,
        contentTextStyle: AppTypography.body(color: AppColors.darkTextPrimary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
        ),
        behavior: SnackBarBehavior.floating,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.darkNavigation,
        elevation: 0,
        indicatorColor: AppColors.darkPrimary.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return AppTypography.navLabel(
            color: isSelected ? AppColors.darkPrimary : AppColors.darkTextSecondary,
            isSelected: isSelected,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final isSelected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: isSelected ? AppColors.darkPrimary : AppColors.darkTextSecondary,
            size: 22,
          );
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.darkPrimary,
          foregroundColor: AppColors.darkBackground,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, AppSpacing.buttonHeight),
          elevation: 0,
          textStyle: AppTypography.button(color: AppColors.darkBackground),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.darkPrimary,
          side: const BorderSide(color: AppColors.darkPrimary, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, AppSpacing.buttonHeight),
          textStyle: AppTypography.button(color: AppColors.darkPrimary),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.darkPrimary,
          textStyle: AppTypography.button(color: AppColors.darkPrimary),
          minimumSize: const Size(48, 48),
        ),
      ),
    );
  }
}
