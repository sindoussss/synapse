import fs from "fs";
import path from "path";

export interface ClientSession {
  clientId: string;
  organizationId: string;
  workspaceId: string;
  clientName: string;
  email: string;
  role: "CLIENT";
}

export class ClientAuthService {
  private activeSessions: Record<string, ClientSession> = {
    "token-sindous-01": {
      clientId: "CLI-SINDOUS-01",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-SINDOUS-01",
      clientName: "Sindous Building Supplies & Construction Services",
      email: "sindousbuilding@gmail.com",
      role: "CLIENT",
    },
    "token-aura-01": {
      clientId: "CLI-AURA-01",
      organizationId: "ORG-CASILI-01",
      workspaceId: "WS-AURA-01",
      clientName: "Aura Wood-Fired Bistro",
      email: "aura@bistro.com",
      role: "CLIENT",
    },
  };

  authenticateSession(token: string): ClientSession | null {
    return this.activeSessions[token] || null;
  }

  validateProjectAccess(session: ClientSession, targetClientId: string, targetOrgId: string): { allowed: boolean; violationType?: string } {
    if (session.organizationId !== targetOrgId) {
      return { allowed: false, violationType: "TENANT_BOUNDARY_VIOLATION" };
    }
    if (session.clientId !== targetClientId) {
      return { allowed: false, violationType: "CLIENT_BOUNDARY_VIOLATION" };
    }
    return { allowed: true };
  }

  isOperatorSurfaceAllowed(session: ClientSession): boolean {
    return false; // Client role strictly blocked from operator surfaces
  }
}

export const clientAuthService = new ClientAuthService();
