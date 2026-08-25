import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';

class StudentPrivacySecurityScreen extends StatefulWidget {
  const StudentPrivacySecurityScreen({super.key, required this.token});

  final String token;

  @override
  State<StudentPrivacySecurityScreen> createState() =>
      _StudentPrivacySecurityScreenState();
}

class _StudentPrivacySecurityScreenState
    extends State<StudentPrivacySecurityScreen> {
  bool _requireBiometrics = false;
  bool _autoLogout = true;
  bool _shareUsageData = false;

  Future<void> _signOutAllDevices() async {
    await AuthService.logout();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Signed out from all devices.')),
    );
  }

  void _showPrivacyPolicy() {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Privacy Policy'),
          content: const SingleChildScrollView(
            child: Text(
              'Your personal data is used to provide and improve ISKOLAR services. We store your profile securely and do not share your information without consent. You may disable analytics data sharing at any time.',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Privacy & Security')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: ListView(
            children: [
              Text(
                'Privacy & security',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Control how your account stays safe and how app data is used.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 24),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    SwitchListTile(
                      title: const Text('Require biometrics'),
                      subtitle: const Text(
                        'Use face or fingerprint unlock when available',
                      ),
                      value: _requireBiometrics,
                      onChanged: (value) =>
                          setState(() => _requireBiometrics = value),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Auto logout after inactivity'),
                      subtitle: const Text(
                        'Log out automatically when the app is idle',
                      ),
                      value: _autoLogout,
                      onChanged: (value) => setState(() => _autoLogout = value),
                    ),
                    const Divider(height: 1),
                    SwitchListTile(
                      title: const Text('Share anonymous usage data'),
                      subtitle: const Text(
                        'Help improve the app while protecting your privacy',
                      ),
                      value: _shareUsageData,
                      onChanged: (value) =>
                          setState(() => _shareUsageData = value),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.privacy_tip_outlined),
                      title: const Text('View privacy policy'),
                      subtitle: const Text(
                        'Read how your information is protected',
                      ),
                      onTap: _showPrivacyPolicy,
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(Icons.history_outlined),
                      title: const Text('Manage session activity'),
                      subtitle: const Text(
                        'Review your recent login activity and security status',
                      ),
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Session activity is currently unavailable.',
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                label: 'Sign out from all devices',
                leftIcon: const Icon(Icons.logout_outlined),
                onPressed: _signOutAllDevices,
              ),
              const SizedBox(height: 14),
              Text(
                'Privacy & security settings are intended to help you keep your account safe. Changes here affect how you access the app and how we treat your usage information.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
