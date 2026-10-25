# Home WG parser diagnostics implementation plan

> For agentic workers: use superpowers:executing-plans to implement inline, then one focused independent review.

**Goal:** Make local JSON read, validation and real WireGuard output preparation observable without exposing credentials.

**Spec / approval:** User approved adding redacted diagnostics to the existing parser and publishing to the existing candidate branch on 2026-10-25. The three requested facts are local JSON read, key format validity, and output-field equality to normalized input. No fake nodes or repeated initialization.

**Architecture:** Keep the existing parser and WireGuard serialization. Add a best-effort reporter using fixed codes, booleans and timestamps only. Write an independent non-secret local status key, log the same status, and attempt a safe terminal notification. None of these channels is engine readback or handshake proof.

**Tech stack:** Existing ES5-style Loon JavaScript and parser plugin; Markdown documentation.

## Constraints and rulings

- Reuse the explicitly approved normal checkout and `codex/wg-local-parameters`; preserve pre-existing dirty files. No new worktree or main changes.
- Preserve `zlkent.loon.home-wg.node.v1`; never write/remove its contents, change keys, or log input JSON, keys, PSK, endpoint, SSID, raw exceptions or arbitrary runtime objects.
- Diagnostic status key: `zlkent.loon.home-wg.status.v1`. No secret values or hashes/fingerprints.
- Reporter failures must not change parser success/error/passthrough behavior or WireGuard output.
- Keep the exact node name, format, allowed-ips, policies, ROS and full configurations unchanged.
- User previously opted out of test suites and fake-marker experiments: perform syntax, output-contract/diff, privacy, review and publication checks only; no new or full test suite.
- Bump only the plugin script URL revision to avoid relying on a cached script. The subscription seed URL and matching scope stay unchanged.

## Review focus

- Absent/malformed local data must keep the old placeholder or fixed error behavior.
- Scope mismatches must still pass through without notifying for unrelated subscriptions.
- Notification/status/log failures must not suppress `$done` or replace the original error.
- Output checks compare serialized text with normalized inputs, not the native engine's loaded secrets or the official client's keys.
- Only explicit public files may be staged; local logs, diagnostics, requests and historic PROGRESS changes remain outside the commit.

## Tasks / ledger

1. [x] Restore current parser/plugin/docs, latest device evidence and release baseline; preserve the current dirty set.
2. [x] Add best-effort status reporting, explicit stage/error codes and output equality checks; update plugin revision and user instructions.
3. [ ] Run focused checks and independent review, commit/push only explicit public files, verify remote SHA/Raw bytes and unchanged main/full config.

## Files

- Modify `Parser/HomeWGNode.js`: diagnostic reporter and normalized-output comparisons only.
- Modify `Plugin/HomeWGNodeParser.lpx`: description/date and cache revision on script URL.
- Modify `docs/home-wg-node.md`: actionable update/notification instructions and evidence limitations.
- This plan: scope, progress and publication evidence.
- Local-only `PROGRESS.md` and existing diagnostics: record handoff/current blocker without committing unrelated history.

## Acceptance boundary

Deliver diagnostics, not a WG connectivity fix. A fresh `OUTPUT_READY` with all equality flags true proves the parser prepared matching text, not that Loon loaded it or authenticated. Device notification support and actual status values remain unverified until user updates the parser plugin and only the family-node subscription.

## Focused checks

- `node --check Parser/HomeWGNode.js` and scoped `git diff --check` passed.
- Static source comparison with pre-change HEAD confirms byte-identical peer/node serialization, the same existing error-code order and unchanged full/base configurations.
- Explicit public-file scan found no key-shaped Base64 material, private endpoint/SSID or private-key blocks. Only the independent STATUS key is written.
- No test suite was created or executed. Independent focused review found no Critical/Important/Minor issues. Remote publication checks remain pending.
