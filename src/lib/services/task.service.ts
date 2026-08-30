
import { 
  Task, 
  TaskCreateInput, 
  TaskUpdateInput, 
  TaskStatus, 
  ActivityType, 
  ActivityLevel,
  RiskLevel 
} from "@/data/types";
import { ITaskRepository, taskRepository } from "@/lib/repositories/task.repository";
import { IActivityRepository, activityRepository } from "@/lib/repositories/activity.repository";
import { IApprovalRepository, approvalRepository } from "@/lib/repositories/approval.repository";
import { MOCK_AGENTS } from "@/data/agents";

export class TaskService {
  constructor(
    private taskRepo: ITaskRepository = taskRepository,
    private activityRepo: IActivityRepository = activityRepository,
    private approvalRepo: IApprovalRepository = approvalRepository
  ) {}

  private getAgentName(agentId: string): string {
    const agent = MOCK_AGENTS.find(a => a.id === agentId);
    return agent ? agent.name : "System Operator";
  }

  getValidTransitions(currentStatus: TaskStatus): TaskStatus[] {
    switch (currentStatus) {
      case "queued":
        return ["running"];
      case "running":
        return ["completed", "failed", "waiting_approval"];
      case "waiting_approval":
        return ["running", "completed", "failed"];
      case "completed":
        return ["queued", "running"];
      case "failed":
        return ["queued", "running"];
      default:
        return ["queued", "running", "waiting_approval", "completed", "failed"];
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepo.getAll();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.taskRepo.getById(id);
  }

  async createTask(input: TaskCreateInput): Promise<Task> {
    const task = await this.taskRepo.create(input);
    const agentName = this.getAgentName(task.assignedAgentId);

    await this.activityRepo.add({
      type: "task_created",
      title: `Task Created: ${task.id}`,
      description: `Created "${task.title}" with priority ${task.priority.toUpperCase()} assigned to ${agentName}.`,
      level: "info",
      agentId: task.assignedAgentId,
      agentName: agentName,
      metadata: {
        taskId: task.id,
        priority: task.priority,
        type: task.type,
        assignedAgent: agentName,
        targetLeadId: task.targetLeadId || null
      }
    });

    return task;
  }

  async updateTask(id: string, updates: TaskUpdateInput): Promise<Task> {
    const existing = await this.taskRepo.getById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const task = await this.taskRepo.update(id, updates);
    const agentName = this.getAgentName(task.assignedAgentId);

    if (updates.assignedAgentId && updates.assignedAgentId !== existing.assignedAgentId) {
      const prevAgentName = this.getAgentName(existing.assignedAgentId);
      await this.activityRepo.add({
        type: "task_reassigned",
        title: `Task Reassigned: ${task.id}`,
        description: `Reassigned "${task.title}" from ${prevAgentName} to ${agentName}.`,
        level: "info",
        agentId: task.assignedAgentId,
        agentName: agentName,
        metadata: {
          taskId: task.id,
          previousAgent: prevAgentName,
          newAgent: agentName
        }
      });
    } else {
      await this.activityRepo.add({
        type: "task_status_changed",
        title: `Task Updated: ${task.id}`,
        description: `Updated parameters for "${task.title}".`,
        level: "info",
        agentId: task.assignedAgentId,
        agentName: agentName,
        metadata: { taskId: task.id }
      });
    }

    return task;
  }

  async transitionStatus(
    id: string, 
    newStatus: TaskStatus, 
    details?: { output?: any; error?: string; reason?: string }
  ): Promise<Task> {
    const existing = await this.taskRepo.getById(id);
    if (!existing) throw new Error(`Task ${id} not found`);

    const now = new Date().toISOString();
    const updates: TaskUpdateInput = {
      status: newStatus,
    };

    if (newStatus === "running") {
      updates.startedAt = existing.startedAt || now;
      updates.error = undefined;
    } else if (newStatus === "completed") {
      updates.completedAt = now;
      if (details?.output !== undefined) {
        updates.output = details.output;
      }
      updates.error = undefined;
    } else if (newStatus === "failed") {
      updates.completedAt = now;
      updates.error = details?.error || "Task execution failed or was aborted by operator.";
    }

    const updatedTask = await this.taskRepo.update(id, updates);
    const agentName = this.getAgentName(updatedTask.assignedAgentId);

    // If transitioned to waiting_approval, ensure an approval record is created
    if (newStatus === "waiting_approval") {
      const riskLevel: RiskLevel = 
        updatedTask.priority === "critical" ? "critical" : 
        updatedTask.priority === "high" ? "high" : 
        updatedTask.priority === "medium" ? "medium" : "low";

      await this.approvalRepo.create({
        taskId: updatedTask.id,
        action: `Authorize Task: ${updatedTask.title}`,
        description: details?.reason || `Task ${updatedTask.id} assigned to ${agentName} is on hold awaiting operator approval.`,
        riskLevel,
        payload: {
          taskId: updatedTask.id,
          taskType: updatedTask.type,
          priority: updatedTask.priority,
          agent: agentName,
          input: updatedTask.input
        }
      });
    }

    // Record appropriate activity log
    let activityType: ActivityType = "task_status_changed";
    let activityLevel: ActivityLevel = "info";
    let title = `Task Status Changed: ${updatedTask.id}`;
    let description = `Status transitioned from ${existing.status.toUpperCase()} to ${newStatus.toUpperCase()}.`;

    if (newStatus === "running") {
      activityType = "task_started";
      activityLevel = "info";
      title = `Task Started: ${updatedTask.id}`;
      description = `${agentName} initiated execution on "${updatedTask.title}".`;
    } else if (newStatus === "completed") {
      activityType = "task_completed";
      activityLevel = "success";
      title = `Task Completed: ${updatedTask.id}`;
      description = `${agentName} successfully delivered "${updatedTask.title}".`;
    } else if (newStatus === "failed") {
      activityType = "task_failed";
      activityLevel = "error";
      title = `Task Failed: ${updatedTask.id}`;
      description = `Execution failed: ${updatedTask.error || "Unknown error"}`;
    } else if (newStatus === "waiting_approval") {
      activityType = "approval_event";
      activityLevel = "warning";
      title = `Approval Requested: ${updatedTask.id}`;
      description = `${agentName} placed "${updatedTask.title}" on hold awaiting human sign-off.`;
    }

    await this.activityRepo.add({
      type: activityType,
      title,
      description,
      level: activityLevel,
      agentId: updatedTask.assignedAgentId,
      agentName: agentName,
      metadata: {
        taskId: updatedTask.id,
        previousStatus: existing.status,
        newStatus: newStatus,
        error: updatedTask.error || null
      }
    });

    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    const existing = await this.taskRepo.getById(id);
    if (!existing) return false;

    const agentName = this.getAgentName(existing.assignedAgentId);
    const success = await this.taskRepo.delete(id);

    if (success) {
      await this.activityRepo.add({
        type: "task_deleted",
        title: `Task Deleted: ${id}`,
        description: `Deleted task "${existing.title}" (previously ${existing.status.toUpperCase()}).`,
        level: "warning",
        agentId: existing.assignedAgentId,
        agentName: agentName,
        metadata: {
          taskId: id,
          title: existing.title
        }
      });
    }

    return success;
  }
}

export const taskService = new TaskService();
