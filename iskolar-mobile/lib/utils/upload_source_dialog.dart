import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class UploadSourceDialog {
  static Future<_PickedSource?> pick({
    required BuildContext context,
    String title = 'Upload',
  }) async {
    final ImagePicker imagePicker = ImagePicker();

    return showDialog<_PickedSource>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text(title),
          content: const Text('Choose how you want to upload:'),
          actions: [
            TextButton.icon(
              onPressed: () async {
                final x = await imagePicker.pickImage(source: ImageSource.camera);
                if (x == null) return;

                if (kIsWeb) {
                  final bytes = await x.readAsBytes();
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(
                    _PickedSource.image(bytes: bytes, filename: x.name),
                  );
                } else {
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(
                    _PickedSource.image(path: x.path, filename: x.name),
                  );
                }
              },
              icon: const Icon(Icons.photo_camera_outlined),
              label: const Text('Take Photo'),
            ),
            TextButton.icon(
              onPressed: () async {
                final x = await imagePicker.pickImage(source: ImageSource.gallery);
                if (x == null) return;

                if (kIsWeb) {
                  final bytes = await x.readAsBytes();
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(
                    _PickedSource.image(bytes: bytes, filename: x.name),
                  );
                } else {
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(
                    _PickedSource.image(path: x.path, filename: x.name),
                  );
                }
              },
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('Choose from Gallery'),
            ),
            TextButton.icon(
              onPressed: () async {
                final result = await FilePicker.platform.pickFiles(
                  allowMultiple: false,
                  withData: true,
                );
                if (result == null || result.files.isEmpty) return;
                final f = result.files.first;

                if (kIsWeb) {
                  if (f.bytes == null) return;
                  if (!dialogContext.mounted) return;
                  Navigator.of(dialogContext).pop(
                    _PickedSource.file(bytes: f.bytes!, filename: f.name),
                  );
                } else {
                  if (f.path == null || f.path!.isEmpty) {
                    // Fallback to bytes if available
                    if (f.bytes == null) return;
                    if (!dialogContext.mounted) return;
                    Navigator.of(dialogContext).pop(
                      _PickedSource.file(bytes: f.bytes!, filename: f.name),
                    );
                  } else {
                    if (!dialogContext.mounted) return;
                    Navigator.of(dialogContext).pop(
                      _PickedSource.file(path: f.path!, filename: f.name),
                    );
                  }
                }
              },
              icon: const Icon(Icons.upload_file_outlined),
              label: const Text('Upload File'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(null),
              child: const Text('Cancel'),
            ),
          ],
        );
      },
    );
  }
}

class _PickedSource {
  final String? path;
  final List<int>? bytes;
  final String filename;
  final _SourceKind kind;

  const _PickedSource.image({
    this.path,
    this.bytes,
    required this.filename,
  }) : kind = _SourceKind.image;

  const _PickedSource.file({
    this.path,
    this.bytes,
    required this.filename,
  }) : kind = _SourceKind.file;
}

enum _SourceKind { image, file }



