import fs from "fs";
import path from "path";

export interface ResourceAllocation {
  projectId: string;
  workspaceDir: string;
  port: number;
  deploymentId: string;
  executionId: string;
  snapshotId: string;
  allocatedAt: string;
}

export class ResourceCollisionService {
  private activeAllocations: ResourceAllocation[] = [];
  private basePort = 3005;

  allocateResources(projectId: string): { allocation: ResourceAllocation; collisionDetected: boolean; collisionReason?: string } {
    // Check for existing allocation
    const existing = this.activeAllocations.find((a) => a.projectId === projectId);
    if (existing) {
      return { allocation: existing, collisionDetected: false };
    }

    // Allocate next available port
    const usedPorts = this.activeAllocations.map((a) => a.port);
    let nextPort = this.basePort;
    while (usedPorts.includes(nextPort)) {
      nextPort++;
    }

    const executionId = `EXEC-${projectId}-${Date.now().toString().slice(-4)}`;
    const snapshotId = `SNAP-${projectId}-${Date.now().toString().slice(-4)}`;
    const deploymentId = `DEP-${projectId}-${Date.now().toString().slice(-4)}`;
    const workspaceDir = path.resolve(process.cwd(), "production-sites", projectId);

    const alloc: ResourceAllocation = {
      projectId,
      workspaceDir,
      port: nextPort,
      deploymentId,
      executionId,
      snapshotId,
      allocatedAt: new Date().toISOString(),
    };

    this.activeAllocations.push(alloc);
    return { allocation: alloc, collisionDetected: false };
  }

  checkCollision(candidate: ResourceAllocation): { hasCollision: boolean; reason?: string } {
    const portConflict = this.activeAllocations.some((a) => a.projectId !== candidate.projectId && a.port === candidate.port);
    if (portConflict) {
      return { hasCollision: true, reason: `PORT_COLLISION: Port ${candidate.port} already allocated to another active project.` };
    }

    const wsConflict = this.activeAllocations.some((a) => a.projectId !== candidate.projectId && a.workspaceDir === candidate.workspaceDir);
    if (wsConflict) {
      return { hasCollision: true, reason: `WORKSPACE_COLLISION: Directory ${candidate.workspaceDir} already claimed.` };
    }

    const execConflict = this.activeAllocations.some((a) => a.projectId !== candidate.projectId && a.executionId === candidate.executionId);
    if (execConflict) {
      return { hasCollision: true, reason: `EXECUTION_COLLISION: Execution ID ${candidate.executionId} already active.` };
    }

    return { hasCollision: false };
  }

  releaseResources(projectId: string): void {
    this.activeAllocations = this.activeAllocations.filter((a) => a.projectId !== projectId);
  }
}

export const resourceCollisionService = new ResourceCollisionService();
