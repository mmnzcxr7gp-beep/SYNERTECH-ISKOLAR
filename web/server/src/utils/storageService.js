/**
 * ISKOLAR Unified Storage Abstraction Service
 * 
 * Supports:
 * - STORAGE_DRIVER=local (Development / Default local protected disk storage)
 * - STORAGE_DRIVER=r2    (Production / Cloud testing Cloudflare R2 Cloud Object Storage)
 * 
 * Required Interface:
 * - uploadFile()
 * - downloadFile()
 * - fileExists()
 * - getMetadata()
 * - deleteFile()
 * - replaceFile()
 * - healthCheck()
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateFile } = require('./fileValidation');

const uploadsBaseDir = path.join(__dirname, '../../uploads');

/* ========================================================================= */
/* LOCAL STORAGE DRIVER                                                      */
/* ========================================================================= */
class LocalStorageDriver {
  constructor(baseDir = uploadsBaseDir) {
    this.name = 'local';
    this.baseDir = baseDir;
    this.ensureBaseDir();
  }

  ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (_) {}
    }
  }

  resolveFullPath(storedKey) {
    const normalized = path.normalize(storedKey).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.baseDir, normalized);
  }

  async save({ storedKey, buffer, mimeType }) {
    const fullPath = this.resolveFullPath(storedKey);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
    return {
      driver: 'local',
      storedKey,
      fullPath,
      size: buffer.length,
      mimeType,
    };
  }

  async read(storedKey) {
    const fullPath = this.resolveFullPath(storedKey);
    let target = fullPath;
    if (!fs.existsSync(fullPath)) {
      const legacyPath = path.join(this.baseDir, path.basename(storedKey));
      if (fs.existsSync(legacyPath)) {
        target = legacyPath;
      } else {
        throw new Error(`File not found in local storage: ${storedKey}`);
      }
    }
    const buffer = await fs.promises.readFile(target);
    return {
      buffer,
      get stream() {
        return fs.createReadStream(target);
      },
      size: buffer.length,
    };
  }

  async delete(storedKey) {
    const fullPath = this.resolveFullPath(storedKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }

  async exists(storedKey) {
    const fullPath = this.resolveFullPath(storedKey);
    if (fs.existsSync(fullPath)) return true;
    const legacyPath = path.join(this.baseDir, path.basename(storedKey));
    return fs.existsSync(legacyPath);
  }

  async getMetadata(storedKey) {
    const fullPath = this.resolveFullPath(storedKey);
    let target = fullPath;
    if (!fs.existsSync(fullPath)) {
      const legacyPath = path.join(this.baseDir, path.basename(storedKey));
      if (fs.existsSync(legacyPath)) target = legacyPath;
      else throw new Error(`File not found: ${storedKey}`);
    }
    const stat = await fs.promises.stat(target);
    return {
      size: stat.size,
      lastModified: stat.mtime,
      storedKey,
      driver: 'local',
    };
  }

  async checkHealth() {
    try {
      this.ensureBaseDir();
      const testFile = path.join(this.baseDir, '.health_check_tmp');
      await fs.promises.writeFile(testFile, 'health-ok');
      const readBack = await fs.promises.readFile(testFile, 'utf8');
      await fs.promises.unlink(testFile);
      const isReadable = readBack === 'health-ok';
      return {
        driver: 'local',
        configured: true,
        reachable: true,
        readable: isReadable,
        writable: true,
        status: 'HEALTHY',
      };
    } catch (err) {
      return {
        driver: 'local',
        configured: true,
        reachable: false,
        readable: false,
        writable: false,
        status: 'DEGRADED',
      };
    }
  }
}

