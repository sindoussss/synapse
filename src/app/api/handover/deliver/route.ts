import { NextResponse } from "next/server";
import { handoverService } from "@/lib/services/handover/handover.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await handoverService.approveAndDeliverHandover(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}