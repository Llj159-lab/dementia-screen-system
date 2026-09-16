import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { getCloudBaseApp, getRdbClient } from "../cloudbase.js";

export const FILE_RELATED_TYPES = [
  "scale_config",
  "assessment",
  "patient",
  "report",
] as const;
export type FileRelatedType = (typeof FILE_RELATED_TYPES)[number];

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export class FileStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileStoreError";
  }
}

export type StoredFile = {
  fileId: string;
  originalName: string;
  storageKey: string;
  mimeType: AllowedFileType;
  sizeBytes: number;
  relatedType: FileRelatedType;
  relatedId: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type FileStoreStatus = {
  mode: "local_file";
  configured: false;
  rootDir: string;
  metadataPath: string;
  fileCount: number;
};

export function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 180);
  return cleaned || "upload.bin";
}

export interface FileStore {
  create(input: { originalName: string; mimeType: AllowedFileType; contentBase64: string;
    relatedType: FileRelatedType; relatedId: string; uploadedBy: string }): Promise<StoredFile> | StoredFile;
  findById(fileId: string): Promise<StoredFile | undefined> | StoredFile | undefined;
  list(relatedType?: FileRelatedType, relatedId?: string): Promise<StoredFile[]> | StoredFile[];
  readContent(file: StoredFile): Promise<Buffer> | Buffer;
  getStatus(): Promise<unknown> | unknown;
}

type FileRow = { file_id: string; original_name: string; storage_key: string; mime_type: AllowedFileType;
  size_bytes: number | string; related_type: FileRelatedType; related_id: string; uploaded_by: string;
  created_at: string; updated_at: string };
const mapFile = (r: FileRow): StoredFile => ({ fileId: r.file_id, originalName: r.original_name,
  storageKey: r.storage_key, mimeType: r.mime_type, sizeBytes: Number(r.size_bytes), relatedType: r.related_type,
  relatedId: r.related_id, uploadedBy: r.uploaded_by, createdAt: r.created_at, updatedAt: r.updated_at });

export class CloudBaseFileStore implements FileStore {
  async create(input: { originalName: string; mimeType: AllowedFileType; contentBase64: string;
    relatedType: FileRelatedType; relatedId: string; uploadedBy: string }): Promise<StoredFile> {
    const content = Buffer.from(input.contentBase64, "base64");
    if (!content.length || content.length > MAX_FILE_SIZE_BYTES) throw new FileStoreError("invalid file size");
    const fileId = randomUUID(); const now = new Date().toISOString(); const name = sanitizeFileName(input.originalName);
    const prefix = input.relatedType === "scale_config" ? "scale-assets" : "assessment-reports";
    const cloudPath = `${prefix}/${fileId}/${name}`;
    const uploaded = await getCloudBaseApp().uploadFile({ cloudPath, fileContent: content });
    const storageKey = uploaded.fileID || cloudPath;
    const row = { file_id: fileId, original_name: name, storage_key: storageKey, mime_type: input.mimeType,
      size_bytes: content.length, related_type: input.relatedType, related_id: input.relatedId,
      uploaded_by: input.uploadedBy, created_at: now, updated_at: now };
    const { error } = await getRdbClient().from("files").insert(row);
    if (error) { await getCloudBaseApp().deleteFile({ fileList: [storageKey] }); throw new FileStoreError(error.message ?? "metadata insert failed"); }
    return mapFile(row);
  }
  async findById(fileId: string) { const { data, error } = await getRdbClient().from<FileRow>("files").select("*").eq("file_id", fileId).limit(1).maybeSingle();
    if (error) throw new FileStoreError(error.message ?? "metadata query failed"); return data ? mapFile(data) : undefined; }
  async list(relatedType?: FileRelatedType, relatedId?: string) { let query = getRdbClient().from<FileRow[]>("files").select("*");
    if (relatedType) query = query.eq("related_type", relatedType); if (relatedId) query = query.eq("related_id", relatedId);
    const { data, error } = await query; if (error) throw new FileStoreError(error.message ?? "metadata query failed"); return (data ?? []).map(mapFile); }
  async readContent(file: StoredFile): Promise<Buffer> {
    const result = await getCloudBaseApp().downloadFile({ fileID: file.storageKey });
    if (!result.fileContent || typeof result.fileContent === "string") {
      throw new FileStoreError("CloudBase download did not return binary content");
    }
    return result.fileContent;
  }
  async getStatus() { try { const { error } = await getRdbClient().from("files").select("file_id").limit(1); if (error) throw new Error(error.message);
      return { mode: "cloudbase", configured: true, bucket: process.env.STORAGE_BUCKET ?? "ad-scd-files", status: "connected" }; }
    catch (error) { return { mode: "cloudbase", configured: true, status: "error", error: error instanceof Error ? error.message : "unknown error" }; } }
}

