---
status: complete
date: 2026-06-24
---

# Summary

Completed the design specification for customer miniapp cart persistence and reconciliation.

## Changes

- Captured local storage as the persistence mechanism for same-device cart recovery.
- Captured a non-paginated cart resolve API so persisted cart rows do not depend on catalog pagination.
- Captured spec identity handling for current `specId` and combined `specId__formulaId` products.
- Captured app restore, pre-checkout, and order-creation validation timing.
- Captured checkout cleanup rules for successful payment, payment cancellation, and payment failure.
- Captured error handling, product-level inventory assumptions, security boundaries, and test coverage.

## Verification

- Checked the spec for incomplete terms, contradictions, broad scope, and ambiguous behavior.
