import { NextResponse } from "next/server";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { denyUnlessAuthenticated } from "@/lib/http/enforce-http-auth";

export async function POST(req: Request) {
  try {
    const denied = denyUnlessAuthenticated(req);
    if (denied) return denied;
    const body = await req.json();
    const org = await organizationRepository.createOrganization({
      id: body.id || `ORG-${Date.now().toString().slice(-4)}`,
      name: body.name,
      legalName: body.legalName,
      status: body.status || "prospect",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, organization: org });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}