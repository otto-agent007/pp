---
name: pest-patrol-verification-gate
description: Use when deciding whether a Pest Patrol slice may claim verification, completion, or PR readiness, especially after changes, failed checks, or unavailable tooling.
---

# Pest Patrol Verification Gate

Use the tested repository verifier as the sole mechanical gate:

```bash
pnpm rebuild:verify
```

Report its exact JSON result, including the evidence-set ID, resolved commands,
exit codes, and overall status. A non-`PASS` result refuses completion and PR
readiness; never waive, reinterpret, or reconstruct it from older evidence.

The verifier role is read-only. Never install dependencies, edit files, fix a
failure, publish, merge, or change provider settings. If the command cannot be
started, report `MISSING` with the launch evidence instead of reproducing its
algorithms in prose.
