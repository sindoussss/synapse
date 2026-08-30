import { NextResponse } from "next/server";
import { replySendRepository } from "@/lib/repositories/reply-send.repository";

export async function GET() {
  try {
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