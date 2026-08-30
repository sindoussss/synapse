# Reproduction and environment

This note is for readers who want to run the evaluated tree without assuming production credentials.

## Credentials

All secrets live in `.env.local`, which is excluded from version control. Start from `.env.example`. Empty values disable the corresponding provider.

Do not paste keys into issues, pull requests, or markdown. Provider tokens, Gmail app passwords, PayPal secrets, Vercel tokens, and Sign API keys are out of scope for this repository.

## Surfaces

| Path | Role |
|---|---|
| `/research` | Archival paper. No operator navigation. |
| `/` | Operator console for the evaluated control plane. |

## Evidence files

Internal phase reports (`PHASE_*.md`) are **internal engineering evidence**. They record what this project ran, not what an independent lab replicated. Where a report uses language such as “SECURE” or “100% PASS”, interpret it under that label unless an external replication is cited.

PayPal experiments documented in the reports are sandbox unless a report explicitly labels `LIVE_VERIFIED` with a dated log. At certification, live settlement was listed as a limitation.
