import { NextResponse } from "next/server";
import { organizationRepository } from "@/lib/repositories/organization.repository";
import { isHttpDenial, requireHttpPrincipal } from "@/lib/http/enforce-http-auth";

export async function GET(req: Request) {
  try {
    const principal = requireHttpPrincipal(req);
    if (isHttpDenial(principal)) return principal;
    let orgs = await organizationRepository.getAllOrganizations();
    if (principal.organizationId) {
      orgs = orgs.filter((org) => org.id === principal.organizationId);
    }
    return NextResponse.json({ ok: true, organizations: orgs });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}