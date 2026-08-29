// Copies existing ImpersonationLog rows into the unified AuditLog collection
// as IMPERSONATE_START/END events (createdAt preserved), then leaves the old
// collection in place (drop it manually once the new viewer looks right).
//
// Usage:
//   bun scripts/migrate-impersonation-to-audit.js --dry-run
//   bun scripts/migrate-impersonation-to-audit.js
import mongoose from "mongoose";

const dryRun = process.argv.includes("--dry-run");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  const url = process.env.MONGODB_URL?.trim();
  if (!url) throw new Error("MONGODB_URL is not set.");
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await mongoose.connect(url, {
        bufferCommands: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 3000,
      });
      return;
    } catch (err) {
      console.warn(`Database not ready (${attempt}/10): ${err.message}`);
      await sleep(3000);
    }
  }
  throw new Error("Could not connect to MongoDB.");
}

async function main() {
  await connect();
  const db = mongoose.connection.db;
  const source = db.collection("impersonationlogs");
  const target = db.collection("auditlogs");

  const existing = await target.countDocuments({
    action: { $in: ["IMPERSONATE_START", "IMPERSONATE_END"] },
  });
  if (existing > 0 && !dryRun) {
    console.log(
      `AuditLog already contains ${existing} impersonation event(s); nothing to migrate.`
    );
    return;
  }

  const rows = await source.find({}).toArray();
  if (!rows.length) {
    console.log("No ImpersonationLog rows found. Nothing to migrate.");
    return;
  }

  const docs = rows.map((row) => ({
    actorId: row.actorId ?? null,
    actorName: row.actorName ?? null,
    actorRole: row.actorRole ?? null,
    action: row.action === "START" ? "IMPERSONATE_START" : "IMPERSONATE_END",
    resourceType: "user",
    resourceId: row.targetId ? String(row.targetId) : null,
    metadata: {
      targetName: row.targetName ?? null,
      targetRole: row.targetRole ?? null,
      migratedFrom: "impersonationlogs",
    },
    ip: null,
    userAgent: null,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? row.createdAt ?? new Date(),
  }));

  console.log(
    `${dryRun ? "[DRY-RUN] " : ""}Migrating ${docs.length} impersonation row(s) to auditlogs...`
  );
  if (!dryRun) {
    const result = await target.insertMany(docs, { ordered: false });
    console.log(`Migrated ${result.insertedIds ? Object.keys(result.insertedIds).length : docs.length} row(s).`);
    console.log(
      'Done. The old "impersonationlogs" collection was kept — drop it manually after verifying the new viewer.'
    );
  }
}

main()
  .catch((err) => {
    console.error(`Migration failed: ${err.message || err}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
