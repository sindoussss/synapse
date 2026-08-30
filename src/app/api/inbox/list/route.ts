import { NextResponse } from "next/server";
import { emailMessageRepository } from "@/lib/repositories/message.repository";
import { replyAnalysisRepository } from "@/lib/repositories/reply-analysis.repository";
import { responseDraftRepository } from "@/lib/repositories/response-draft.repository";

export async function GET() {
  try {
    const messages = await emailMessageRepository.getAll();
    const analyses = await replyAnalysisRepository.getAll();
    const drafts = await responseDraftRepository.getAll();

    return NextResponse.json({
      ok: true,
      messages,
      analyses,
      drafts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list inbox conversations." },
      { status: 500 }
    );
  }
}