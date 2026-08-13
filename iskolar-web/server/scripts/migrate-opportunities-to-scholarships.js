/**
 * One-time migration: ScholarshipOpportunity -> Scholarship
 *
 * Usage:
 *   node scripts/migrate-opportunities-to-scholarships.js
 *
 * What it does:
 * - Creates a new Scholarship collection (requires model + schema to exist)
 * - Migrates documents from ScholarshipOpportunity to Scholarship
 * - Migrates ScholarshipRequirement documents and remaps scholarshipId
 * - Updates ScholarshipApplication documents to point to the new Scholarship ids
 *
 * IMPORTANT:
 * - This script assumes you will create the new model files:
 *   backend/src/models/Scholarship.js
 * - and update refs in ScholarshipRequirement and ScholarshipApplication.
 */

const dotenvPath = require('path').resolve(__dirname, '..', '.env');
require('dotenv').config({ path: dotenvPath });


const mongoose = require('mongoose');
const path = require('path');

const MongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iskolar';


async function main() {
  console.log(`[migration] Connecting to Mongo: ${MongoUri}`);
  await mongoose.connect(MongoUri);

  const models = require('../src/models');

  const {
    ScholarshipOpportunity,
    ScholarshipRequirement,
    ScholarshipApplication,
  } = models;

  if (!models.Scholarship) {
    throw new Error(
      'Missing models.Scholarship. Create backend/src/models/Scholarship.js and export it from backend/src/models/index.js'
    );
  }

  const { Scholarship } = models;

  console.log(`[migration] Counting opportunities...`);
  const opportunities = await ScholarshipOpportunity.find({});
  console.log(`[migration] Found ${opportunities.length} opportunities`);

  const idMap = new Map(); // oldOpportunityId(string) -> newScholarshipId(ObjectId)

  // 1) Migrate opportunities -> scholarships
  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];

    const newScholarship = await Scholarship.create({
      providerId: opp.providerId,
      title: opp.title,
      description: opp.description,
      type: opp.type,
      benefits: opp.benefits,
      eligibilityRequirements: opp.eligibilityRequirements,
      totalSlots: opp.totalSlots,
      applicantsCount: opp.applicantsCount ?? 0,
      approvedCount: opp.approvedCount ?? 0,
      applicationDeadline: opp.applicationDeadline,
      status: opp.status,
      allowance: opp.allowance ?? 0,
      maxAmount: opp.maxAmount ?? 0,
      // createdAt/updatedAt are managed by timestamps, but we can try to preserve:
      createdAt: opp.createdAt ?? undefined,
      updatedAt: opp.updatedAt ?? undefined,
    });

    idMap.set(String(opp._id), String(newScholarship._id));

    if ((i + 1) % 50 === 0) {
      console.log(`[migration] Created ${i + 1}/${opportunities.length} scholarships...`);
    }
  }

  console.log(`[migration] Migrating requirements...`);
  const requirements = await ScholarshipRequirement.find({});

  // Debug counts: how requirements link today
  const opportunityIds = new Set(opportunities.map((o) => String(o._id)));
  const scholarshipIdsExisting = new Set();
  for (const v of idMap.values()) scholarshipIdsExisting.add(v);

  let reqMatchesOpportunity = 0;
  let reqMatchesNewScholarship = 0;
  for (const req of requirements) {
    const sid = String(req.scholarshipId);
    if (opportunityIds.has(sid)) reqMatchesOpportunity++;
    if (scholarshipIdsExisting.has(sid)) reqMatchesNewScholarship++;
  }

  console.log(`[migration] Requirements total: ${requirements.length}`);
  console.log(`[migration] Requirements whose scholarshipId matches OPPORTUNITY id: ${reqMatchesOpportunity}`);
  console.log(`[migration] Requirements whose scholarshipId matches NEW scholarship id: ${reqMatchesNewScholarship}`);

  // Sample requirement scholarshipId values (debug)
  const sampleReq = requirements.slice(0, 10);
  console.log('[migration] Sample ScholarshipRequirement.scholarshipId values:');
  for (const r of sampleReq) {
    console.log('  -', String(r.scholarshipId));
  }

  // Check how those sample ids relate to collections
  const scholarshipIdsExistingSet = new Set();
  const scholarshipIdsExistingArr = await Scholarship.distinct('_id');
  for (const sid of scholarshipIdsExistingArr) scholarshipIdsExistingSet.add(String(sid));

  let sampleIdsExistInScholarship = 0;
  for (const r of sampleReq) {
    if (scholarshipIdsExistingSet.has(String(r.scholarshipId))) sampleIdsExistInScholarship++;
  }
  console.log(`[migration] Sample ids exist in Scholarship collection: ${sampleIdsExistInScholarship}/${sampleReq.length}`);

  const opportunityIdsSet = new Set();
  const oppIdsArr = await ScholarshipOpportunity.distinct('_id');
  for (const oid of oppIdsArr) opportunityIdsSet.add(String(oid));

  let sampleIdsExistInOpportunity = 0;
  for (const r of sampleReq) {
    if (opportunityIdsSet.has(String(r.scholarshipId))) sampleIdsExistInOpportunity++;
  }
  console.log(`[migration] Sample ids exist in ScholarshipOpportunity collection: ${sampleIdsExistInOpportunity}/${sampleReq.length}`);

  // Additional debug: compare to scholarshipId used by applications
  const applicationScholarshipIds = new Set();

  const appsAll = await ScholarshipApplication.find({}).select('scholarshipId');
  for (const a of appsAll) {
    if (a.scholarshipId) applicationScholarshipIds.add(String(a.scholarshipId));
  }
  let reqMatchesApplicationScholarship = 0;
  for (const req of requirements) {
    const sid = String(req.scholarshipId);
    if (applicationScholarshipIds.has(sid)) reqMatchesApplicationScholarship++;
  }

  console.log(`[migration] Requirements whose scholarshipId matches APPLICATION scholarshipId: ${reqMatchesApplicationScholarship}`);

  let reqMigrated = 0;

  for (const req of requirements) {
    const oldScholarshipId = String(req.scholarshipId);
    const newScholarshipId = idMap.get(oldScholarshipId);
    if (!newScholarshipId) continue;

    req.scholarshipId = new mongoose.Types.ObjectId(newScholarshipId);
    await req.save();
    reqMigrated++;
  }

  console.log(`[migration] Requirements migrated/updated: ${reqMigrated}`);


  console.log(`[migration] Updating applications scholarshipId...`);
  const apps = await ScholarshipApplication.find({});
  let appsUpdated = 0;

  for (const app of apps) {
    const oldScholarshipId = String(app.scholarshipId);
    const newScholarshipId = idMap.get(oldScholarshipId);
    if (!newScholarshipId) continue;

    app.scholarshipId = new mongoose.Types.ObjectId(newScholarshipId);
    await app.save();
    appsUpdated++;
  }

  console.log(`[migration] Applications updated: ${appsUpdated}`);

  console.log('[migration] Migration completed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migration] Failed:', err);
    process.exit(1);
  });