/* ========================================================================= */
/* CLOUDFLARE R2 DRIVER (S3-Compatible Object Storage)                       */
/* ========================================================================= */
class R2StorageDriver {
  constructor(config = {}) {
    this.name = 'r2';
    this.accountId = config.accountId !== undefined ? config.accountId : (process.env.R2_ACCOUNT_ID || '');
    this.bucket = config.bucket !== undefined ? config.bucket : (process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || '');
    this.endpoint =
      config.endpoint !== undefined
        ? config.endpoint
        : (process.env.R2_ENDPOINT ||
           process.env.S3_ENDPOINT ||
           (this.accountId ? `https://${this.accountId}.r2.cloudflarestorage.com` : ''));
    this.accessKeyId =
      config.accessKeyId !== undefined ? config.accessKeyId : (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '');
    this.secretAccessKey =
      config.secretAccessKey !== undefined
        ? config.secretAccessKey
        : (process.env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || '');
    this.region = config.region !== undefined ? config.region : (process.env.R2_REGION || process.env.AWS_REGION || 'auto');

    this.s3Client = null;
    this.initClient();
  }

  get isConfigured() {
    return Boolean(this.bucket && (this.endpoint || this.accountId) && this.accessKeyId && this.secretAccessKey);
  }

  initClient() {
    if (!this.isConfigured) {
      this.s3Client = null;
      return;
    }
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      const endpoint = this.endpoint || (this.accountId ? `https://${this.accountId}.r2.cloudflarestorage.com` : '');
      this.s3Client = new S3Client({
        region: this.region,
        endpoint,
        forcePathStyle: true,
        maxAttempts: 5,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    } catch (err) {
      console.warn('⚠️ Cloudflare R2 Client initialization warning:', err.message);
    }
  }

  ensureClient() {
    if (!this.isConfigured) {
      throw new Error('Cloudflare R2 storage is not configured or credentials (R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing');
    }
    if (!this.s3Client) {
      this.initClient();
    }
    if (!this.s3Client) {
      throw new Error('Cloudflare R2 storage is not configured or credentials (R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing');
    }
  }

  async save({ storedKey, buffer, mimeType }) {
    this.ensureClient();
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const { withRetry } = require('./resilience');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storedKey,
      Body: buffer,
      ContentType: mimeType,
    });

    await withRetry(
      () => this.s3Client.send(command),
      { retries: 3, baseDelayMs: 400, name: 'r2.save' }
    );

    return {
      driver: 'r2',
      bucket: this.bucket,
      storedKey,
      size: buffer.length,
      mimeType,
    };
  }

  async read(storedKey) {
    this.ensureClient();
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const { withRetry } = require('./resilience');

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storedKey,
    });
    try {
      const response = await withRetry(
        () => this.s3Client.send(command),
        { retries: 3, baseDelayMs: 300, name: 'r2.read' }
      );
      const streamToBuffer = async (stream) => {
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
      };
      const buffer = await streamToBuffer(response.Body);
      return {
        buffer,
        stream: response.Body,
        size: response.ContentLength || buffer.length,
        mimeType: response.ContentType,
      };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        const notFoundErr = new Error(`File not found in R2 storage: ${storedKey}`);
        notFoundErr.name = 'NotFound';
        notFoundErr.code = 'ENOENT';
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
      throw err;
    }
  }

  async delete(storedKey) {
    if (!this.isConfigured) return;
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const { withRetry } = require('./resilience');

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storedKey,
    });
    await withRetry(
      () => this.s3Client.send(command),
      { retries: 2, baseDelayMs: 300, name: 'r2.delete' }
    ).catch(() => {});
  }

  async exists(storedKey) {
    if (!this.isConfigured) return false;
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    const { withRetry } = require('./resilience');

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storedKey,
      });
      await withRetry(
        () => this.s3Client.send(command),
        { retries: 2, baseDelayMs: 300, name: 'r2.exists' }
      );
      return true;
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async getMetadata(storedKey) {
    this.ensureClient();
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    const { withRetry } = require('./resilience');

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: storedKey,
    });
    try {
      const response = await withRetry(
        () => this.s3Client.send(command),
        { retries: 3, baseDelayMs: 300, name: 'r2.getMetadata' }
      );
      return {
        size: response.ContentLength,
        mimeType: response.ContentType,
        lastModified: response.LastModified,
        storedKey,
        driver: 'r2',
        bucket: this.bucket,
      };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        const notFoundErr = new Error(`File not found in R2 storage: ${storedKey}`);
        notFoundErr.name = 'NotFound';
        notFoundErr.code = 'ENOENT';
        notFoundErr.statusCode = 404;
        throw notFoundErr;
      }
      throw err;
    }
  }

  async checkHealth() {
    if (!this.isConfigured) {
      return {
        driver: 'r2',
        configured: false,
        reachable: false,
        readable: false,
        writable: false,
        status: 'MISCONFIGURED',
        message: 'Cloudflare R2 storage credentials (R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing or incomplete',
      };
    }

    try {
      const { HeadBucketCommand } = require('@aws-sdk/client-s3');
      const { withRetry } = require('./resilience');

      await withRetry(
        () => this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket })),
        { retries: 2, baseDelayMs: 300, name: 'r2.healthCheck' }
      );

      return {
        driver: 'r2',
        configured: true,
        reachable: true,
        readable: true,
        writable: true,
        status: 'HEALTHY',
        message: 'Cloudflare R2 bucket connection is healthy and responsive',
      };
    } catch (err) {
      const isAuthError = err.name === 'InvalidAccessKeyId' || err.name === 'SignatureDoesNotMatch' || err.$metadata?.httpStatusCode === 403;
      return {
        driver: 'r2',
        configured: true,
        reachable: false,
        readable: false,
        writable: false,
        status: isAuthError ? 'UNAVAILABLE' : 'DEGRADED',
        message: isAuthError ? 'Authentication failure connecting to Cloudflare R2' : `Cloudflare R2 error: ${err.message}`,
      };
    }
  }
}

