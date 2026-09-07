import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../utils/upload_source_dialog.dart';
import '../widgets/primary_button.dart';
import '../widgets/styled_text_field.dart';
import '../widgets/student_dashboard_scaffold.dart';

class StudentProfileEditScreen extends StatefulWidget {
  const StudentProfileEditScreen({
    super.key,
    required this.user,
    required this.token,
  });

  final User user;
  final String token;

  @override
  State<StudentProfileEditScreen> createState() =>
      _StudentProfileEditScreenState();
}

class _StudentProfileEditScreenState extends State<StudentProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _firstNameController;
  late final TextEditingController _lastNameController;
  late final TextEditingController _schoolController;
  late final TextEditingController _courseController;
  late final TextEditingController _yearLevelController;
  late final TextEditingController _achievementsController;

  String? _selectedImagePath;
  List<int>? _selectedImageBytes;
  String? _selectedImageFilename;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = widget.user;
    final profile = user.profile;

    _firstNameController = TextEditingController(text: user.firstName);
    _lastNameController = TextEditingController(text: user.lastName);
    _schoolController = TextEditingController(text: profile?.school ?? '');
    _courseController = TextEditingController(text: profile?.course ?? '');
    _yearLevelController = TextEditingController(text: profile?.yearLevel ?? user.yearLevel);
    _achievementsController = TextEditingController(text: profile?.achievements ?? '');
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _schoolController.dispose();
    _courseController.dispose();
    _yearLevelController.dispose();
    _achievementsController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _isSaving = true);

    dynamic profilePic;
    if (kIsWeb && _selectedImageBytes != null) {
      profilePic = {
        'bytes': _selectedImageBytes,
        'filename': _selectedImageFilename ?? 'profile.jpg',
      };
    } else {
      profilePic = _selectedImagePath;
    }

    try {
      final updatedUser = await AuthService.updateStudentProfile(
        token: widget.token,
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        school: _schoolController.text.trim(),
        course: _courseController.text.trim(),
        yearLevel: _yearLevelController.text.trim(),
        achievements: _achievementsController.text.trim(),
        profilePicture: profilePic,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved successfully.')),
      );
      Navigator.of(context).pop(updatedUser);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save profile. ${error.toString()}')),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    TextInputAction textInputAction = TextInputAction.next,
    String? hint,
    bool requiredField = true,
  }) {
    return StyledTextField(
      controller: controller,
      label: label,
      hint: hint,
      keyboardType: keyboardType,
      maxLines: maxLines,
      textInputAction: textInputAction,
      validator: requiredField
          ? (value) {
              if ((value?.trim().isEmpty ?? true)) {
                return '$label is required';
              }
              return null;
            }
          : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return StudentDashboardScaffold(
      title: 'Edit Student Profile',
      showHeader: true,
      child: Stack(
        children: [
          Card(
            elevation: 0,
            color: AppColors.surfaceDark,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(
                color: AppColors.border.withValues(alpha: 0.55),
                width: 1,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                autovalidateMode: AutovalidateMode.onUserInteraction,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Edit your student profile',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                    ),
                    const SizedBox(height: 20),
                    // Profile Picture Upload Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border.withValues(alpha: 0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Profile Picture',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.white),
                          ),
                          const SizedBox(height: 12),
                          if (_selectedImagePath != null || _selectedImageBytes != null)
                            Container(
                              height: 120,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.primary),
                              ),
                              child: _selectedImageBytes != null
                                  ? Image.memory(
                                      Uint8List.fromList(_selectedImageBytes!),
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: 120,
                                    )
                                  : Image.file(
                                      File(_selectedImagePath!),
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                      height: 120,
                                    ),
                            )
                          else
                            Container(
                              height: 120,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border.withValues(alpha: 0.2)),
                              ),
                              child: const Center(
                                child: Icon(Icons.photo_library_outlined, color: Colors.white54),
                              ),
                            ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            onPressed: () async {
                              final picked = await UploadSourceDialog.pick(
                                context: context,
                                title: 'Upload Profile Picture',
                              );
                              if (picked != null) {
                                setState(() {
                                  _selectedImagePath = picked.path;
                                  _selectedImageBytes = picked.bytes;
                                  _selectedImageFilename = picked.filename;
                                });
                              }
                            },
                            icon: const Icon(Icons.upload_file_rounded),
                            label: Text(_selectedImagePath != null || _selectedImageBytes != null
                                ? 'Change Picture'
                                : 'Choose Picture'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    _buildTextField(
                      'First Name',
                      _firstNameController,
                      hint: 'Enter your first name',
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      'Last Name',
                      _lastNameController,
                      hint: 'Enter your last name',
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      'School',
                      _schoolController,
                      hint: 'Enter your school',
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      'Course',
                      _courseController,
                      hint: 'Enter your course',
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      'Year Level',
                      _yearLevelController,
                      hint: 'e.g., 1st Year, 2nd Year',
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    _buildTextField(
                      'Achievements',
                      _achievementsController,
                      hint: 'Share awards or accomplishments',
                      maxLines: 4,
                      textInputAction: TextInputAction.next,
                      requiredField: false,
                    ),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: _isSaving ? 'Saving...' : 'Save profile',
                      isLoading: _isSaving,
                      disabled: _isSaving,
                      onPressed: _saveProfile,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_isSaving)
            Positioned.fill(
              child: IgnorePointer(
                child: Container(
                  color: Colors.white.withValues(alpha: 0.14),
                  child: const Center(
                    child: SizedBox(
                      width: 34,
                      height: 34,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                      ),
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

