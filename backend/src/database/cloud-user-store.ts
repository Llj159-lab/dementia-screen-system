import type { RoleCode } from "../auth/auth.js";
import { getRdbClient } from "../cloudbase.js";
import type { StoredUser } from "./user-store.js";

type UserRow = {
  user_id: string; auth_provider: StoredUser["authProvider"]; username: string | null;
  password_hash: string | null; open_id: string | null; display_name: string;
  role_codes: RoleCode[]; status: StoredUser["status"]; last_login_at: string | null;
  created_at: string; updated_at: string;
};

function mapUser(row: UserRow): StoredUser {
  return { userId: row.user_id, authProvider: row.auth_provider, username: row.username,
    passwordHash: row.password_hash, openId: row.open_id, displayName: row.display_name,
    roleCodes: row.role_codes, status: row.status, lastLoginAt: row.last_login_at,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

async function one(column: "username" | "user_id", value: string): Promise<StoredUser | undefined> {
  const { data, error } = await getRdbClient().from<UserRow>("users").select("*").eq(column, value).limit(1).maybeSingle();
  if (error) throw new Error(`CloudBase users query failed: ${error.message ?? "unknown error"}`);
  return data ? mapUser(data) : undefined;
}

export class CloudUserStore {
  findByUsername(username: string) { return one("username", username); }
  findByUserId(userId: string) { return one("user_id", userId); }
  async updateLastLogin(userId: string, lastLoginAt: string): Promise<void> {
    const { error } = await getRdbClient().from("users").update({ last_login_at: lastLoginAt, updated_at: lastLoginAt }).eq("user_id", userId);
    if (error) throw new Error(`CloudBase users update failed: ${error.message ?? "unknown error"}`);
  }
}
