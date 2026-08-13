import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/sponsor_admin_notice_screen.dart';
import '../screens/register_screen.dart';
import '../screens/mfa_verification_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../utils/app_colors.dart';
import '../widgets/iskolar_logo.dart';
import '../widgets/primary_button.dart';
import '../widgets/styled_text_field.dart';

/// Redesigned Login Screen with student-centered typography, rounded cards,
/// user-friendly error banners, and clean navigation.
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
        Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero).animate(
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Forgot Password', style: TextStyle(color: AppColors.textPrimary)),
        content: const Text(
          'Please enter your email on the recovery link sent to your inbox or contact support at support@iskolar.ph.',
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                children: [
                  const SizedBox(height: 16),

                  // ─── HEADER SECTION ─────────────────────────────────────
                  Column(
                    children: [
                      const ISKOLARLogo(size: 72),
                      const SizedBox(height: 16),
                      const Text(
                        'Welcome Back',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Sign in to continue your scholarship journey',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // ─── LOGIN CARD ─────────────────────────────────────────
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.08),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            ),
                          ],
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
                              // User Friendly Error Message Banner
                              if (_errorMessage != null) ...[
                                Container(
                                  padding: const EdgeInsets.all(14),
                                  margin: const EdgeInsets.only(bottom: 18),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: Colors.red, size: 20),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          _errorMessage!,
                                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
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
                                prefixIcon: const Icon(Icons.mail_outline_rounded),
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
                                prefixIcon: const Icon(Icons.lock_outline_rounded),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _showPassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
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
                              const SizedBox(height: 12),

                              // Remember Me & Forgot Password
                              Row(
                                children: [
                                  SizedBox(
                                    height: 24,
                                    width: 24,
                                    child: Checkbox(
                                      value: _rememberMe,
                                      onChanged: _isLoading
                                          ? null
                                          : (value) {
                                              setState(() => _rememberMe = value ?? true);
                                            },
                                      activeColor: AppColors.primary,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Remember me',
                                    style: TextStyle(
                                      color: AppColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const Spacer(),
                                  TextButton(
                                    onPressed: _isLoading ? null : _onForgotPassword,
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: const Text(
                                      'Forgot Password?',
                                      style: TextStyle(
                                        color: AppColors.primary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
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
                              const SizedBox(height: 16),

                              // Secondary CREATE ACCOUNT Button
                              OutlinedButton(
                                onPressed: _isLoading
                                    ? null
                                    : () {
                                        Navigator.of(context).push(
                                          MaterialPageRoute(
                                            builder: (_) => const RegisterScreen(),
                                          ),
                                        );
                                      },
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: const Text(
                                  'CREATE ACCOUNT',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),

                              const SizedBox(height: 20),

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
                                  child: Text(
                                    'Privacy Policy & Terms of Service',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.5),
                                      fontSize: 12,
                                      decoration: TextDecoration.underline,
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
    );
  }
}
