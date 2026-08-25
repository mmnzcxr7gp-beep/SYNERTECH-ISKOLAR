import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../screens/student_dashboard_screen.dart';
import '../screens/sponsor_admin_notice_screen.dart';
import '../screens/register_screen.dart';
import '../screens/mfa_verification_screen.dart';
import '../screens/privacy_policy_screen.dart';
import '../utils/app_colors.dart';
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
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF141118),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.10)),
        ),
        title: const Text('Password Recovery', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        content: const Text(
          'Please enter your email to receive password reset instructions, or contact support at support@iskolar.ph.',
          style: TextStyle(color: Color(0xFFB4A9BE), fontSize: 13.5, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK', style: TextStyle(color: AppColors.primaryOrange, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A090C), // Deep Obsidian Canvas
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
              child: Column(
                children: [
                  const SizedBox(height: 12),

                  // ─── 1. GLOWING EMBLEM & HEADER ─────────────────────────
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
                                  color: AppColors.primaryOrange.withValues(alpha: 0.40),
                                  blurRadius: 36,
                                  spreadRadius: 4,
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFFFF6D29), Color(0xFFFF8552)],
                              ),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.25),
                                width: 1.5,
                              ),
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
                      const FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          'Welcome Back',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Sign in to continue your scholarship journey',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFFB4A9BE),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 30),

                  // ─── 2. FROSTED GLASS LOGIN CARD ────────────────────────
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF141118),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.10),
                            width: 1.2,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x44000000),
                              blurRadius: 28,
                              offset: Offset(0, 10),
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
                              // Error Message Banner
                              if (_errorMessage != null) ...[
                                Container(
                                  padding: const EdgeInsets.all(14),
                                  margin: const EdgeInsets.only(bottom: 18),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.red.withValues(alpha: 0.35)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 20),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          _errorMessage!,
                                          style: const TextStyle(color: Colors.white, fontSize: 12.5, fontWeight: FontWeight.w600),
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
                                prefixIcon: const Icon(Icons.mail_outline_rounded, color: AppColors.primaryOrange),
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
                                prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.primaryOrange),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    _showPassword
                                        ? Icons.visibility_off_outlined
                                        : Icons.visibility_outlined,
                                    color: const Color(0xFFB4A9BE),
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
                                          activeColor: AppColors.primaryOrange,
                                          side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      const Flexible(
                                        child: Text(
                                          'Remember me',
                                          style: TextStyle(
                                            color: Color(0xFFB4A9BE),
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
                                    child: const Text(
                                      'Forgot Password?',
                                      style: TextStyle(
                                        color: AppColors.primaryOrange,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
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
                                  borderRadius: BorderRadius.circular(16),
                                  child: Container(
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.05),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: Colors.white.withValues(alpha: 0.15),
                                        width: 1.2,
                                      ),
                                    ),
                                    child: const Center(
                                      child: FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text(
                                          'CREATE ACCOUNT',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 13,
                                            letterSpacing: 0.8,
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
                                  child: const FittedBox(
                                    fit: BoxFit.scaleDown,
                                    child: Text(
                                      'Privacy Policy & Terms of Service',
                                      style: TextStyle(
                                        color: Color(0x80FFFFFF),
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
    );
  }
}
