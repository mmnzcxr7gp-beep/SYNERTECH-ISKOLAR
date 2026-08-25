import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// ISKOLAR Material 3 Theme Configuration
class AppTheme {
  static ThemeData get theme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primaryOrange,
      brightness: Brightness.dark,
    ).copyWith(
      primary: AppColors.primaryOrange,
      secondary: AppColors.orangeDarkAction,
      surface: AppColors.elevatedBackground,
      onPrimary: AppColors.pureWhite,
      onSurface: AppColors.textPrimary,
      error: AppColors.danger,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.nearBlack,
      fontFamily: AppTypography.bodyFontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.pureWhite,
        centerTitle: true,
        titleTextStyle: AppTypography.cardTitle(color: AppColors.pureWhite),
        iconTheme: const IconThemeData(color: AppColors.pureWhite),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.elevatedBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primaryOrange, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: AppTypography.secondary(color: AppColors.textMuted),
        labelStyle: AppTypography.formLabel(color: AppColors.textSecondary),
      ),
      textTheme: AppTypography.textTheme(isDark: true),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        elevation: 0,
        color: AppColors.elevatedBackground,
        shadowColor: Colors.black.withValues(alpha: 0.25),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.elevatedBackground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        titleTextStyle: AppTypography.h3(color: AppColors.pureWhite),
        contentTextStyle: AppTypography.secondary(color: AppColors.textSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.elevatedBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.glassSurface,
        labelStyle: AppTypography.caption(color: AppColors.pureWhite),
        shape: const StadiumBorder(),
        side: const BorderSide(color: AppColors.border),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.darkPanel,
        contentTextStyle: AppTypography.body(color: AppColors.pureWhite),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        behavior: SnackBarBehavior.floating,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.nearBlack,
        indicatorColor: AppColors.primaryOrange.withValues(alpha: 0.2),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTypography.navLabel(isSelected: true);
          }
          return AppTypography.navLabel(isSelected: false);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.primaryOrange);
          }
          return const IconThemeData(color: AppColors.textMuted);
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryOrange,
          foregroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, 48),
          elevation: 0,
          textStyle: AppTypography.button(),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryOrange,
          side: const BorderSide(color: AppColors.primaryOrange, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, 48),
          textStyle: AppTypography.button(color: AppColors.primaryOrange),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryOrange,
          textStyle: AppTypography.button(color: AppColors.primaryOrange),
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primaryOrange,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.primaryOrange,
      secondary: AppColors.orangeLightAction,
      surface: AppColors.lightElevatedBackground,
      onPrimary: AppColors.pureWhite,
      onSurface: AppColors.lightTextPrimary,
      error: AppColors.danger,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.lightBackground,
      fontFamily: AppTypography.bodyFontFamily,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.lightTextPrimary,
        centerTitle: true,
        titleTextStyle: AppTypography.cardTitle(color: AppColors.lightTextPrimary),
        iconTheme: const IconThemeData(color: AppColors.lightTextPrimary),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.lightElevatedBackground,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.primaryOrange, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.danger, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: AppTypography.secondary(color: AppColors.lightTextMuted),
        labelStyle: AppTypography.formLabel(color: AppColors.lightTextSecondary),
      ),
      textTheme: AppTypography.textTheme(isDark: false),
      cardTheme: CardThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        elevation: 0,
        color: AppColors.lightElevatedBackground,
        shadowColor: AppColors.lightTextPrimary.withValues(alpha: 0.08),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.lightElevatedBackground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        titleTextStyle: AppTypography.h3(color: AppColors.lightTextPrimary),
        contentTextStyle: AppTypography.secondary(color: AppColors.lightTextSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.lightElevatedBackground,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.lightPanel,
        labelStyle: AppTypography.caption(color: AppColors.lightTextPrimary),
        shape: const StadiumBorder(),
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.lightPanel,
        contentTextStyle: AppTypography.body(color: AppColors.lightTextPrimary),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        behavior: SnackBarBehavior.floating,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.lightBackground,
        indicatorColor: AppColors.primaryOrange.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return AppTypography.navLabel(color: AppColors.orangeLightAction, isSelected: true);
          }
          return AppTypography.navLabel(color: AppColors.lightTextMuted, isSelected: false);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: AppColors.orangeLightAction);
          }
          return const IconThemeData(color: AppColors.lightTextMuted);
        }),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryOrange,
          foregroundColor: AppColors.pureWhite,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, 48),
          elevation: 0,
          textStyle: AppTypography.button(),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.orangeLightAction,
          side: const BorderSide(color: AppColors.primaryOrange, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          minimumSize: const Size(0, 48),
          textStyle: AppTypography.button(color: AppColors.orangeLightAction),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.orangeLightAction,
          textStyle: AppTypography.button(color: AppColors.orangeLightAction),
        ),
      ),
    );
  }
}
