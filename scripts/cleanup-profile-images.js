import mongoose from "mongoose";
import dbConnect from "../lib/dbConnect.js";
import File from "../models/File.js";
import User from "../models/User.js";
import { deleteObject } from "../lib/storage.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  await dbConnect();

  const fileCollection = File.collection;
  const userCollection = User.collection;

  const profileFiles = await fileCollection
    .find({ bucket: "profile" })
    .toArray();
  const usersWithProfileImage = await userCollection.countDocuments({
    profileImage: { $exists: true, $ne: null },
  });

  console.log(`Profile File records: ${profileFiles.length}`);
  console.log(`Users with profileImage: ${usersWithProfileImage}`);

  if (dryRun) {
    console.log("Dry run only. No data was deleted.");
    return;
  }

  for (const fileRecord of profileFiles) {
    try {
      await deleteObject({
        bucket: fileRecord.bucket,
        objectName: fileRecord.objectName,
      });
    } catch (error) {
      console.warn(
        `Failed to delete object ${fileRecord.bucket}/${fileRecord.objectName}: ${error.message}`
      );
    }
  }

  const deletedFiles = await fileCollection.deleteMany({ bucket: "profile" });
  const updatedUsers = await userCollection.updateMany(
    { profileImage: { $exists: true } },
    { $unset: { profileImage: "" } }
  );

  console.log(`Deleted File records: ${deletedFiles.deletedCount}`);
  console.log(`Unset profileImage on users: ${updatedUsers.modifiedCount}`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
