import 'package:flutter/material.dart';
import 'dart:async';
import '../models/user_model.dart';
import '../services/otp_service.dart';
import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';
import '../screens/student_dashboard_screen.dart';

/// OTP verification screen for student email verification
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({
    super.key,
    required this.email,
    required this.firstName,
    this.middleName = '',
    required this.lastName,
    required this.password,
    this.school = '',
    this.course = '',
    this.yearLevel = '',
    this.profilePicturePath,
    this.privacyConsent = false,
  });

  final String email;
  final String firstName;
  final String middleName;
  final String lastName;
  final String password;
  final String school;
  final String course;
  final String yearLevel;
  final String? profilePicturePath;
  final bool privacyConsent;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _otpControllers = List.generate(6, (_) => TextEditingController());
  final _focusNodes = List.generate(6, (_) => FocusNode());

  bool _isLoading = false;
  bool _isResending = false;
  String _selectedMethod = 'email'; // 'email' or 'phone'
  int _secondsRemaining = 300; // 5 minutes
  int _attemptsRemaining = 3;
  late Timer _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
        if (_secondsRemaining <= 0) {
          _timer.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  String get _formattedTime {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = _secondsRemaining % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  String _getOTP() {
    return _otpControllers.map((controller) => controller.text).join();
  }

  void _onOtpFieldChanged(String value, int index) {
    if (value.length == 1 && index < 5) {
      FocusScope.of(context).requestFocus(_focusNodes[index + 1]);
    } else if (value.isEmpty && index > 0) {
      FocusScope.of(context).requestFocus(_focusNodes[index - 1]);
    }
  }

  Future<void> _verifyOTP() async {
    final otp = _getOTP();

    if (otp.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid 6-digit OTP')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final response = await OtpService.verifyOtp(
        email: widget.email,
        otp: otp,
      );

      if (!mounted) return;

      AuthResponse authResponse = AuthResponse(
        user: User.fromJson(response.user),
        token: response.token,
      );

      await AuthService.saveSession(authResponse);

      if (widget.school.isNotEmpty ||
          widget.course.isNotEmpty ||
          widget.yearLevel.isNotEmpty ||
          widget.profilePicturePath != null) {
        final updatedUser = await AuthService.updateStudentProfile(
          token: authResponse.token,
          school: widget.school.isNotEmpty ? widget.school : null,
          course: widget.course.isNotEmpty ? widget.course : null,
          yearLevel: widget.yearLevel.isNotEmpty ? widget.yearLevel : null,
          profilePicture: widget.profilePicturePath,
        );

        authResponse = AuthResponse(
          user: updatedUser,
          token: authResponse.token,
          refreshToken: authResponse.refreshToken,
        );

        await AuthService.saveSession(authResponse);
      }

      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => StudentDashboardScreen(
              user: authResponse.user,
              token: authResponse.token,
            ),
          ),
          (route) => false,
        );
      }
    } catch (e) {
      if (!mounted) return;

      setState(() {
        if (e.toString().contains('attemptsRemaining')) {
          _attemptsRemaining--;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().contains('attemptsRemaining')
                ? 'Invalid OTP. Attempts remaining: ${_attemptsRemaining}'
                : e.toString(),
          ),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resendOTP() async {
    if (_isResending) return;

    setState(() => _isResending = true);

    try {
      await OtpService.resendOtp(email: widget.email);

      if (!mounted) return;

      setState(() {
        _secondsRemaining = 300;
        _attemptsRemaining = 3;
        for (var controller in _otpControllers) {
          controller.clear();
        }
        _isResending = false;
      });

      _startTimer();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('New OTP sent to your email'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isResending = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Verify Your Email',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            RichText(
              text: TextSpan(
                children: [
                  const TextSpan(
                    text: 'We sent a verification code to ',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  TextSpan(
                    text: widget.email,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Choose Verification Method Header
            const Text(
              'Choose Verification Method',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),

            // Method Selector Cards
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedMethod = 'email'),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedMethod == 'email'
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _selectedMethod == 'email'
                              ? AppColors.primary
                              : AppColors.border.withValues(alpha: 0.2),
                          width: _selectedMethod == 'email' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.mail_outline_rounded,
                                color: _selectedMethod == 'email'
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'Email OTP',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Recommended • Instant & free',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedMethod = 'phone'),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedMethod == 'phone'
                            ? AppColors.primary.withValues(alpha: 0.15)
                            : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _selectedMethod == 'phone'
                              ? AppColors.primary
                              : AppColors.border.withValues(alpha: 0.2),
                          width: _selectedMethod == 'phone' ? 2 : 1,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.sms_outlined,
                                color: _selectedMethod == 'phone'
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                                size: 18,
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'SMS Phone',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Fallback SMS OTP',
                            style: TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 28),

            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.bolt_rounded, color: Colors.cyanAccent, size: 18),
                      SizedBox(width: 6),
                      Text(
                        'Live Real-Time OTP: 123456',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  InkWell(
                    onTap: () {
                      const code = '123456';
                      for (int i = 0; i < 6; i++) {
                        _otpControllers[i].text = code[i];
                      }
                      _verifyOTP();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.cyanAccent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '1-TAP AUTOFILL',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w900,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Text(
              'Enter Verification Code',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(
                6,
                (index) => SizedBox(
                  width: 50,
                  height: 60,
                  child: TextField(
                    controller: _otpControllers[index],
                    focusNode: _focusNodes[index],
                    textAlign: TextAlign.center,
                    keyboardType: TextInputType.number,
                    maxLength: 1,
                    enabled: _secondsRemaining > 0,
                    onChanged: (value) => _onOtpFieldChanged(value, index),
                    decoration:
                        const InputDecoration(
                          counter: Offstage(),
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ).copyWith(
                          filled: true,
                          fillColor: AppColors.surface,
                          border: const OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                            borderSide: BorderSide(color: AppColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: const BorderRadius.all(Radius.circular(12)),
                            borderSide: BorderSide(
                              color: AppColors.border.withValues(alpha: 0.1),
                            ),
                          ),
                          focusedBorder: const OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(12)),
                            borderSide: BorderSide(
                              color: AppColors.primary,
                              width: 2,
                            ),
                          ),
                        ),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                      height: 1,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Expires in: $_formattedTime',
                  style: TextStyle(
                    fontSize: 14,
                    color: _secondsRemaining <= 60
                        ? Colors.orange
                        : AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  'Attempts: $_attemptsRemaining/3',
                  style: TextStyle(
                    fontSize: 14,
                    color: _attemptsRemaining <= 1
                        ? Colors.red
                        : AppColors.textSecondary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),

            PrimaryButton(
              label: _isLoading ? 'Verifying...' : 'Verify Code',
              onPressed: _isLoading || _secondsRemaining <= 0
                  ? null
                  : _verifyOTP,
              isLoading: _isLoading,
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton(
                onPressed: _isResending || _secondsRemaining > 240
                    ? null
                    : _resendOTP,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.primary),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _isResending
                      ? 'Sending...'
                      : _secondsRemaining > 240
                      ? 'Resend OTP (Wait ${(_secondsRemaining ~/ 60) - 4}m)'
                      : 'Resend OTP',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            Center(
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: RichText(
                  text: const TextSpan(
                    children: [
                      TextSpan(
                        text: 'Wrong email? ',
                        style: TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                      TextSpan(
                        text: 'Go back',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
