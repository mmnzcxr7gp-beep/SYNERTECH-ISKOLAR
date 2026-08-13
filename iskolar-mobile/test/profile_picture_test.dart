import 'package:flutter_test/flutter_test.dart';
import 'package:iskolar_mobile/models/user_model.dart';

void main() {
  group('Profile Picture Model & Persistence Tests', () {
    final initialUserData = {
      'id': 1,
      'name': 'Juan Cruz',
      'email': 'juan@example.com',
      'role': 'student',
      'profilePicture': '/uploads/avatar_1.png',
    };

    test('1. User.fromJson parses profilePicture correctly', () {
      final user = User.fromJson(initialUserData);
      expect(user.profilePicture, '/uploads/avatar_1.png');
    });

    test('2. Updating profilePicture updates stored reference', () {
      final user = User.fromJson(initialUserData);
      final updatedJson = Map<String, dynamic>.from(initialUserData);
      updatedJson['profilePicture'] = '/uploads/avatar_2.png';

      final updatedUser = User.fromJson(updatedJson);
      expect(updatedUser.profilePicture, '/uploads/avatar_2.png');
      expect(updatedUser.profilePicture != user.profilePicture, true);
    });

    test('3. User serialization and deserialization retains profilePicture after app restart', () {
      final user = User.fromJson(initialUserData);
      final serialized = user.toJsonString();
      final restored = User.fromJsonString(serialized);

      expect(restored.profilePicture, user.profilePicture);
      expect(restored.id, user.id);
      expect(restored.email, user.email);
    });

    test('4. Default placeholder initials active when profilePicture is empty', () {
      final noPicUserData = {
        'id': 2,
        'name': 'Maria Santos',
        'email': 'maria@example.com',
        'role': 'student',
        'profilePicture': '',
      };
      final user = User.fromJson(noPicUserData);
      expect(user.profilePicture.isEmpty, true);
      expect(user.name[0].toUpperCase(), 'M');
    });
  });
}
