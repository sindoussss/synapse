# SYNAPSE: Evidence-Driven Autonomous Web Development

**John Daniel M. Casili**  
SYNAPSE Research & Engineering Project  

Version 1.0 · `V1_CERTIFIED_WITH_LIMITATIONS` · 30 August 2026  
Release candidate `RC-SYNAPSE-V1.0-PROD`

This repository contains the evaluated implementation and supporting engineering reports for SYNAPSE, a wrapping architecture for AI-assisted web development. Generation is treated as an untrusted emission. Promotion to clients, payment, and production is a separate, fail-closed process.

The long-form paper is rendered at `/research` when the application is run locally. This README is the archival abstract and reproduction note for the source tree.

---

## Abstract

Language models can emit HTML, TypeScript, and commercial copy. They cannot, by themselves, establish that a requirement was stated, that a payment settled, or that a production mutation was authorized. SYNAPSE studies whether those obligations can be enforced as software: evidence labels on claims, deterministic gates on artifacts, human approval on privileged actions, and durable execution when a worker is interrupted.

Five research questions structure the evaluation:

1. Can deterministic evidence gates reduce unsupported factual claims in AI-generated project artifacts?
2. Can independent code and visual review improve detection of generated defects?
3. Can durable workflow and event architectures allow safe recovery from interrupted AI execution?
4. Can bounded autonomous execution coexist with strict human control over high-risk actions?
5. Can reusable validated design components improve engineering efficiency without collapsing generated sites onto a single template?

The evaluated system classifies requirement state as `EXPLICIT`, `INFERRED`, `UNKNOWN`, `CONFLICTING`, or `VERIFIED`. Missing facts remain `UNKNOWN`; they are not filled with invented budgets, deadlines, or production metrics. Privileged actions (deployment, source delivery, live payment capture) are designed to require an operator decision and to fail closed when credentials, hashes, or approvals are absent.

## Evidence policy

Claims in this repository are labeled. Readers should not treat unlabeled marketing language as a result.

| Label | Meaning |
|---|---|
| `LIVE_VERIFIED` | Observed against a live external system under documented conditions. |
| `CONTROLLED_TEST` | Observed in a sandbox, fixture, or local harness. |
| `INTERNAL_ENGINEERING_EVIDENCE` | Produced by this project's own tests, reports, or logs. Not independently replicated. |
| `UNKNOWN` | No supporting measurement in the tree. |
| `NOT_VERIFIED` | Named in discussion but no report file was found. |
| `NOT_SUPPORTED` | Contradicted or out of scope. |

Suite totals such as 650/650 passing tests, and the ≤35% cross-industry similarity bound, are **internal engineering evidence**. They are not a published benchmark against external models or vendors. PayPal paths in the evaluated reports are **sandbox / controlled test**, not live settlement. GitHub publication of this tree does not convert internal reports into third-party replication.

## What this is not

SYNAPSE is not a claim of fully autonomous production software, live payment at scale, or independently audited safety. Phase identifiers 22B, 30, and 31 are marked `NOT_VERIFIED` in the paper catalog because corresponding report files were not present in the workspace at certification time.

## Repository layout

```
src/app/research/     Long-form paper (academic presentation)
src/lib/research/     Catalogued facts, evidence labels, and figure data
src/lib/services/     Evaluated control plane, gates, and orchestrators
src/app/              Operator console and API routes
PHASE_*.md            Internal phase reports (engineering evidence)
```

Operator UI and paper UI are intentionally separate surfaces. The paper does not link into operations, and operations does not link into the paper.

## Reproduction

Requires Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/research` for the paper. The operator console is `http://localhost:3000/`. Integrations (Supabase, Groq, Gemini, PayPal sandbox, Dropbox Sign, Gmail) are optional and must be supplied only in `.env.local`. That file is gitignored. Never commit API keys, tokens, or app passwords.

Typecheck:

```bash
npx tsc --noEmit
```

Phase reports under `PHASE_*.md` document the internal acceptance runs used at certification. They are not a substitute for independent replication.

## Limitations

- Visual review via Gemini, where enabled, is described as read-only critique in Phases 47–48.
- Hardware and labor cost remain `UNKNOWN`.
- Live PayPal settlement is a stated limitation; sandbox credentials must never be confused with production money movement.
- The source hash recorded at certification (`a9406acc…b836`) is a snapshot identifier from that freeze, not a promise that this Git commit matches it bit-for-bit after subsequent UI work.

## Citation

Casili, J. D. M. (2026). *SYNAPSE: Evidence-driven autonomous web development* (Version 1.0). SYNAPSE Research & Engineering Project.

A machine-readable record is in `CITATION.cff`.

## License

Source code is provided under the MIT License (`LICENSE`). The research reports remain attributable to the author. Do not present internal suite scores as external, peer-reviewed results.
