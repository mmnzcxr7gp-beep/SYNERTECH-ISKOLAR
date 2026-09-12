import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/sponsor_admin_notice_screen.dart';
import '../screens/register_screen.dart';
import '../screens/mfa_verification_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../utils/app_colors.dart';
import '../utils/app_spacing.dart';
import '../widgets/auth_page_scaffold.dart';
import '../widgets/primary_button.dart';
import '../widgets/styled_text_field.dart';

/// Ultra-Modern Student Login Screen (Manus.im + React Bits Style)
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _showPassword = false;
  bool _rememberMe = true;
  bool _submitted = false;
  String? _errorMessage;

  late final AnimationController _animationController;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeIn),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.10), end: Offset.zero).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _animationController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _onLogin() async {
    setState(() {
      _errorMessage = null;
      _submitted = true;
    });

    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    try {
      final loginResult = await AuthService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
        rememberMe: _rememberMe,
      );

      if (!mounted) return;

      if (loginResult.requiresMfa) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => MfaVerificationScreen(
              email: _emailController.text.trim(),
              mfaToken: loginResult.mfaToken!,
              rememberMe: _rememberMe,
            ),
          ),
        );
        return;
      }

      final user = loginResult.authResponse!.user;
      final role = user.role.toLowerCase();

      if (role == 'provider' || role == 'sponsor' || role == 'admin' || role == 'administrator') {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => SponsorAdminNoticeScreen(userRole: role),
          ),
        );
        return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => StudentDashboardScreen(
            user: user,
            token: loginResult.authResponse!.token,
          ),
        ),
      );
    } catch (error) {
      final String userFriendlyMsg;
      if (error is ApiException) {
        userFriendlyMsg = error.message.contains('Invalid credentials')
            ? 'Invalid email or password. Please check your login details.'
            : error.message;
      } else {
        userFriendlyMsg = 'Unable to sign in. Please check your internet connection.';
      }

      if (mounted) {
        setState(() => _errorMessage = userFriendlyMsg);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _onForgotPassword() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? AppColors.darkSurface : AppColors.cardSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusModal),
          side: BorderSide(
            color: isDark ? AppColors.darkBorder : AppColors.border,
            width: 1.0,
          ),
        ),
        title: Text(
          'Password Recovery',
          style: GoogleFonts.poppins(
            color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        content: Text(
          'Please enter your email to receive password reset instructions, or contact support at support@iskolar.ph.',
          style: GoogleFonts.poppins(
            color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
            fontSize: 13.5,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'OK',
              style: GoogleFonts.poppins(
                color: AppColors.actionBlue,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.mainBackground,
      body: Stack(
        children: [
          // 1. Organic blue background curves
          Positioned.fill(
            child: CustomPaint(
              painter: OrganicBlueCurvesPainter(isDark: isDark),
            ),
          ),

          // 2. Main content
          SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: Column(
                    children: [
                      const SizedBox(height: 8),

                      // ─── 1. EMBLEM & HEADER ─────────────────────────
                      Column(
                        children: [
                          // Ambient Emblem with Halo Glow
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.actionBlue.withValues(alpha: 0.25),
                                      blurRadius: 32,
                                      spreadRadius: 4,
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                width: 72,
                                height: 72,
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.35),
                                    width: 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.actionBlue.withValues(alpha: 0.30),
                                      blurRadius: 18,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.school_rounded,
                                    color: Colors.white,
                                    size: 36,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Welcome Back',
                              style: GoogleFonts.poppins(
                                color: isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy,
                                fontSize: 28,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Sign in to continue your scholarship journey',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.poppins(
                              color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 28),

                      // ─── 2. WHITE ROUNDED AUTHENTICATION CARD ────────────────────────
                      SlideTransition(
                        position: _slideAnimation,
                        child: FadeTransition(
                          opacity: _fadeAnimation,
                          child: Container(
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkSurface : AppColors.cardSurface,
                              borderRadius: BorderRadius.circular(AppSpacing.radiusModal),
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.border,
                                width: 1.0,
                              ),
                              boxShadow: isDark
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.35),
                                        blurRadius: 24,
                                        offset: const Offset(0, 8),
                                      ),
                                    ]
                                  : AppColors.cardShadow,
                            ),
                            padding: const EdgeInsets.all(24),
                            child: Form(
                              key: _formKey,
                              autovalidateMode: _submitted
                                  ? AutovalidateMode.onUserInteraction
                                  : AutovalidateMode.disabled,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Error Message Banner
                                  if (_errorMessage != null) ...[
                                    Container(
                                      padding: const EdgeInsets.all(14),
                                      margin: const EdgeInsets.only(bottom: 18),
                                      decoration: BoxDecoration(
                                        color: AppColors.error.withValues(alpha: 0.10),
                                        borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                                        border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Text(
                                              _errorMessage!,
                                              style: GoogleFonts.poppins(
                                                color: AppColors.error,
                                                fontSize: 12.5,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],

                                  // Email Field
                                  StyledTextField(
                                    controller: _emailController,
                                    label: 'Email Address',
                                    keyboardType: TextInputType.emailAddress,
                                    prefixIcon: const Icon(Icons.mail_outline_rounded, color: AppColors.actionBlue),
                                    validator: (value) {
                                      final email = value?.trim() ?? '';
                                      if (email.isEmpty) return 'Email is required';
                                      if (!email.contains('@')) return 'Enter a valid email address';
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),

                                  // Password Field
                                  StyledTextField(
                                    controller: _passwordController,
                                    label: 'Password',
                                    obscureText: !_showPassword,
                                    prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.actionBlue),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _showPassword
                                            ? Icons.visibility_off_outlined
                                            : Icons.visibility_outlined,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                      ),
                                      onPressed: _isLoading
                                          ? null
                                          : () {
                                              setState(() => _showPassword = !_showPassword);
                                            },
                                    ),
                                    validator: (value) {
                                      final password = value ?? '';
                                      if (password.isEmpty) return 'Password is required';
                                      if (password.length < 6) {
                                        return 'Password must be at least 6 characters';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 14),

                                  // Remember Me & Forgot Password
                                  Wrap(
                                    alignment: WrapAlignment.spaceBetween,
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    runSpacing: 8,
                                    children: [
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          SizedBox(
                                            height: 22,
                                            width: 22,
                                            child: Checkbox(
                                              value: _rememberMe,
                                              onChanged: _isLoading
                                                  ? null
                                                  : (value) {
                                                      setState(() => _rememberMe = value ?? true);
                                                    },
                                              activeColor: AppColors.actionBlue,
                                              side: BorderSide(
                                                color: isDark
                                                    ? AppColors.darkBorder
                                                    : AppColors.border,
                                              ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(5),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Flexible(
                                            child: Text(
                                              'Remember me',
                                              style: GoogleFonts.poppins(
                                                color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      GestureDetector(
                                        onTap: _isLoading ? null : _onForgotPassword,
                                        child: Text(
                                          'Forgot Password?',
                                          style: GoogleFonts.poppins(
                                            color: AppColors.actionBlue,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 24),

                                  // Primary LOGIN Button
                                  PrimaryButton(
                                    label: 'LOGIN',
                                    isLoading: _isLoading,
                                    onPressed: _onLogin,
                                  ),
                                  const SizedBox(height: 14),

                                  // Secondary CREATE ACCOUNT Button
                                  Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      onTap: _isLoading
                                          ? null
                                          : () {
                                              Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (_) => const RegisterScreen(),
                                                ),
                                              );
                                            },
                                      borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                                      child: Container(
                                        height: 48,
                                        decoration: BoxDecoration(
                                          color: isDark
                                              ? AppColors.actionBlue.withValues(alpha: 0.12)
                                              : AppColors.lightSurface,
                                          borderRadius: BorderRadius.circular(AppSpacing.radiusInput),
                                          border: Border.all(
                                            color: isDark
                                                ? AppColors.actionBlue.withValues(alpha: 0.40)
                                                : AppColors.border,
                                            width: 1.2,
                                          ),
                                        ),
                                        child: Center(
                                          child: FittedBox(
                                            fit: BoxFit.scaleDown,
                                            child: Text(
                                              'CREATE ACCOUNT',
                                              style: GoogleFonts.poppins(
                                                color: AppColors.actionBlue,
                                                fontWeight: FontWeight.w700,
                                                fontSize: 13,
                                                letterSpacing: 0.6,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),

                                  const SizedBox(height: 22),

                                  // Privacy Policy Footer Link
                                  Center(
                                    child: GestureDetector(
                                      onTap: () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => const PrivacyPolicyScreen(),
                                          ),
                                        );
                                      },
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          'Privacy Policy & Terms of Service',
                                          style: GoogleFonts.poppins(
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                            fontSize: 12,
                                            decoration: TextDecoration.underline,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
