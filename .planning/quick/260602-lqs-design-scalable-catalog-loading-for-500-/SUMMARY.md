---
status: complete
date: 2026-06-02
---

# Summary

Completed the design specification for scalable catalog loading across the customer and merchant miniapps.

## Changes

- Added a customer-side category-aware loading design with manual per-category "load more" controls.
- Added separate available and sold-out pagination semantics so the existing sold-out folding interaction remains intact.
- Added merchant-side paginated management, service-side search, summary, sorting, and detail-on-demand requirements.
- Captured cache snapshot, thumbnail-only list rendering, ordinary keyword search, and future performance upgrade triggers.

## Verification

- Checked the spec for incomplete terms, contradictions, overly broad scope, and ambiguous implementation requirements.
