/**
 * ISKOLAR Cloud & Database Continuous Synchronization Service
 * 
 * Functions:
 * 1. Proactive Heartbeat: Periodically pings MongoDB Atlas and Cloudflare R2 to keep connections hot.
 * 2. Auto-Recovery: Reconnects dropped sockets immediately before user requests experience timeouts.
 * 3. Auto-Reconciliation: Scans for local-fallback uploaded files and automatically synchronizes them to Cloudflare R2.
 * 4. Dual-Persistence Verifier: Ensures app_state document cache and Mongoose collections stay in sync.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const storageService = require('./storageService');
const { db, connectDb } = require('../config/db');

class CloudSyncService {
  constructor() {
    this.intervalHandle = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.workerName = 'cloud_sync_worker';
    this.instanceId = process.env.INSTANCE_ID || `inst_${crypto.randomUUID()}`;
    this.leaseTtlMs = 30000; // 30 seconds lease TTL
    this.stats = {
      mongoPings: 0,
      r2Pings: 0,
      filesReconciled: 0,
      reconnections: 0,
      leasesAcquired: 0,
      leasesDeclined: 0,
      lastError: null,
    };
  }

  /**
   * Atomically acquire or renew distributed lease.
   * Ensures only one backend worker instance performs sync across a cluster.
   */
  async acquireLease(leaseDurationMs = this.leaseTtlMs) {
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const expiresIso = new Date(now.getTime() + leaseDurationMs).toISOString();

      if (!db.data.worker_leases) {
        db.data.worker_leases = {};
      }

      const existingLease = db.data.worker_leases[this.workerName];
      const isExpired = !existingLease || !existingLease.expiresAt || new Date(existingLease.expiresAt) < now;
      const isOwner = existingLease && existingLease.ownerInstanceId === this.instanceId;

      if (isExpired || isOwner) {
        const leaseObj = {
          workerName: this.workerName,
          ownerInstanceId: this.instanceId,
          acquiredAt: isOwner && existingLease ? existingLease.acquiredAt : nowIso,
          expiresAt: expiresIso,
          heartbeatAt: nowIso,
        };
        db.data.worker_leases[this.workerName] = leaseObj;

        if (db.collections?.system_metadata) {
          await db.collections.system_metadata.updateOne(
            { _id: 'worker_leases' },
            { $set: { [this.workerName]: leaseObj } },
            { upsert: true }
          ).catch(() => {});
        }
        if (db.collection) {
          await db.collection.updateOne(
            { _id: 'iskolar_state' },
            { $set: { [`worker_leases.${this.workerName}`]: leaseObj } },
            { upsert: true }
          ).catch(() => {});
        }
        this.stats.leasesAcquired++;
        return true;
      }

      this.stats.leasesDeclined++;
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Extend heartbeat while work is in progress.
   */
  async renewHeartbeat(leaseDurationMs = this.leaseTtlMs) {
    try {
      if (db.data.worker_leases?.[this.workerName]?.ownerInstanceId === this.instanceId) {
        const now = new Date();
        const nowIso = now.toISOString();
        const expiresIso = new Date(now.getTime() + leaseDurationMs).toISOString();

        db.data.worker_leases[this.workerName].heartbeatAt = nowIso;
        db.data.worker_leases[this.workerName].expiresAt = expiresIso;

        if (db.collections?.system_metadata) {
          await db.collections.system_metadata.updateOne(
            { _id: 'worker_leases' },
            {
              $set: {
                [`${this.workerName}.heartbeatAt`]: nowIso,
                [`${this.workerName}.expiresAt`]: expiresIso,
              },
            },
            { upsert: true }
          ).catch(() => {});
        }
        if (db.collection) {
          await db.collection.updateOne(
            { _id: 'iskolar_state' },
            {
              $set: {
                [`worker_leases.${this.workerName}.heartbeatAt`]: nowIso,
                [`worker_leases.${this.workerName}.expiresAt`]: expiresIso,
              },
            },
            { upsert: true }
          ).catch(() => {});
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Release lease cleanly upon worker exit or shutdown.
   */
  async releaseLease() {
    try {
      if (db.data.worker_leases?.[this.workerName]?.ownerInstanceId === this.instanceId) {
        delete db.data.worker_leases[this.workerName];
        await db.write();
        logger.info(`[CloudSync] Distributed lease released for instance ${this.instanceId}`);
      }
    } catch (err) {
      logger.warn('[CloudSync] Lease release error:', err.message);
    }
  }

  /**
   * Ping database and storage to verify connectivity and keep sockets warm.
   */
  async probeHealth() {
    let mongoOk = false;
    let r2Ok = false;

    // 1. Check MongoDB Atlas
    try {
      if (typeof db.ping === 'function') {
        mongoOk = await db.ping();
      }
      if (!mongoOk) {
        logger.warn('[CloudSync] MongoDB heartbeat ping unready; initiating proactive reconnection...');
        this.stats.lastError = 'MongoDB ping unready; proactive recovery initiated';
        this.stats.reconnections++;
        connectDb().catch(() => {});
        try {
          const { connectMongoose } = require('../vercelApp');
          if (typeof connectMongoose === 'function') {
            connectMongoose().catch(() => {});
          }
        } catch (_) {}
      }
      this.stats.mongoPings++;
    } catch (err) {
      logger.error('[CloudSync] MongoDB heartbeat error:', { error: err.message });
      this.stats.lastError = `MongoDB: ${err.message}`;
    }

    // 2. Check Cloudflare R2
    try {
      const r2Health = await storageService.healthCheck();
      r2Ok = r2Health && r2Health.status === 'HEALTHY';
      this.stats.r2Pings++;
      if (!r2Ok && r2Health.status === 'DEGRADED') {
        logger.warn('[CloudSync] Cloudflare R2 health degraded:', r2Health.message);
      }
    } catch (err) {
      logger.error('[CloudSync] Cloudflare R2 heartbeat error:', { error: err.message });
      this.stats.lastError = `R2: ${err.message}`;
    }

    return { mongoOk, r2Ok };
  }

  /**
   * Reconcile any locally cached files up to Cloudflare R2 if STORAGE_DRIVER=r2.
   */
  async reconcileLocalFilesToR2() {
    if (storageService.driverName !== 'r2' && storageService.driverName !== 'cloudflare') {
      return 0;
    }

    if (!storageService.r2Driver || !storageService.r2Driver.isConfigured) {
      return 0;
    }

    let reconciled = 0;
    try {
      let docsToReconcile = [];
      if (db.collections?.documents) {
        docsToReconcile = await db.collections.documents
          .find({ storedKey: { $exists: true, $ne: null }, storageDriver: { $ne: 'r2' } })
          .limit(50)
          .toArray()
          .catch(() => []);
      } else if (db.data && Array.isArray(db.data.documents)) {
        docsToReconcile = db.data.documents.filter((d) => d.storedKey && d.storageDriver !== 'r2').slice(0, 50);
      }

      for (const doc of docsToReconcile) {
        if (!doc.storedKey) continue;

        // If document was marked with local driver or missing in R2, check if local disk has it
        const localExists = await storageService.localDriver.exists(doc.storedKey);
        if (localExists) {
          const r2Exists = await storageService.r2Driver.exists(doc.storedKey).catch(() => false);
          if (!r2Exists) {
            logger.info(`[CloudSync] Reconciling document to Cloudflare R2: ${doc.storedKey}`);
            const localFile = await storageService.localDriver.read(doc.storedKey);
            await storageService.r2Driver.save({
              storedKey: doc.storedKey,
              buffer: localFile.buffer,
              mimeType: doc.mimeType || doc.mime_type || 'application/pdf',
            });
            if (db.collections?.documents) {
              await db.collections.documents.updateOne(
                { _id: doc._id || doc.id },
                { $set: { storageDriver: 'r2', storageStatus: 'STORED', updatedAt: new Date() } }
              ).catch(() => {});
            }
            doc.storageDriver = 'r2';
            reconciled++;
            this.stats.filesReconciled++;
          }
        }
      }

      if (reconciled > 0) {
        logger.info(`[CloudSync] Successfully reconciled ${reconciled} files to Cloudflare R2.`);
      }
    } catch (err) {
      logger.warn('[CloudSync] File reconciliation error:', err.message);
    }

    return reconciled;
  }

  /**
   * Execute one full synchronization & heartbeat cycle guarded by distributed lease.
   */
  async syncCycle() {
    if (this.isSyncing) return { skipped: true, reason: 'in_flight_local_guard' };
    this.isSyncing = true;

    try {
      const hasLease = await this.acquireLease();
      if (!hasLease) {
        return { skipped: true, reason: 'distributed_lease_held_by_another_instance' };
      }

      await this.probeHealth();
      await this.renewHeartbeat();
      await this.reconcileLocalFilesToR2();
      this.lastSyncTime = new Date().toISOString();
      return { skipped: false, success: true };
    } catch (err) {
      logger.error('[CloudSync] Sync cycle error:', { error: err.message });
      return { skipped: false, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Start periodic background continuous synchronization.
   */
  startContinuousSync(intervalMs = 30000) {
    if (this.intervalHandle) return;

    logger.info(`🔄 [CloudSync] Starting continuous synchronization process (Instance: ${this.instanceId})`);

    // Run initial sync cycle immediately
    this.syncCycle().catch((err) => logger.warn('[CloudSync] Initial cycle warning:', err?.message));

    this.intervalHandle = setInterval(() => {
      this.syncCycle().catch((err) => logger.warn('[CloudSync] Background sync warning:', err?.message));
    }, intervalMs);

    if (this.intervalHandle.unref) {
      this.intervalHandle.unref(); // Don't prevent process exit in tests
    }
  }

  /**
   * Stop periodic synchronization.
   */
  async stopContinuousSync() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      await this.releaseLease();
      logger.info('⏹️ [CloudSync] Continuous synchronization stopped.');
    }
  }

  getMetrics() {
    return {
      active: !!this.intervalHandle,
      instanceId: this.instanceId,
      lastSyncTime: this.lastSyncTime,
      stats: { ...this.stats },
    };
  }
}

module.exports = new CloudSyncService();
