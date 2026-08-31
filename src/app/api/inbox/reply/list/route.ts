import { NextResponse } from "next/server";
import { replySendRepository } from "@/lib/repositories/reply-send.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const replySends = await replySendRepository.getAll();
    return NextResponse.json({
      ok: true,
      replySends,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list reply sends." },
      { status: 500 }
    );
  }
}