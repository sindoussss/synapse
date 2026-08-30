import { NextResponse } from "next/server";
import { productionReleaseService } from "@/lib/services/production-release/production-release.service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await productionReleaseService.approveDNSCutover(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}