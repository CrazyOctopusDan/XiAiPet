---
status: in_progress
date: 2026-06-02
---

# Quick Task: design scalable catalog loading for 500+ products

## Goal

Capture an approved design for customer and merchant catalog loading that remains usable when the shop manages hundreds of products.

## Scope

- Document customer catalog APIs that preserve category-section browsing while avoiding full product payloads.
- Document merchant catalog APIs for paginated management, filtering, summary counts, and detail-on-demand editing.
- Include image, search, cache, sold-out product, and testing decisions.
- Keep this task at design/spec level only; no implementation code changes.

## Verification

- Review the written spec for incomplete terms, contradictions, ambiguous scope, and alignment with the approved discussion.
- Commit the spec and GSD quick record atomically.
