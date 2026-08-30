import { DesignLearningRecord } from "../../repositories/design-learning.repository";

export interface ContradictionFinding {
  subjectId: string;
  contradictionDetected: boolean;
  status: "CONSISTENT" | "CONFLICTING_EVIDENCE";
  evidenceA: string;
  evidenceB: string;
  details: string;
}

export class ContradictionService {
  checkContradictions(learnings: DesignLearningRecord[]): ContradictionFinding[] {
    const findings: ContradictionFinding[] = [];

    for (let i = 0; i < learnings.length; i++) {
      for (let j = i + 1; j < learnings.length; j++) {
        const a = learnings[i];
        const b = learnings[j];

        if (a.subjectId === b.subjectId) {
          // Check if one says regression-free while the other reports regressions
          const aHasReg = a.observation.toLowerCase().includes("regression") && !a.observation.toLowerCase().includes("0 regression");
          const bHasZeroReg = b.observation.toLowerCase().includes("0 regression") || b.observation.toLowerCase().includes("0 recorded");

          if ((aHasReg && bHasZeroReg) || (a.status === "SUPPORTED" && b.status === "REJECTED")) {
            findings.push({
              subjectId: a.subjectId,
              contradictionDetected: true,
              status: "CONFLICTING_EVIDENCE",
              evidenceA: a.learningId,
              evidenceB: b.learningId,
              details: `Discrepancy detected for ${a.subjectId}: '${a.observation}' conflicts with '${b.observation}'. Operator review required.`,
            });
          }
        }
      }
    }

    return findings;
  }
}

export const contradictionService = new ContradictionService();