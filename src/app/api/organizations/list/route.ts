import { NextResponse } from "next/server";
import { organizationRepository } from "@/lib/repositories/organization.repository";

export async function GET() {
  try {
    const orgs = await organizationRepository.getAllOrganizations();
    return NextResponse.json({ ok: true, organizations: orgs });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}