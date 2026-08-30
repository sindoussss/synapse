import fs from "fs";
import path from "path";

export interface NotificationPreferenceRecord {
  userId: string;
  organizationId: string;
  projectId?: string;
  notificationType: string;
  channel: "IN_APP" | "EMAIL";
  enabled: boolean;
  isMandatory: boolean;
}

export class NotificationPreferencesRepository {
  private dataDir = path.resolve(process.cwd(), ".data");
  private dbFile = path.resolve(this.dataDir, "notification-preferences.json");
  private preferences: NotificationPreferenceRecord[] = [];

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = JSON.parse(fs.readFileSync(this.dbFile, "utf8"));
        this.preferences = raw.preferences || [];
      }
    } catch {}
  }

  private saveState(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const raw = {
        preferences: this.preferences,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(this.dbFile, JSON.stringify(raw, null, 2), "utf8");
    } catch {}
  }

  getPreference(userId: string, notificationType: string, channel: "IN_APP" | "EMAIL"): boolean {
    const p = this.preferences.find(
      (x) => x.userId === userId && x.notificationType === notificationType && x.channel === channel
    );
    if (!p) return true; // Default enabled
    return p.enabled;
  }

  setPreference(
    userId: string,
    organizationId: string,
    notificationType: string,
    channel: "IN_APP" | "EMAIL",
    enabled: boolean
  ): { success: boolean; reason?: string } {
    const isMandatory =
      notificationType.includes("SECURITY") ||
      notificationType.includes("PAYMENT") ||
      notificationType.includes("APPROVAL");

    if (isMandatory && !enabled) {
      return {
        success: false,
        reason: "MANDATORY_NOTIFICATION_PROTECTED: Security, financial, and approval notifications cannot be disabled.",
      };
    }

    const idx = this.preferences.findIndex(
      (x) => x.userId === userId && x.notificationType === notificationType && x.channel === channel
    );

    if (idx !== -1) {
      this.preferences[idx].enabled = enabled;
    } else {
      this.preferences.push({
        userId,
        organizationId,
        notificationType,
        channel,
        enabled,
        isMandatory,
      });
    }

    this.saveState();
    return { success: true };
  }
}

export const notificationPreferencesRepository = new NotificationPreferencesRepository();