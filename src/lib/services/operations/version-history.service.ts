import fs from "fs";
import path from "path";
import { clientDeliveryRepository, VersionHistoryRecord } from "../../repositories/client-delivery.repository";

export class VersionHistoryService {
  async recordNewVersion(record: VersionHistoryRecord): Promise<VersionHistoryRecord> {
    return await clientDeliveryRepository.saveVersion(record);
  }

  async getTimeline(projectId: string): Promise<VersionHistoryRecord[]> {
    return await clientDeliveryRepository.getVersions(projectId);
  }
}

export const versionHistoryService = new VersionHistoryService();
