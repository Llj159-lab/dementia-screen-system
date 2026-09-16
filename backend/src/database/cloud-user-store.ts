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
  async list(): Promise<StoredUser[]> {
    const { data, error } = await getRdbClient().from<UserRow[]>("users").select("*");
    if (error) throw new Error(`CloudBase users query failed: ${error.message ?? "unknown error"}`);
    return (data ?? []).map(mapUser);
  }
  async create(user: StoredUser): Promise<StoredUser> {
    const row = {
      user_id: user.userId, auth_provider: user.authProvider, username: user.username,
      password_hash: user.passwordHash, open_id: user.openId, display_name: user.displayName,
      role_codes: user.roleCodes, status: user.status, last_login_at: user.lastLoginAt,
      created_at: user.createdAt, updated_at: user.updatedAt,
    };
    const { error } = await getRdbClient().from("users").insert(row);
    if (error) throw new Error(`CloudBase users insert failed: ${error.message ?? "unknown error"}`);
    return user;
  }
  async update(userId: string, changes: Partial<Pick<StoredUser, "displayName" | "passwordHash" | "roleCodes" | "status">>): Promise<StoredUser | undefined> {
    const current = await this.findByUserId(userId);
    if (!current) return undefined;
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (changes.displayName !== undefined) row.display_name = changes.displayName;
    if (changes.passwordHash !== undefined) row.password_hash = changes.passwordHash;
    if (changes.roleCodes !== undefined) row.role_codes = changes.roleCodes;
    if (changes.status !== undefined) row.status = changes.status;
    const { error } = await getRdbClient().from("users").update(row).eq("user_id", userId);
    if (error) throw new Error(`CloudBase users update failed: ${error.message ?? "unknown error"}`);
    return { ...current, ...changes, updatedAt: row.updated_at as string };
  }
  async updateLastLogin(userId: string, lastLoginAt: string): Promise<void> {
    const { error } = await getRdbClient().from("users").update({ last_login_at: lastLoginAt, updated_at: lastLoginAt }).eq("user_id", userId);
    if (error) throw new Error(`CloudBase users update failed: ${error.message ?? "unknown error"}`);
  }
}
