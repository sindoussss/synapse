import { approvalControlRepository } from "@/lib/repositories/approval-control.repository";
import { exceptionService } from "@/lib/services/approval/exception.service";
import { ApprovalsBoard } from "./ApprovalsBoard";

export default function GlobalApprovalsPage() {
  const orgId = "ORG-CASILI-01";
  const requests = approvalControlRepository.listRequests({ organizationId: orgId });
  const exceptions = exceptionService.listExceptions({ organizationId: orgId });

  return <ApprovalsBoard requests={requests} exceptionCount={exceptions.length} />;
}
