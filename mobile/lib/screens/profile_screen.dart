import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/user_model.dart';
import '../utils/upload_source_dialog.dart';

import '../screens/onboarding_screen.dart';
import '../screens/student_profile_edit_screen.dart';
import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_constants.dart';
import '../widgets/primary_button.dart';

/// Account / Profile screen matching Screen #4 layout (Hero Avatar + Balance/Info Pill + Overlapping Form Sheet)
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.user, required this.token});

  final User user;
  final String token;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with WidgetsBindingObserver {
  late Future<User> _futureUser;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _futureUser = AuthService.fetchProfile(widget.token);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    if (state == AppLifecycleState.resumed) {
      _refreshUserProfile();
    }
  }

  void _clearImageCache() {
    imageCache.clear();
    imageCache.clearLiveImages();
  }

  void _refreshUserProfile() {
    _clearImageCache();
    setState(() {
      _futureUser = AuthService.fetchProfile(widget.token);
    });
  }

  Widget _buildInitialAvatar(BuildContext context, User user) {
    return Text(
      user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
      style: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w900,
        fontSize: 28,
      ),
    );
  }

  Future<void> _pickAndUploadProfilePhoto() async {
    final picked = await UploadSourceDialog.pick(
      context: context,
      title: 'Update Profile Photo',
    );

    if (picked == null) return;

    final ext = picked.filename.split('.').last.toLowerCase();
    final allowedExts = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    if (!allowedExts.contains(ext)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unsupported file format. Please choose an image (PNG, JPG, WEBP, GIF).'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    dynamic fileData;
    if (kIsWeb) {
      if (picked.bytes == null) return;
      fileData = {'bytes': picked.bytes!, 'filename': picked.filename};
    } else {
      if (picked.path != null && picked.path!.isNotEmpty) {
        fileData = picked.path!;
      } else if (picked.bytes != null) {
        fileData = {'bytes': picked.bytes!, 'filename': picked.filename};
      }
    }

    if (fileData == null) return;

    try {
      final updatedUser = await AuthService.updateStudentProfile(
        token: widget.token,
        profilePicture: fileData,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile photo updated successfully.'),
          backgroundColor: AppColors.success,
        ),
      );

      setState(() {
        _futureUser = Future.value(updatedUser);
        _clearImageCache();
      });
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to upload profile photo: $err'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _pickAndUploadDocument() async {
    final picked = await UploadSourceDialog.pick(
      context: context,
      title: 'Upload / Re-upload proof',
    );

    if (picked == null) return;

    final uploadedFiles = <dynamic>[];

    if (kIsWeb) {
      if (picked.bytes != null) {
        uploadedFiles.add({
          'bytes': picked.bytes!,
          'filename': picked.filename,
        });
      }
    } else {
      if (picked.path != null && picked.path!.isNotEmpty) {
        uploadedFiles.add(picked.path!);
      } else if (picked.bytes != null) {
        uploadedFiles.add({
          'bytes': picked.bytes!,
          'filename': picked.filename,
        });
      }
    }

    if (uploadedFiles.isEmpty) return;

    try {
      final res = await AuthService.uploadProviderDocument(
        token: widget.token,
        files: uploadedFiles,
      );

      if (!mounted) return;

      final count = (res['organization_documents'] as List?)?.length ?? uploadedFiles.length;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$count verification document(s) uploaded successfully.'),
          backgroundColor: AppColors.success,
        ),
      );

      _refreshUserProfile();
    } catch (err) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to upload document: $err'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _logout(BuildContext context) async {
    await AuthService.logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const OnboardingScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final headerTextColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final headerSubtextColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;
    final pillBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final pillBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final pillLabelColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;
    final pillDividerColor = isDark ? AppColors.darkBorder : AppColors.border;
    final sheetBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final sheetBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: SafeArea(
        child: FutureBuilder<User>(
          future: _futureUser,
          builder: (context, snapshot) {
            final user = snapshot.data ?? widget.user;
            final profile = user.profile;
            final roleLabel = user.role.toUpperCase();

            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 540),
                child: SingleChildScrollView(
                  child: Column(
                children: [
                  // ─── TOP HERO BANNER ─────────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Column(
                      children: [
                        // Header Bar Title & Action Icon
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Row(
                                children: [
                                  const Icon(Icons.person_pin_rounded, color: AppColors.actionBlue, size: 28),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      'ACCOUNT',
                                      style: GoogleFonts.poppins(
                                        color: headerTextColor,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 18,
                                        letterSpacing: 1.2,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                              onPressed: () => _logout(context),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Avatar Circle
                        GestureDetector(
                          onTap: _pickAndUploadProfilePhoto,
                          child: Container(
                            width: 84,
                            height: 84,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppColors.primaryGradient,
                              border: Border.all(color: AppColors.actionBlue, width: 2.5),
                            ),
                            child: ClipOval(
                              child: user.profilePicture.isNotEmpty
                                  ? Image.network(
                                      user.profilePicture.startsWith('http')
                                          ? user.profilePicture
                                          : '${AppConstants.backendBaseUrl}${user.profilePicture}',
                                      key: ValueKey(user.profilePicture),
                                      cacheWidth: 168,
                                      cacheHeight: 168,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => _buildInitialAvatar(context, user),
                                    )
                                  : Center(child: _buildInitialAvatar(context, user)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        Text(
                          user.name,
                          style: GoogleFonts.poppins(
                            color: headerTextColor,
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: GoogleFonts.poppins(
                            color: headerSubtextColor,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),

                        // Status Info Pill Card
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: pillBg,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: pillBorder),
                            boxShadow: [
                              BoxShadow(
                                color: isDark
                                    ? Colors.black.withValues(alpha: 0.20)
                                    : const Color(0xFF15265C).withValues(alpha: 0.05),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              Expanded(
                                child: Column(
                                  children: [
                                    Text(
                                      'ROLE',
                                      style: GoogleFonts.poppins(
                                        color: pillLabelColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      roleLabel,
                                      style: GoogleFonts.poppins(
                                        color: headerTextColor,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 14,
                                      ),
                                      textAlign: TextAlign.center,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              Container(width: 1, height: 28, color: pillDividerColor),
                              Expanded(
                                child: Column(
                                  children: [
                                    Text(
                                      'STATUS',
                                      style: GoogleFonts.poppins(
                                        color: pillLabelColor,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      user.normalizedVerificationStatus.toUpperCase(),
                                      style: GoogleFonts.poppins(
                                        color: AppColors.success,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 14,
                                      ),
                                      textAlign: TextAlign.center,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ─── OVERLAPPING CONTENT FORM SHEET ─────────────────────────
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: sheetBg,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                      border: Border.all(color: sheetBorder),
                      boxShadow: [
                        BoxShadow(
                          color: isDark
                              ? Colors.black.withValues(alpha: 0.25)
                              : const Color(0xFF15265C).withValues(alpha: 0.06),
                          blurRadius: 14,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PROFILE DETAILS',
                          style: GoogleFonts.poppins(
                            color: textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 16),

                        _buildInfoTile(context, 'Full Name', user.name, isDark),
                        const SizedBox(height: 12),
                        _buildInfoTile(context, 'Email Address', user.email, isDark),
                        const SizedBox(height: 12),
                        _buildInfoTile(context, 'Role Type', roleLabel, isDark),

                        if (user.role == 'student') ...[
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'School',
                            profile?.school.isNotEmpty == true
                                ? profile!.school
                                : (user.school.isNotEmpty ? user.school : 'Not provided'),
                            isDark,
                          ),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'Course',
                            profile?.course.isNotEmpty == true
                                ? profile!.course
                                : (user.course.isNotEmpty ? user.course : 'Not provided'),
                            isDark,
                          ),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'Year Level',
                            profile?.yearLevel.isNotEmpty == true
                                ? profile!.yearLevel
                                : (user.yearLevel.isNotEmpty ? user.yearLevel : 'Not provided'),
                            isDark,
                          ),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'GPA / GWA',
                            profile?.gpa.isNotEmpty == true ? profile!.gpa : 'Not provided',
                            isDark,
                          ),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'Family Income',
                            profile?.familyIncome.isNotEmpty == true ? '₱${profile!.familyIncome}' : 'Not provided',
                            isDark,
                          ),
                          const SizedBox(height: 20),

                          PrimaryButton(
                            label: 'EDIT PROFILE',
                            onPressed: () async {
                              final updatedUser = await Navigator.of(context).push<User?>(
                                MaterialPageRoute(
                                  builder: (_) => StudentProfileEditScreen(
                                    user: user,
                                    token: widget.token,
                                  ),
                                ),
                              );
                              if (updatedUser != null && mounted) {
                                setState(() {
                                  _futureUser = Future.value(updatedUser);
                                  _clearImageCache();
                                });
                              }
                            },
                          ),
                        ],

                        if (user.isSponsor) ...[
                          const SizedBox(height: 16),
                          _buildInfoTile(
                            context,
                            'Company / Organization',
                            user.company.isNotEmpty ? user.company : 'Not provided',
                            isDark,
                          ),
                          const SizedBox(height: 16),
                          PrimaryButton(
                            label: user.organizationDocuments.isEmpty
                                ? 'Upload Verification Proof'
                                : 'Upload / Re-upload Proof',
                            onPressed: _pickAndUploadDocument,
                          ),
                        ],

                        const SizedBox(height: 20),
                        OutlinedButton(
                          onPressed: () => _logout(context),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.redAccent,
                            side: const BorderSide(color: Colors.redAccent, width: 1.5),
                            minimumSize: const Size(double.infinity, 50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: Text(
                            'LOGOUT',
                            style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
          },
        ),
      ),
    );
  }

  Widget _buildInfoTile(BuildContext context, String title, String value, bool isDark) {
    final tileBg = isDark
        ? AppColors.darkElevated
        : AppColors.lightBlueSurface.withValues(alpha: 0.55);
    final tileBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final labelColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;
    final valueColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: tileBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: tileBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.poppins(
              color: labelColor,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: GoogleFonts.poppins(
              color: valueColor,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
