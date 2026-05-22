# V3 Wordmark Handoff

Claude Design's v3 wordmark refinement is preserved here as a draft/reference
handoff, not as live production app chrome.

- `wordmark.svg` is the navy-on-light candidate.
- `wordmark-on-dark.svg` is the white-on-dark candidate.
- Both files are flattened path-only SVGs with no live text, font dependency, or
  transforms.
- Current live app assets remain in `packages/assets/brand/` until a separate
  explicit promotion slice.
- Reference-only boundary: these drafts must not be imported by
  `apps/web/app/brand`, package exports, app chrome, metadata, or favicons until
  explicit promotion approval.

Pre-promotion gates remain: type/craft review, trademark/legal diligence, a
production `<title>` text decision, mobile lockup/minimum-size rules, and a
separate decision on whether the existing shield should be recut from 7 degrees
to the v3 wordmark's 5-degree slant.
