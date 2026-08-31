import { approvalControlService } from "@/lib/services/approval/approval-control.service";
import { requireOperatorPagePrincipal } from "@/lib/http/require-operator-page";
import { ApprovalsBoard } from "./ApprovalsBoard";

export const dynamic = "force-dynamic";

export default async function GlobalApprovalsPage() {
  const principal = await requireOperatorPagePrincipal("/approvals");
  const { requests, exceptionCount } = approvalControlService.listVisibleForPrincipal(principal);

  return <ApprovalsBoard requests={requests} exceptionCount={exceptionCount} />;
}
