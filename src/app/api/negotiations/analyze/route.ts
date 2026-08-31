import { NextRequest, NextResponse } from "next/server";
import { negotiationIntelligenceService } from "@/lib/services/negotiation/negotiation-intelligence.service";
import { emailMessageRepository } from "@/lib/repositories/message.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: NextRequest) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const { messageId, text, opportunityId, sender } = body;

    let message;
    if (messageId) {
      message = await emailMessageRepository.getById(messageId);
    }

    if (!message && text) {
      // Mock / transient message object for inbound analysis
      message = {
        id: messageId || `MSG-${Date.now()}`,
        leadId: "",
        provider: "gmail",
        providerMessageId: `manual-${Date.now()}`,
        direction: "inbound" as const,
        sender: sender || "prospect@apexlogistics.com",
        recipient: "alex@synapseops.internal",
        subject: "Re: Website Modernization Proposal",
        bodyText: text,
        hasAttachments: false,
        receivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }

    if (!message) {
      return NextResponse.json({ ok: false, error: "Missing messageId or text payload" }, { status: 400 });
    }

    const result = await negotiationIntelligenceService.processInboundProposalReply(message, opportunityId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[API /api/negotiations/analyze] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to analyze proposal reply." },
      { status: 500 }
    );
  }
}