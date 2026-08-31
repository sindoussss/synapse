import { NextRequest, NextResponse } from "next/server";
import { auditService } from "@/lib/services/audit.service";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { leadId } = body;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid leadId." },
        { status: 400 }
      );
    }

    const task = await auditService.createAuditTaskForLead(leadId);

    return NextResponse.json({
      ok: true,
      task,
    });
  } catch (err: any) {
    console.error("[API /api/audit/create] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create website audit task." },
      { status: 500 }
    );
  }
}