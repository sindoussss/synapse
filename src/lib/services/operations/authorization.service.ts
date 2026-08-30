import fs from "fs";
import path from "path";

export type RoleActor = "SYSTEM" | "DEVELOPER_AGENT" | "OPERATOR" | "CLIENT";
export type ActionPermission =
  | "READ_PROJECT"
  | "SUBMIT_CHANGE"
  | "AUTHORIZE_CHANGE"
  | "MODIFY_WORKSPACE"
  | "CREATE_RELEASE_CANDIDATE"
  | "APPROVE_RELEASE"
  | "DEPLOY_STAGING"
  | "DEPLOY_PRODUCTION"
  | "ROLLBACK"
  | "VIEW_FINANCIALS"
  | "MODIFY_FINANCIALS"
  | "ACCESS_SECRETS";

export class AuthorizationService {
  private rolePermissions: Record<RoleActor, ActionPermission[]> = {
    SYSTEM: ["READ_PROJECT", "CREATE_RELEASE_CANDIDATE", "DEPLOY_STAGING", "ROLLBACK"],
    DEVELOPER_AGENT: ["READ_PROJECT", "MODIFY_WORKSPACE", "CREATE_RELEASE_CANDIDATE"],
    OPERATOR: [
      "READ_PROJECT",
      "AUTHORIZE_CHANGE",
      "MODIFY_WORKSPACE",
      "CREATE_RELEASE_CANDIDATE",
      "APPROVE_RELEASE",
      "DEPLOY_STAGING",
      "DEPLOY_PRODUCTION",
      "ROLLBACK",
      "VIEW_FINANCIALS",
      "MODIFY_FINANCIALS",
      "ACCESS_SECRETS",
    ],
    CLIENT: ["READ_PROJECT", "SUBMIT_CHANGE", "APPROVE_RELEASE", "VIEW_FINANCIALS"],
  };

  isAuthorized(actor: RoleActor, permission: ActionPermission): boolean {
    const perms = this.rolePermissions[actor] || [];
    return perms.includes(permission);
  }
}

export const authorizationService = new AuthorizationService();
