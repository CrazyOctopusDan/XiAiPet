---
status: in_progress
date: 2026-06-24
---

# Quick Task: cart persistence and reconciliation design spec

## Goal

Capture the approved design for customer miniapp local cart persistence, product-line reconciliation, spec identity handling, checkout blocking, and backend order validation.

## Scope

- Document local cart storage shape, expiration, and schema migration behavior.
- Document the non-paginated cart resolve API for persisted product/spec rows.
- Document reconciliation timing for app restore, cart display, checkout, and order creation.
- Document spec identity behavior for current single-axis and combined `specId__formulaId` products.
- Document checkout cleanup, error handling, inventory assumptions, and tests.
- Keep this task at design/spec level only; no implementation code changes.

## Verification

- Review the written spec for placeholders, contradictions, ambiguous behavior, and scope creep.
- Commit the spec and GSD quick record atomically.
