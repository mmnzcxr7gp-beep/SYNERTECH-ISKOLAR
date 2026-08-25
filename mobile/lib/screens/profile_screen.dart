import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

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
    return Scaffold(
      backgroundColor: AppColors.backgroundDark, // Warm Near-Black Header
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
                  // ─── TOP HERO BANNER (REF SCREEN #4) ──────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                    child: Column(
                      children: [
                        // Header Bar Title & Action Icon
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.person_pin_rounded, color: AppColors.primary, size: 28),
                                SizedBox(width: 8),
                                Text(
                                  'ACCOUNT',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 18,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ],
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
                              border: Border.all(color: AppColors.primary, width: 2.5),
                            ),
                            child: ClipOval(
                              child: user.profilePicture.isNotEmpty
                                  ? Image.network(
                                      user.profilePicture.startsWith('http')
                                          ? user.profilePicture
                                          : '${AppConstants.backendBaseUrl}${user.profilePicture}',
                                      key: ValueKey(user.profilePicture),
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
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user.email,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Status Info Pill Card (Ref Screen #4)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              Column(
                                children: [
                                  Text(
                                    'ROLE',
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    roleLabel,
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                                  ),
                                ],
                              ),
                              Container(width: 1, height: 28, color: Colors.white24),
                              Column(
                                children: [
                                  Text(
                                    'STATUS',
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    user.normalizedVerificationStatus.toUpperCase(),
                                    style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w900, fontSize: 14),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ─── OVERLAPPING CONTENT FORM SHEET (REF SCREEN #4) ─────────
                  Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PROFILE DETAILS',
                          style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.1,
                          ),
                        ),
                        const SizedBox(height: 16),

                        _buildInfoTile(context, 'Full Name', user.name),
                        const SizedBox(height: 12),
                        _buildInfoTile(context, 'Email Address', user.email),
                        const SizedBox(height: 12),
                        _buildInfoTile(context, 'Role Type', roleLabel),

                        if (user.role == 'student') ...[
                          const SizedBox(height: 12),
                          _buildInfoTile(context, 'School', profile?.school ?? 'Not provided'),
                          const SizedBox(height: 12),
                          _buildInfoTile(context, 'Course', profile?.course ?? 'Not provided'),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'GPA',
                            profile?.gpa.isNotEmpty == true ? profile!.gpa : 'Not provided',
                          ),
                          const SizedBox(height: 12),
                          _buildInfoTile(
                            context,
                            'Family Income',
                            profile?.familyIncome.isNotEmpty == true ? profile!.familyIncome : 'Not provided',
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
                          child: const Text('LOGOUT', style: TextStyle(fontWeight: FontWeight.bold)),
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

  Widget _buildInfoTile(BuildContext context, String title, String value) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