export class LocalFileStore {
  private readonly rootDir: string;
  private readonly metadataPath: string;
  private files: StoredFile[];

  constructor(dataDir = resolve(process.env.LOCAL_DATA_DIR ?? resolve(process.cwd(), "data"))) {
    this.rootDir = join(dataDir, "files");
    this.metadataPath = join(dataDir, "files.json");
    this.files = this.load();
  }

  private load(): StoredFile[] {
    try {
      const parsed = JSON.parse(readFileSync(this.metadataPath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("local files store must contain an array");
      }
      return parsed as StoredFile[];
    } catch (error) {
      const fileDoesNotExist =
        error instanceof Error && "code" in error && error.code === "ENOENT";
      if (!fileDoesNotExist) {
        throw error;
      }
      mkdirSync(join(this.rootDir, ".."), { recursive: true });
      this.persist([]);
      return [];
    }
  }

  private persist(files: readonly StoredFile[] = this.files): void {
    mkdirSync(join(this.metadataPath, ".."), { recursive: true });
    writeFileSync(this.metadataPath, `${JSON.stringify(files, null, 2)}\n`, "utf8");
  }

  create(input: {
    originalName: string;
    mimeType: AllowedFileType;
    contentBase64: string;
    relatedType: FileRelatedType;
    relatedId: string;
    uploadedBy: string;
  }): StoredFile {
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.contentBase64)) {
      throw new FileStoreError("contentBase64 is invalid");
    }
    const content = Buffer.from(input.contentBase64, "base64");
    if (content.length === 0) {
      throw new FileStoreError("file content must not be empty");
    }
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new FileStoreError(`file exceeds ${MAX_FILE_SIZE_BYTES} byte limit`);
    }

    const now = new Date().toISOString();
    const fileId = randomUUID();
    const safeName = sanitizeFileName(input.originalName);
    const fileDir = join(this.rootDir, fileId);
    const filePath = join(fileDir, safeName);
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(filePath, content);

    const storedFile: StoredFile = {
      fileId,
      originalName: safeName,
      storageKey: `local/${fileId}/${safeName}`,
      mimeType: input.mimeType,
      sizeBytes: content.length,
      relatedType: input.relatedType,
      relatedId: input.relatedId.trim(),
      uploadedBy: input.uploadedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.files.push(storedFile);
    this.persist();
    return storedFile;
  }

  findById(fileId: string): StoredFile | undefined {
    return this.files.find((file) => file.fileId === fileId);
  }

  list(relatedType?: FileRelatedType, relatedId?: string): StoredFile[] {
    return this.files.filter(
      (file) =>
        (!relatedType || file.relatedType === relatedType) &&
        (!relatedId || file.relatedId === relatedId),
    );
  }

  readContent(file: StoredFile): Buffer {
    const fileName = sanitizeFileName(file.originalName);
    return readFileSync(join(this.rootDir, file.fileId, fileName));
  }

  getStatus(): FileStoreStatus {
    return {
      mode: "local_file",
      configured: false,
      rootDir: this.rootDir,
      metadataPath: this.metadataPath,
      fileCount: this.files.length,
    };
  }
}
