import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/otp_service.dart';
import '../utils/app_colors.dart';
import '../utils/upload_source_dialog.dart';
import '../widgets/iskolar_logo.dart';
import '../widgets/primary_button.dart';
import '../widgets/styled_text_field.dart';
import 'login_screen.dart';
import 'otp_verification_screen.dart';
import 'privacy_policy_screen.dart';

/// Comprehensive 6-Step Multi-Stage Student Registration Flow
/// Screen 1: Introduction
/// Screen 2: Account Information (Step 1 of 3)
/// Screen 3: Student Information (Step 2 of 3)
/// Screen 4: Profile Setup & Avatar (Step 3 of 3)
/// Screen 5: Information Review & Consent
/// Screen 6: Success Page
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  int _currentStep = 0; // 0: Intro, 1: Account, 2: Student, 3: Profile, 4: Review, 5: Success

  final _accountFormKey = GlobalKey<FormState>();
  final _studentFormKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _showPassword = false;
  bool _privacyConsent = false;
  bool _step1Submitted = false;
  bool _step2Submitted = false;
  String? _errorMessage;

  // Account Information Controllers (Step 1)
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  // Student Information Controllers (Step 2)
  final _studentIdController = TextEditingController();
  final _schoolController = TextEditingController();
  final _courseController = TextEditingController();
  final _addressController = TextEditingController();
  String _yearLevel = '1st Year';

  // Profile Setup Controllers (Step 3)
  final _mobileController = TextEditingController();
  final _birthdateController = TextEditingController();
  final _guardianController = TextEditingController();
  String? _profilePicturePath;

  final List<String> _yearLevelOptions = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    '5th Year / Graduating',
    'Senior High School',
  ];

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();

    _studentIdController.dispose();
    _schoolController.dispose();
    _courseController.dispose();
    _addressController.dispose();

    _mobileController.dispose();
    _birthdateController.dispose();
    _guardianController.dispose();
    super.dispose();
  }

  // Password Strength Checking
  double _calculatePasswordStrength(String password) {
    if (password.isEmpty) return 0.0;
    double strength = 0.0;
    if (password.length >= 6) strength += 0.25;
    if (RegExp(r'[A-Z]').hasMatch(password)) strength += 0.25;
    if (RegExp(r'[0-9]').hasMatch(password)) strength += 0.25;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(password)) strength += 0.25;
    return strength;
  }

  Color _getStrengthColor(double strength) {
    if (strength <= 0.25) return Colors.red;
    if (strength <= 0.5) return Colors.orange;
    if (strength <= 0.75) return Colors.yellow;
    return Colors.green;
  }

  String _getStrengthLabel(double strength) {
    if (strength <= 0.25) return 'Weak';
    if (strength <= 0.5) return 'Fair';
    if (strength <= 0.75) return 'Good';
    return 'Strong';
  }

  Future<void> _pickProfilePicture() async {
    final picked = await UploadSourceDialog.pick(
      context: context,
      title: 'Upload Profile Picture',
    );
    if (picked == null) return;

    if (picked.path?.isNotEmpty == true) {
      setState(() => _profilePicturePath = picked.path);
      return;
    }

    if (picked.bytes != null) {
      final tempFile = File('${Directory.systemTemp.path}/${picked.filename}');
      await tempFile.writeAsBytes(picked.bytes!);
      setState(() => _profilePicturePath = tempFile.path);
    }
  }

  Future<void> _selectBirthdate() async {
    final now = DateTime.now();
    final initialDate = DateTime(now.year - 18, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1970),
      lastDate: DateTime.now(),
      builder: (ctx, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.primary,
              surface: AppColors.surface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final formatted = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      setState(() => _birthdateController.text = formatted);
    }
  }

  Future<void> _onSubmitRegistration() async {
    setState(() => _errorMessage = null);

    final email = _emailController.text.trim();
    final firstName = _firstNameController.text.trim();
    final lastName = _lastNameController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || firstName.isEmpty || lastName.isEmpty || password.isEmpty) {
      setState(() => _errorMessage = 'Please complete all required fields.');
      return;
    }

    // Open mandatory Privacy Policy Popup before API call or OTP delivery
    _showPrivacyPolicyDialog();
  }

  Future<void> _showPrivacyPolicyDialog() async {
    final agreed = await showDialog<bool>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.nearBlack,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.strongBorder),
        ),
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: AppColors.actionBlue, size: 24),
            SizedBox(width: 10),
            Text(
              'Privacy Policy',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Please review and agree to our Privacy Policy before creating your student account.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
              const SizedBox(height: 12),
              Container(
                constraints: const BoxConstraints(maxHeight: 280),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.elevatedBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: const SingleChildScrollView(
                  child: Text(
                    'SYNERTECH ISKOLAR PRIVACY POLICY\n\n'
                    'Effective Date: August 2026\n\n'
                    '1. Introduction & Compliance\n'
                    'SYNERTECH ISKOLAR ("we", "our", or "platform") is committed to safeguarding personal data in full compliance with the Data Privacy Act of 2012 (RA 10173). This policy governs the processing of personal data for students registering through our mobile application.\n\n'
                    '2. Information We Collect\n'
                    'We collect full names, email addresses, mobile numbers, academic records, student identification numbers, course/year level, and verification documents (e.g., School ID, Certificate of Registration).\n\n'
                    '3. Purpose of Processing\n'
                    'Collected data is processed strictly to: (a) Verify student eligibility; (b) Process scholarship applications; (c) Perform OCR extraction on uploaded documents; and (d) Deliver security codes and status updates.\n\n'
                    '4. Confidentiality & Disclosure\n'
                    'Student profile information is visible strictly to authorized scholarship providers offering the targeted grant and system administrators. Data is never sold or rented.\n\n'
                    '5. Security & Storage\n'
                    'All account information is transmitted over encrypted connections and stored securely in protected database infrastructure.\n\n'
                    'By selecting "I Agree and Create Account", you explicitly consent to the processing of your personal data as outlined in this Privacy Policy.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 11, height: 1.4),
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.actionBlue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('I Agree and Create Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );

    if (agreed == true) {
      _executeStudentRegistration();
    }
  }

  Future<void> _executeStudentRegistration() async {
    setState(() {
      _privacyConsent = true;
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await OtpService.sendOtp(
        email: _emailController.text.trim(),
        firstName: _firstNameController.text.trim(),
        middleName: _middleNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        password: _passwordController.text.trim(),
        privacyPolicyAccepted: true,
      );

      if (!mounted) return;

      setState(() {
        _isLoading = false;
        _currentStep = 5; // Success / OTP Step
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  bool get _isDark => Theme.of(context).brightness == Brightness.dark;
  Color get _bgColor => _isDark ? AppColors.darkBackground : AppColors.mainBackground;
  Color get _cardColor => _isDark ? AppColors.surfaceDark : AppColors.pureWhite;
  Color get _cardBorder => _isDark ? const Color(0xFF22314D) : AppColors.border;
  Color get _textPrimary => _isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
  Color get _textSecondary => _isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: _currentStep > 0 && _currentStep < 5
            ? IconButton(
                icon: Icon(Icons.arrow_back_rounded, color: _textPrimary),
                onPressed: () {
                  setState(() {
                    _errorMessage = null;
                    _currentStep--;
                  });
                },
              )
            : IconButton(
                icon: Icon(Icons.close_rounded, color: _textPrimary),
                onPressed: () => Navigator.of(context).pop(),
              ),
        title: _currentStep > 0 && _currentStep <= 3
            ? Text(
                'Step $_currentStep of 3',
                style: GoogleFonts.poppins(color: AppColors.actionBlue, fontSize: 14, fontWeight: FontWeight.bold),
              )
            : null,
        centerTitle: true,
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              child: _buildCurrentScreen(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentScreen() {
    switch (_currentStep) {
      case 0:
        return _buildScreen1Intro();
      case 1:
        return _buildScreen2AccountInfo();
      case 2:
        return _buildScreen3StudentInfo();
      case 3:
        return _buildScreen4ProfileSetup();
      case 4:
        return _buildScreen5Review();
      case 5:
        return _buildScreen6Success();
      default:
        return _buildScreen1Intro();
    }
  }

  // ─── SCREEN 1: CREATE ACCOUNT INTRODUCTION ──────────────────────────────
  Widget _buildScreen1Intro() {
    return Column(
      children: [
        const SizedBox(height: 24),
        const ISKOLARLogo(size: 88),
        const SizedBox(height: 24),
        Text(
          'Create your student account',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: _textPrimary,
            fontSize: 26,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Register to discover scholarship opportunities and manage your applications.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(
            color: _textSecondary,
            fontSize: 14,
            height: 1.5,
          ),
        ),
        const SizedBox(height: 36),

        Container(
          decoration: BoxDecoration(
            color: _cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _cardBorder),
            boxShadow: [
              BoxShadow(
                color: _isDark ? Colors.black.withValues(alpha: 0.30) : const Color(0x0C15265C),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              _buildFeatureItem(Icons.verified_outlined, 'Access Verified Grants', 'Explore thousands of scholarship & allowance programs.'),
              const SizedBox(height: 16),
              _buildFeatureItem(Icons.assignment_outlined, 'Track Applications', 'Monitor your screening progress in real-time.'),
              const SizedBox(height: 16),
              _buildFeatureItem(Icons.security_outlined, 'Secure Data Safeguards', 'Your documents are protected with encryption.'),
            ],
          ),
        ),
        const SizedBox(height: 36),

        PrimaryButton(
          label: 'CONTINUE',
          onPressed: () => setState(() => _currentStep = 1),
        ),
      ],
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String desc) {
    return Row(
      children: [
        CircleAvatar(
          backgroundColor: AppColors.actionBlue.withValues(alpha: _isDark ? 0.20 : 0.10),
          radius: 20,
          child: Icon(icon, color: AppColors.actionBlue, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 2),
              Text(desc, style: GoogleFonts.poppins(color: _textSecondary, fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }

  // ─── SCREEN 2: ACCOUNT INFORMATION (STEP 1 OF 3) ───────────────────────
  Widget _buildScreen2AccountInfo() {
    final passwordStrength = _calculatePasswordStrength(_passwordController.text);

    return Form(
      key: _accountFormKey,
      autovalidateMode: _step1Submitted
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Create Your Account', style: GoogleFonts.poppins(color: _textPrimary, fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text('Step 1 of 3: Personal & Login Details', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 14)),
          const SizedBox(height: 24),

          // Name Fields
          StyledTextField(
            controller: _firstNameController,
            label: 'First Name',
            prefixIcon: const Icon(Icons.person_outline),
            validator: (val) => (val?.trim().isEmpty ?? true) ? 'First name is required' : null,
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: StyledTextField(
                  controller: _middleNameController,
                  label: 'Middle Name (Optional)',
                  prefixIcon: const Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StyledTextField(
                  controller: _lastNameController,
                  label: 'Last Name',
                  prefixIcon: const Icon(Icons.person_outline),
                  validator: (val) => (val?.trim().isEmpty ?? true) ? 'Last name is required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Email Field
          StyledTextField(
            controller: _emailController,
            label: 'Email Address',
            keyboardType: TextInputType.emailAddress,
            prefixIcon: const Icon(Icons.mail_outline_rounded),
            validator: (val) {
              final email = val?.trim() ?? '';
              if (email.isEmpty) return 'Email address is required';
              if (!email.contains('@') || !email.contains('.')) return 'Enter a valid email address';
              return null;
            },
          ),
          const SizedBox(height: 14),

          // Password Field
          StyledTextField(
            controller: _passwordController,
            label: 'Password',
            obscureText: !_showPassword,
            prefixIcon: const Icon(Icons.lock_outline_rounded),
            suffixIcon: IconButton(
              icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
            onChanged: (_) => setState(() {}),
            validator: (val) {
              final pass = val ?? '';
              if (pass.isEmpty) return 'Password is required';
              if (pass.length < 6) return 'Minimum 6 characters required';
              return null;
            },
          ),

          // Password Strength Indicator Bar
          if (_passwordController.text.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: LinearProgressIndicator(
                    value: passwordStrength,
                    color: _getStrengthColor(passwordStrength),
                    backgroundColor: _isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                    minHeight: 4,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  _getStrengthLabel(passwordStrength),
                  style: GoogleFonts.poppins(color: _getStrengthColor(passwordStrength), fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
          const SizedBox(height: 14),

          // Confirm Password Field
          StyledTextField(
            controller: _confirmController,
            label: 'Confirm Password',
            obscureText: !_showPassword,
            prefixIcon: const Icon(Icons.lock_outline_rounded),
            validator: (val) {
              if (val != _passwordController.text) return 'Passwords do not match';
              return null;
            },
          ),
          const SizedBox(height: 28),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep = 0),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: _isDark ? Colors.white24 : AppColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('BACK', style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: PrimaryButton(
                  label: 'NEXT',
                  onPressed: () {
                    setState(() => _step1Submitted = true);
                    if (_accountFormKey.currentState?.validate() ?? false) {
                      setState(() => _currentStep = 2);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── SCREEN 3: STUDENT INFORMATION (STEP 2 OF 3) ───────────────────────
  Widget _buildScreen3StudentInfo() {
    return Form(
      key: _studentFormKey,
      autovalidateMode: _step2Submitted
          ? AutovalidateMode.onUserInteraction
          : AutovalidateMode.disabled,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Student Information', style: GoogleFonts.poppins(color: _textPrimary, fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text('Step 2 of 3: Academic & School Details', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 14)),
          const SizedBox(height: 24),

          StyledTextField(
            controller: _studentIdController,
            label: 'Student ID Number (Optional)',
            prefixIcon: const Icon(Icons.badge_outlined),
          ),
          const SizedBox(height: 14),

          StyledTextField(
            controller: _schoolController,
            label: 'School / University',
            prefixIcon: const Icon(Icons.school_outlined),
            validator: (val) => (val?.trim().isEmpty ?? true) ? 'School name is required' : null,
          ),
          const SizedBox(height: 14),

          StyledTextField(
            controller: _courseController,
            label: 'Course / Program',
            prefixIcon: const Icon(Icons.menu_book_outlined),
            validator: (val) => (val?.trim().isEmpty ?? true) ? 'Course/Program is required' : null,
          ),
          const SizedBox(height: 14),

          // Year Level Dropdown
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Year Level', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                decoration: BoxDecoration(
                  color: _cardColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _cardBorder),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _yearLevel,
                    isExpanded: true,
                    dropdownColor: _cardColor,
                    style: GoogleFonts.poppins(color: _textPrimary, fontSize: 15),
                    items: _yearLevelOptions.map((opt) {
                      return DropdownMenuItem(value: opt, child: Text(opt, style: GoogleFonts.poppins(color: _textPrimary)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _yearLevel = val);
                    },
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          StyledTextField(
            controller: _addressController,
            label: 'Complete Home Address',
            prefixIcon: const Icon(Icons.home_outlined),
            validator: (val) => (val?.trim().isEmpty ?? true) ? 'Address is required' : null,
          ),
          const SizedBox(height: 28),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep = 1),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: _isDark ? Colors.white24 : AppColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('BACK', style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: PrimaryButton(
                  label: 'NEXT',
                  onPressed: () {
                    setState(() => _step2Submitted = true);
                    if (_studentFormKey.currentState?.validate() ?? false) {
                      setState(() => _currentStep = 3);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── SCREEN 4: PROFILE SETUP (STEP 3 OF 3) ──────────────────────────────
  Widget _buildScreen4ProfileSetup() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Complete Your Profile', style: GoogleFonts.poppins(color: _textPrimary, fontSize: 24, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text('Step 3 of 3: Profile Photo & Additional Details', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 14)),
        const SizedBox(height: 24),

        // Large Circular Avatar Placeholder
        Center(
          child: Stack(
            children: [
              GestureDetector(
                onTap: _pickProfilePicture,
                child: CircleAvatar(
                  radius: 54,
                  backgroundColor: _isDark ? AppColors.surfaceDark : AppColors.lightBlueSurface,
                  backgroundImage: _profilePicturePath != null ? FileImage(File(_profilePicturePath!)) : null,
                  child: _profilePicturePath == null
                      ? Icon(Icons.person_rounded, size: 54, color: _textSecondary)
                      : null,
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: GestureDetector(
                  onTap: _pickProfilePicture,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(color: AppColors.actionBlue, shape: BoxShape.circle),
                    child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text('Tap to upload profile picture', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 12)),
        ),
        const SizedBox(height: 24),

        // Birthdate Picker Field
        GestureDetector(
          onTap: _selectBirthdate,
          child: AbsorbPointer(
            child: StyledTextField(
              controller: _birthdateController,
              label: 'Date of Birth',
              prefixIcon: const Icon(Icons.cake_outlined),
              suffixIcon: const Icon(Icons.calendar_month_outlined),
            ),
          ),
        ),
        const SizedBox(height: 14),

        StyledTextField(
          controller: _mobileController,
          label: 'Contact Number (e.g. 09171234567)',
          keyboardType: TextInputType.phone,
          prefixIcon: const Icon(Icons.phone_outlined),
        ),
        const SizedBox(height: 14),

        StyledTextField(
          controller: _guardianController,
          label: 'Guardian Name & Contact (Optional)',
          prefixIcon: const Icon(Icons.people_outline),
        ),
        const SizedBox(height: 28),

        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _currentStep = 2),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: BorderSide(color: _isDark ? Colors.white24 : AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('BACK', style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PrimaryButton(
                label: 'CONTINUE',
                onPressed: () => setState(() => _currentStep = 4),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── SCREEN 5: ACCOUNT REVIEW ───────────────────────────────────────────
  Widget _buildScreen5Review() {
    final fullName = "${_firstNameController.text} ${_middleNameController.text} ${_lastNameController.text}".replaceAll('  ', ' ').trim();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Review Your Information', style: GoogleFonts.poppins(color: _textPrimary, fontSize: 24, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        Text('Please verify your registration details before submission', style: GoogleFonts.poppins(color: _textSecondary, fontSize: 14)),
        const SizedBox(height: 20),

        if (_errorMessage != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.red.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red),
                const SizedBox(width: 10),
                Expanded(child: Text(_errorMessage!, style: GoogleFonts.poppins(color: _textPrimary, fontSize: 13))),
              ],
            ),
          ),
        ],

        // Card 1: Account Info
        _buildSummaryCard('Account Information', [
          _buildSummaryRow('Full Name', fullName),
          _buildSummaryRow('Email', _emailController.text),
        ]),
        const SizedBox(height: 14),

        // Card 2: Student Info
        _buildSummaryCard('Student Information', [
          _buildSummaryRow('School', _schoolController.text),
          _buildSummaryRow('Course', _courseController.text),
          _buildSummaryRow('Year Level', _yearLevel),
          _buildSummaryRow('Address', _addressController.text),
        ]),
        const SizedBox(height: 14),

        // Card 3: Profile Info
        _buildSummaryCard('Profile Information', [
          _buildSummaryRow('Birthdate', _birthdateController.text.isEmpty ? 'Not set' : _birthdateController.text),
          _buildSummaryRow('Contact', _mobileController.text.isEmpty ? 'Not set' : _mobileController.text),
        ]),
        const SizedBox(height: 20),

        // Privacy Policy Checkbox
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 24,
              width: 24,
              child: Checkbox(
                value: _privacyConsent,
                onChanged: _isLoading ? null : (val) => setState(() => _privacyConsent = val ?? false),
                activeColor: AppColors.actionBlue,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: GestureDetector(
                onTap: () {
                  Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()));
                },
                child: Text.rich(
                  TextSpan(
                    text: 'I agree to the ',
                    style: GoogleFonts.poppins(color: _textPrimary, fontSize: 13),
                    children: const [
                      TextSpan(
                        text: 'Privacy Policy & Terms of Service',
                        style: TextStyle(color: AppColors.actionBlue, fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 28),

        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _isLoading ? null : () => setState(() => _currentStep = 3),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: BorderSide(color: _isDark ? Colors.white24 : AppColors.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: Text('BACK', style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: PrimaryButton(
                label: 'CREATE ACCOUNT',
                isLoading: _isLoading,
                onPressed: _onSubmitRegistration,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _cardBorder),
        boxShadow: [
          BoxShadow(
            color: _isDark ? Colors.black.withValues(alpha: 0.25) : const Color(0x0A15265C),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.poppins(color: AppColors.actionBlue, fontWeight: FontWeight.bold, fontSize: 14)),
          Divider(color: _isDark ? Colors.white10 : AppColors.border, height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.poppins(color: _textSecondary, fontSize: 13)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: GoogleFonts.poppins(color: _textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  // ─── SCREEN 6: SUCCESS PAGE ─────────────────────────────────────────────
  Widget _buildScreen6Success() {
    return Column(
      children: [
        const SizedBox(height: 32),
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.green, width: 3),
          ),
          child: const Icon(Icons.check_rounded, color: Colors.green, size: 54),
        ),
        const SizedBox(height: 24),
        Text(
          'Account Created Successfully',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(color: _textPrimary, fontSize: 24, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Text(
          'Please verify your email (${_emailController.text}) to activate your student account.',
          textAlign: TextAlign.center,
          style: GoogleFonts.poppins(color: _textSecondary, fontSize: 14, height: 1.5),
        ),
        const SizedBox(height: 40),

        PrimaryButton(
          label: 'VERIFY ACCOUNT',
          onPressed: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (_) => OtpVerificationScreen(
                  email: _emailController.text.trim(),
                  firstName: _firstNameController.text.trim(),
                  middleName: _middleNameController.text.trim(),
                  lastName: _lastNameController.text.trim(),
                  password: _passwordController.text.trim(),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 14),

        OutlinedButton(
          onPressed: () {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            side: BorderSide(color: _isDark ? Colors.white24 : AppColors.border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            minimumSize: const Size(double.infinity, 50),
          ),
          child: Text('GO TO LOGIN', style: GoogleFonts.poppins(color: _textPrimary, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
