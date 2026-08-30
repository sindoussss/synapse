import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pkg = await handoverService.confirmHandover(body);
    return NextResponse.json({ ok: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}