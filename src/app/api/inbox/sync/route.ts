import { NextResponse } from "next/server";
import { inboxSyncService } from "@/lib/services/inbox/inbox-sync.service";

export async function POST() {
  try {
    const result = await inboxSyncService.syncReplies(30);
    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("[API /api/inbox/sync] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to sync inbox replies." },
      { status: 500 }
    );
  }
}