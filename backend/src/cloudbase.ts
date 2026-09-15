import cloudbase from "@cloudbase/node-sdk";

type RdbResult<T> = { data: T | null; error: { message?: string } | null };
type RdbBuilder<T> = PromiseLike<RdbResult<T>> & {
  select(columns?: string): RdbBuilder<T>;
  eq(column: string, value: unknown): RdbBuilder<T>;
  limit(count: number): RdbBuilder<T>;
  maybeSingle(): RdbBuilder<T>;
  insert(values: unknown): RdbBuilder<T>;
  update(values: unknown): RdbBuilder<T>;
};
export type RdbClient = { from<T = unknown>(table: string): RdbBuilder<T> };

const envId = process.env.CLOUDBASE_ENV_ID?.trim() || process.env.CLOUD_ENV_ID?.trim();

export function isCloudBaseConfigured(): boolean {
  return Boolean(envId);
}

export function getCloudBaseApp() {
  if (!envId) throw new Error("CLOUDBASE_ENV_ID is required");
  const secretId = process.env.CLOUDBASE_SECRETID?.trim();
  const secretKey = process.env.CLOUDBASE_SECRETKEY?.trim();
  return cloudbase.init({
    env: envId,
    ...(secretId && secretKey ? { secretId, secretKey } : {}),
  });
}

export function getRdbClient(): RdbClient {
  const app = getCloudBaseApp() as ReturnType<typeof getCloudBaseApp> & {
    rdb(): RdbClient;
  };
  return app.rdb();
}
