import { getRdbClient, isCloudBaseConfigured } from "../cloudbase.js";
import { COLLECTIONS, SCHEMA_VERSION } from "./schema.js";

export async function getDatabaseStatus() {
  const base = { schemaVersion: SCHEMA_VERSION, collectionCount: COLLECTIONS.length };
  if (process.env.DATA_DRIVER !== "cloudbase") {
    return { ...base, provider: "local_file", status: "local_only" };
  }
  if (!isCloudBaseConfigured()) {
    return { ...base, provider: "cloudbase_rdb", status: "error", error: "CLOUDBASE_ENV_ID is required" };
  }
  try {
    const { error } = await getRdbClient().from("users").select("user_id").limit(1);
    if (error) throw new Error(error.message ?? "query failed");
    return { ...base, provider: "cloudbase_rdb", status: "connected" };
  } catch (error) {
    return { ...base, provider: "cloudbase_rdb", status: "error",
      error: error instanceof Error ? error.message : "unknown error" };
  }
}
