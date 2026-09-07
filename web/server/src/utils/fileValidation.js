/**
 * ISKOLAR Strict Document & File Validation Engine
 * 
 * Verifies file signatures (magic bytes), MIME types, extensions, size constraints,
 * and detects disguised, malicious, or malformed files before storage.
 */

const crypto = require('crypto');
const path = require('path');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/**
 * Checks if buffer matches a specific byte signature at a given offset
 */
function matchBytes(buffer, signature, offset = 0) {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Detects file format based on magic bytes
 */
function detectMagicFormat(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (matchBytes(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return { ext: '.pdf', mime: 'application/pdf' };
  }

  // PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  if (matchBytes(buffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return { ext: '.png', mime: 'image/png' };
  }

  // JPEG: \xFF\xD8\xFF (0xFF 0xD8 0xFF)
  if (matchBytes(buffer, [0xFF, 0xD8, 0xFF])) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }

  // WebP: RIFF (0x52 0x49 0x46 0x46) .... WEBP (0x57 0x45 0x42 0x50)
  if (
    matchBytes(buffer, [0x52, 0x49, 0x46, 0x46], 0) &&
    matchBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Detects malicious/forbidden file signatures
 */
function detectDangerousSignatures(buffer, filename) {
  if (!buffer || buffer.length === 0) return 'Empty file payload';

  // Windows PE Executable (MZ)
  if (matchBytes(buffer, [0x4D, 0x5A])) {
    return 'Executable binary detected (Windows PE / MZ)';
  }

  // Linux ELF Binary (\x7FELF)
  if (matchBytes(buffer, [0x7F, 0x45, 0x4C, 0x46])) {
    return 'Executable binary detected (Linux ELF)';
  }

  // Mach-O Binaries (macOS)
  if (
    matchBytes(buffer, [0xFE, 0xED, 0xFA, 0xCE]) ||
    matchBytes(buffer, [0xFE, 0xED, 0xFA, 0xCF]) ||
    matchBytes(buffer, [0xCE, 0xFA, 0xED, 0xFE]) ||
    matchBytes(buffer, [0xCF, 0xFA, 0xED, 0xFE]) ||
    matchBytes(buffer, [0xCA, 0xFE, 0xBA, 0xBE]) // Java class / Mach-O universal
  ) {
    return 'Executable or compiled binary detected';
  }

  // Archives: ZIP / JAR / Office XML (PK\x03\x04)
  if (matchBytes(buffer, [0x50, 0x4B, 0x03, 0x04])) {
    return 'Compressed archive / package detected (ZIP/PK)';
  }

  // RAR Archive (Rar!\x1A\x07)
  if (matchBytes(buffer, [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07])) {
    return 'Compressed archive detected (RAR)';
  }

  // GZIP Archive (\x1F\x8B)
  if (matchBytes(buffer, [0x1F, 0x8B])) {
    return 'Compressed archive detected (GZIP)';
  }

  // 7-Zip Archive (7z\xBC\xAF\x27\x1C)
  if (matchBytes(buffer, [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])) {
    return 'Compressed archive detected (7z)';
  }

  // Script text inspect (first 512 bytes)
  const headerSnippet = buffer.subarray(0, 512).toString('utf8').toLowerCase();
  if (
    headerSnippet.startsWith('#!/bin/') ||
    headerSnippet.startsWith('#!/usr/bin/') ||
    headerSnippet.includes('<?php') ||
    headerSnippet.includes('<script') ||
    headerSnippet.includes('eval(') ||
    headerSnippet.includes('process.exit') ||
    headerSnippet.includes('child_process')
  ) {
    return 'Embedded script or shell payload detected';
  }

  return null;
}

/**
 * Validates a document file buffer and metadata
 * 
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} originalName - Original filename from client
 * @param {string} declaredMimeType - MIME type from multipart header
 * @param {object} options - Optional overrides (maxSize)
 * @returns {{ valid: boolean, code?: string, error?: string, hash?: string, mimeType?: string, extension?: string, size?: number }}
 */
function validateFile(buffer, originalName, declaredMimeType, options = {}) {
  if (!buffer || !(buffer instanceof Buffer) || buffer.length === 0) {
    return {
      valid: false,
      code: 'FILE_REQUIRED',
      error: 'Empty or invalid file buffer provided',
    };
  }

  const size = buffer.length;
  const maxSize = options.maxSize || MAX_FILE_SIZE_BYTES;
  if (size > maxSize) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      error: `File size (${Math.round(size / 1024 / 1024 * 10) / 10}MB) exceeds allowed limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // 1. Check for dangerous signatures
  const dangerousReason = detectDangerousSignatures(buffer, originalName);
  if (dangerousReason) {
    return {
      valid: false,
      code: 'FILE_SIGNATURE_INVALID',
      error: dangerousReason,
    };
  }

  // 2. Validate Extension
  const rawExt = path.extname(originalName || '').toLowerCase();
  if (!rawExt || !ALLOWED_EXTENSIONS.has(rawExt)) {
    return {
      valid: false,
      code: 'FILE_TYPE_NOT_ALLOWED',
      error: `File extension "${rawExt}" is not allowed. Supported formats: PDF, JPG, JPEG, PNG, WEBP.`,
    };
  }

  // 3. Verify Magic Bytes & Real Format
  const detected = detectMagicFormat(buffer);
  if (!detected) {
    return {
      valid: false,
      code: 'FILE_SIGNATURE_INVALID',
      error: 'File signature verification failed: Corrupt or unrecognized document format.',
    };
  }

  // 4. Verify Extension matches Signature (detect disguised files)
  const isJpgMatch = (rawExt === '.jpg' || rawExt === '.jpeg') && detected.ext === '.jpg';
  const isExtMatch = rawExt === detected.ext || isJpgMatch;
  if (!isExtMatch) {
    return {
      valid: false,
      code: 'FILE_SIGNATURE_INVALID',
      error: `Disguised file detected: File declared as "${rawExt}" but binary content is "${detected.ext}".`,
    };
  }

  // 5. Compute SHA256 Cryptographic Hash
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    valid: true,
    hash,
    mimeType: detected.mime,
    extension: detected.ext,
    size,
  };
}

module.exports = {
  validateFile,
  detectMagicFormat,
  detectDangerousSignatures,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};
