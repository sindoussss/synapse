import { NextResponse } from "next/server";
import { emailSendRepository } from "@/lib/repositories/email-send.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const sends = await emailSendRepository.getAll();
    return NextResponse.json({
      ok: true,
      sends,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to list email sends." },
      { status: 500 }
    );
  }
}