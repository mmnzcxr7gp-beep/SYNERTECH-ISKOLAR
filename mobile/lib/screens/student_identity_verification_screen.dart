import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/user_model.dart';
import '../services/verification_service.dart';
import '../services/ocr_service.dart';
import 'ocr_review_screen.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';

/// Student identity verification screen
/// Students upload Certificate of Registration (COR), School ID, and Selfie with School ID
class StudentVerificationScreen extends StatefulWidget {
  const StudentVerificationScreen({
    super.key,
    required this.user,
    required this.token,
  });

  final User user;
  final String token;

  @override
  State<StudentVerificationScreen> createState() =>
      _StudentVerificationScreenState();
}

class _StudentVerificationScreenState extends State<StudentVerificationScreen> {
  final ImagePicker _imagePicker = ImagePicker();

  File? _corImageFile;
  File? _schoolIdImageFile;
  File? _selfieImageFile;

  bool _isLoading = false;

  Future<void> _runOcrAndReview(File file) async {
    setState(() => _isLoading = true);
    try {
      final ocrResult = await OcrService.extractFromDocument(
        token: widget.token,
        filePath: file.path,
      );

      if (!mounted) return;

      final result = await Navigator.of(context).push<Map<String, dynamic>>(
        MaterialPageRoute(
          builder: (_) => OcrReviewScreen(
            token: widget.token,
            imagePath: file.path,
            ocrResult: ocrResult,
          ),
        ),
      );

      if (result != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('ID successfully verified for: ${result['fullName']}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('OCR check failed: ${e.toString().replaceAll('Exception: ', '')}. Proceeding manually.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickImage(String documentType) async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (pickedFile != null && pickedFile.path.isNotEmpty) {
        final file = File(pickedFile.path);
        setState(() {
          switch (documentType) {
            case 'cor':
              _corImageFile = file;
              break;
            case 'schoolId':
              _schoolIdImageFile = file;
              break;
            case 'selfie':
              _selfieImageFile = file;
              break;
          }
        });

        if (documentType == 'schoolId') {
          await _runOcrAndReview(file);
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error picking image: $e')),
      );
    }
  }

  Future<void> _takePhoto(String documentType) async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (pickedFile != null && pickedFile.path.isNotEmpty) {
        final file = File(pickedFile.path);
        setState(() {
          switch (documentType) {
            case 'cor':
              _corImageFile = file;
              break;
            case 'schoolId':
              _schoolIdImageFile = file;
              break;
            case 'selfie':
              _selfieImageFile = file;
              break;
          }
        });

        if (documentType == 'schoolId') {
          await _runOcrAndReview(file);
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error taking photo: $e')),
      );
    }
  }

  Future<void> _submitVerification() async {
    // Validation
    if (_corImageFile == null || _schoolIdImageFile == null || _selfieImageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please upload all required documents'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final schoolName = widget.user.school.isNotEmpty
          ? widget.user.school
          : widget.user.profile?.school ?? '';

      await VerificationService.submitStudentVerification(
        token: widget.token,
        lrn: '',
        schoolName: schoolName,
        governmentId: _schoolIdImageFile,
        selfieWithId: _selfieImageFile,
        certificateOfRegistration: _corImageFile,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Verification documents submitted successfully'),
            backgroundColor: Colors.green,
          ),
        );

        // Close and notify caller to refresh profile
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error submitting verification: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Student Verification',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.orange.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Verification Status',
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.user.verificationStatus == 'unverified'
                        ? 'Please upload your documents to verify your identity'
                        : widget.user.verificationStatus == 'pending'
                            ? 'Your documents are under review'
                            : widget.user.verificationStatus == 'verified'
                                ? 'Your account is verified ✓'
                                : 'Your verification was rejected. Please resubmit.',
                    style: const TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Document Upload Section 1: Certificate of Registration
            _buildDocumentUploadCard(
              title: 'Certificate of Registration (COR)',
              description: 'Front page of your COR or enrollment certificate',
              documentType: 'cor',
              imageFile: _corImageFile,
              onGalleryTap: () => _pickImage('cor'),
              onCameraTap: () => _takePhoto('cor'),
            ),
            const SizedBox(height: 24),

            // Document Upload Section 2: School ID
            _buildDocumentUploadCard(
              title: 'School ID - Front',
              description: 'Clear photo of your school ID (front side)',
              documentType: 'schoolId',
              imageFile: _schoolIdImageFile,
              onGalleryTap: () => _pickImage('schoolId'),
              onCameraTap: () => _takePhoto('schoolId'),
            ),
            const SizedBox(height: 24),

            // Document Upload Section 3: Selfie
            _buildDocumentUploadCard(
              title: 'Selfie with School ID',
              description: 'Take a clear selfie while holding your school ID',
              documentType: 'selfie',
              imageFile: _selfieImageFile,
              onGalleryTap: () => _pickImage('selfie'),
              onCameraTap: () => _takePhoto('selfie'),
              isSelfie: true,
            ),
            const SizedBox(height: 32),

            // Info Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.info_outline,
                        color: AppColors.primary,
                        size: 20,
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Important',
                          style: TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 12),
                  Text(
                    '• Ensure all documents are clear and readable\n'
                    '• Documents must not be expired\n'
                    '• Your face must be clearly visible in the selfie\n'
                    '• Verification typically takes 1-3 business days',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            PrimaryButton(
              label: _isLoading ? 'Submitting...' : 'Submit for Verification',
              onPressed: _isLoading ? null : _submitVerification,
              isLoading: _isLoading,
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentUploadCard({
    required String title,
    required String description,
    required String documentType,
    required File? imageFile,
    required VoidCallback onGalleryTap,
    required VoidCallback onCameraTap,
    bool isSelfie = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          if (imageFile == null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        strokeAlign: BorderSide.strokeAlignOutside,
                      ),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isSelfie ? Icons.camera_alt : Icons.image,
                            size: 40,
                            color: AppColors.primary.withValues(alpha: 0.5),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No image selected',
                            style: TextStyle(
                              color: AppColors.textSecondary.withValues(alpha: 0.7),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: onGalleryTap,
                          icon: const Icon(Icons.photo_library),
                          label: const Text('Gallery'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: onCameraTap,
                          icon: const Icon(Icons.camera_alt),
                          label: const Text('Camera'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            )
          else
            Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(
                      imageFile,
                      width: double.infinity,
                      height: 200,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                Positioned(
                  top: 20,
                  right: 20,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.black),
                      onPressed: () {
                        setState(() {
                          if (documentType == 'cor') {
                            _corImageFile = null;
                          } else if (documentType == 'schoolId') {
                            _schoolIdImageFile = null;
                          } else if (documentType == 'selfie') {
                            _selfieImageFile = null;
                          }
                        });
                      },
                    ),
                  ),
                ),
                Positioned(
                  bottom: 20,
                  left: 20,
                  right: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.check_circle,
                          color: Colors.white,
                          size: 16,
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Uploaded',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
