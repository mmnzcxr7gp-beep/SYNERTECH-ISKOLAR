const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../../uploads');

/**
 * Pluggable Storage Abstraction for ISKOLAR Documents & Media.
 * Default: Local Disk Storage.
 * Production Ready: S3 / Cloud Object Storage interface hook.
 */
class StorageService {
  async saveFile({ filename, buffer, mimeType }) {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const targetPath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(targetPath, buffer);
    return {
      storageType: 'local',
      filename,
      url: `/uploads/${filename}`,
      path: targetPath,
    };
  }

  async getFileStream(filename) {
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(filePath);
  }

  async deleteFile(filename) {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath).catch(() => {});
    }
  }
}

module.exports = new StorageService();
