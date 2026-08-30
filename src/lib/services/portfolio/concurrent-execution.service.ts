import fs from "fs";
import path from "path";
import { resourceCollisionService, ResourceAllocation } from "./resource-collision.service";

export interface ConcurrentExecutionJob {
  jobId: string;
  projectId: string;
  status: "QUEUED" | "ALLOCATING" | "EXECUTING" | "COMPLETED" | "FAILED";
  allocation?: ResourceAllocation;
  startedAt: string;
  completedAt?: string;
}

export class ConcurrentExecutionService {
  private activeJobs: ConcurrentExecutionJob[] = [];

  async startJob(projectId: string): Promise<ConcurrentExecutionJob> {
    const jobId = `JOB-${projectId}-${Date.now().toString().slice(-4)}`;
    const allocRes = resourceCollisionService.allocateResources(projectId);

    const job: ConcurrentExecutionJob = {
      jobId,
      projectId,
      status: "EXECUTING",
      allocation: allocRes.allocation,
      startedAt: new Date().toISOString(),
    };

    this.activeJobs.push(job);
    return job;
  }

  completeJob(jobId: string): void {
    const job = this.activeJobs.find((j) => j.jobId === jobId);
    if (job) {
      job.status = "COMPLETED";
      job.completedAt = new Date().toISOString();
      if (job.allocation) resourceCollisionService.releaseResources(job.projectId);
    }
  }

  getActiveJobs(): ConcurrentExecutionJob[] {
    return this.activeJobs.filter((j) => j.status === "EXECUTING");
  }
}

export const concurrentExecutionService = new ConcurrentExecutionService();
