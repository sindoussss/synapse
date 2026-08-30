import fs from "fs";
import path from "path";
import crypto from "crypto";

export type AttachmentStatus = "UPLOADING" | "READY" | "REJECTED" | "QUARANTINED" | "DELETED";

export interface ReviewAttachmentRecord {
  attachmentId: string;
  organizationId: string;
  projectId: string;
  reviewSessionId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageReference: string;
  hash: string;
  status: AttachmentStatus;
  version: number;
  previousAttachmentId?: string;
  createdAt: string;
}

export class ReviewAttachmentRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "review-attachments.json");
  private attachments: ReviewAttachmentRecord[] = [];

  private ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
  ]);

  private MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.attachments = raw.attachments || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        attachments: this.attachments,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  validateAttachment(params: { filename: string; mimeType: string; size: number }): { valid: boolean; reason?: string } {
    // 1. Path traversal check
    if (params.filename.includes("..") || params.filename.includes("/") || params.filename.includes("\\")) {
      return { valid: false, reason: "PATH_TRAVERSAL_DETECTED: Malicious filename syntax blocked." };
    }

    // 2. MIME type check
    if (!this.ALLOWED_MIME_TYPES.has(params.mimeType)) {
      return { valid: false, reason: `UNSUPPORTED_MIME_TYPE: '${params.mimeType}' is not an authorized attachment type.` };
    }

    // 3. Size limit check
    if (params.size > this.MAX_SIZE_BYTES) {
      return { valid: false, reason: `FILE_TOO_LARGE: File size (${params.size} bytes) exceeds 10MB ceiling.` };
    }

    return { valid: true };
  }

  uploadAttachment(
    att: Omit<ReviewAttachmentRecord, "attachmentId" | "createdAt" | "status" | "version">,
    version = 1
  ): { success: boolean; attachment?: ReviewAttachmentRecord; reason?: string } {
    const val = this.validateAttachment({ filename: att.filename, mimeType: att.mimeType, size: att.size });
    if (!val.valid) {
      return { success: false, reason: val.reason };
    }

    const id = `ATT-${Date.now().toString().slice(-4)}-${crypto.randomBytes(2).toString("hex")}`;
    const record: ReviewAttachmentRecord = {
      ...att,
      attachmentId: id,
      status: "READY",
      version,
      createdAt: new Date().toISOString(),
    };

    this.attachments.push(record);
    this.saveState();
    return { success: true, attachment: { ...record } };
  }

  getAttachment(attachmentId: string, callerOrgId?: string): ReviewAttachmentRecord | null {
    const att = this.attachments.find((a) => a.attachmentId === attachmentId);
    if (!att) return null;
    if (callerOrgId && att.organizationId !== callerOrgId) return null;
    return { ...att };
  }

  listAttachments(reviewSessionId: string, callerOrgId?: string): ReviewAttachmentRecord[] {
    return this.attachments
      .filter((a) => a.reviewSessionId === reviewSessionId && (!callerOrgId || a.organizationId === callerOrgId))
      .map((a) => ({ ...a }));
  }
}

export const reviewAttachmentRepository = new ReviewAttachmentRepository();