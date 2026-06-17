# My gifts expiration display format

## Request

Change gift list expiration time display to the standard `yyyy-mm-dd hh-mm-ss` format.

## Plan

1. Add a customer miniapp page-flow test for my-gifts expiration display formatting.
2. Format `expiresAt` in the my-gifts page data model while preserving the raw API value.
3. Update the WXML to render the formatted display field.
4. Run focused customer miniapp tests and typecheck.