/* ========================================================================= */
/* UNIFIED STORAGE SERVICE ABSTRACTION                                       */
/* ========================================================================= */
class StorageService {
  constructor() {
    this.localDriver = new LocalStorageDriver();
    this.r2Driver = new R2StorageDriver();
  }

  get driverName() {
    return (process.env.STORAGE_DRIVER || process.env.STORAGE_TYPE || 'local').toLowerCase();
  }

  get activeDriver() {
    const d = this.driverName;
    if (d === 'r2' || d === 'cloudflare' || d === 's3') {
      return this.r2Driver;
    }
    return this.localDriver;
  }

  /**
   * Generates safe, non-identifying object key without PII
   * Format: applications/{applicationId}/documents/{documentId}/v{version}/{uuid}.{ext}
   */
  generateObjectKey({ applicationId = 'general', documentId = 'doc', version = 1, extension = '.pdf' }) {
    const cleanAppId = String(applicationId || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanDocId = String(documentId || 'doc').replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanVersion = Math.max(1, parseInt(version, 10) || 1);
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    return `applications/${cleanAppId}/documents/${cleanDocId}/v${cleanVersion}/${uuid}${cleanExt.toLowerCase()}`;
  }

  /**
   * Upload a file with strict signature & magic bytes validation
   */
  async uploadFile({
    buffer,
    originalName,
    mimeType,
    applicationId = 'general',
    documentId = 'doc',
    version = 1,
    studentId,
    providerId,
    customKey,
  }) {
    // 1. Strict File Validation
    const validation = validateFile(buffer, originalName, mimeType);
    if (!validation.valid) {
      const err = new Error(validation.error || 'File Validation Failed');
      err.code = validation.code || 'FILE_SIGNATURE_INVALID';
      err.statusCode = validation.code === 'FILE_TOO_LARGE' ? 413 : 400;
      throw err;
    }

    // 2. Generate Safe Object Key (applications/{applicationId}/documents/{documentId}/v{version}/{uuid}.{ext})
    const storedKey =
      customKey ||
      this.generateObjectKey({
        applicationId,
        documentId,
        version,
        extension: validation.extension,
      });

    // 3. Persist through active driver (Local or R2)
    const driver = this.activeDriver;
    let saveResult;
    try {
      saveResult = await driver.save({
        storedKey,
        buffer,
        mimeType: validation.mimeType,
      });
    } catch (saveErr) {
      if (driver.name === 'r2' && process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ Cloudflare R2 unavailable (${saveErr.message}). Using local demo storage labeled as demo storage.`);
        saveResult = await this.localDriver.save({
          storedKey,
          buffer,
          mimeType: validation.mimeType,
        });
        saveResult.driver = 'local_demo_storage';
      } else {
        const err = new Error(`Storage Save Failed: ${saveErr.message}`);
        err.code = 'STORAGE_UNAVAILABLE';
        err.statusCode = 503;
        throw err;
      }
    }

    return {
      storedKey,
      storageDriver: saveResult.driver,
      bucket: saveResult.bucket || null,
      fileHash: validation.hash,
      mimeType: validation.mimeType,
      size: validation.size,
      originalName: originalName || 'document' + validation.extension,
      version: Math.max(1, parseInt(version, 10) || 1),
      uploadedAt: new Date().toISOString(),
      url: `/api/documents/download?key=${encodeURIComponent(storedKey)}`,
    };
  }

  /**
   * Download a file buffer and stream
   */
  async downloadFile(storedKey) {
    if (!storedKey || typeof storedKey !== 'string') {
      throw new Error('Invalid or missing storedKey');
    }

    const driver = this.activeDriver;
    try {
      return await driver.read(storedKey);
    } catch (err) {
      if (driver.name === 'r2' && (err.name === 'NotFound' || err.code === 'ENOENT' || err.statusCode === 404)) {
        const localExists = await this.localDriver.exists(storedKey);
        if (localExists) {
          return await this.localDriver.read(storedKey);
        }
      }
      throw err;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(storedKey) {
    if (!storedKey) return;
    await this.activeDriver.delete(storedKey);
  }

  /**
   * Check if file exists
   */
  async fileExists(storedKey) {
    if (!storedKey) return false;
    const exists = await this.activeDriver.exists(storedKey);
    if (!exists && this.activeDriver.name === 'r2') {
      return await this.localDriver.exists(storedKey);
    }
    return exists;
  }

  /**
   * Get metadata
   */
  async getMetadata(storedKey) {
    if (!storedKey) throw new Error('Invalid or missing storedKey');
    return await this.activeDriver.getMetadata(storedKey);
  }

  /**
   * Replace an existing file while preserving replacement history and incrementing version
   */
  async replaceFile({
    oldStoredKey,
    buffer,
    originalName,
    mimeType,
    applicationId = 'general',
    documentId = 'doc',
    version = 2,
    studentId,
    reason,
  }) {
    const newUpload = await this.uploadFile({
      buffer,
      originalName,
      mimeType,
      applicationId,
      documentId,
      version,
      studentId,
    });

    return {
      ...newUpload,
      previousStoredKey: oldStoredKey,
      replacementReason: reason || 'Document replacement uploaded',
      replacedAt: new Date().toISOString(),
    };
  }

  /**
   * Authenticated administrative storage-health check reporting only:
   * driver, configured, reachable, readable, writable, status
   * Allowed statuses: HEALTHY, DEGRADED, MISCONFIGURED, UNAVAILABLE
   */
  async healthCheck() {
    const active = this.activeDriver;
    const health = await active.checkHealth();
    return {
      driver: health.driver,
      configured: health.configured,
      reachable: health.reachable,
      readable: health.readable,
      writable: health.writable,
      status: health.status,
      message: health.message,
    };
  }

  // Alias for backwards compatibility
  async checkHealth() {
    return this.healthCheck();
  }

  info() {
    return {
      activeDriver: this.driverName,
      isR2Configured: this.r2Driver.isConfigured,
      localDirExists: fs.existsSync(uploadsBaseDir),
    };
  }
}

module.exports = new StorageService();
