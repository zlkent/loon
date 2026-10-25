# Home WG seed boundary and standalone check plan

> Execute inline with executing-plans; one independent focused review before publication.

**Goal:** Explain the observed `INVALID_SEED` without guessing or exposing parameters; provide the standalone JS the user requested.

**Evidence:** Device status revision 20261025.1 at 2026-10-25T07:42:53.102Z reports matching resource type/URL, seedValid=false, stage=ERROR, errorCode=INVALID_SEED. All storage/output checks are null. This proves execution stopped before storage read, not missing keys or a diagnosed newline bug.

**Design / approval:** User explicitly requested a subscribable diagnostic JS and previously authorized direct implementation/publication on this candidate branch. Add input-shape facts to the existing parser, preserving its validation and serialization. A separate Generic JS reads local parameters/status, emits only whitelisted codes/booleans/timestamps and writes a separate safe report key. No HTTP probes, mutations of secret storage, policy/ROS/full-config changes, or native engine readback claims.

**Alternatives:** Loosen seed matching immediately (rejected: actual input unknown); dump resource/raw JSON (rejected: possible secrets); safe shape facts plus standalone local checks (selected by implementer within the requested diagnostic scope).

**Files:** `Parser/HomeWGNode.js`, `Script/HomeWGCheck.js`, focused `tests/home_wg_check.test.js`, parser manifests, `docs/home-wg-node.md`, this ledger. Keep historic dirty files untouched.

## Steps

- [x] Restore exact source and device evidence. Public seed has a trailing LF; device input is still unknown. Official WG connectivity is not Loon acceptance.
- [x] Add failing focused checks, then input facts and the standalone script. Initial run: 1 pass / 8 expected assertion failures; implementation passed those 9. No fake markers or device initialization; no full suite. Added two further privacy/format boundary checks.
- [x] Verify focused tests, syntax, unchanged generation/validation/config, privacy and independent review. 11/11 focused checks and three syntax checks pass; original seed gate and all downstream generation are identical to pre-change HEAD, both full configs and seed unchanged. Initial unbounded Base64 scan falsely matched part of an existing long public binding token; token-boundary scan passed. Independent read-only review found no issues; no full suite run.
- [x] Publish explicit files only to the existing candidate branch; verify immutable Raw bytes and remote SHA. Published wrapper commit `e080deb464fba12ed716137f7b1433314178e163` matches remote; its manifest and guide Raw bytes match Git, and both fixed child JS URLs return HTTP 200/exact Git bytes. Main ref and 6620-byte full-config SHA256 remain unchanged. Final 11/11 focused checks pass. This post-publication ledger update is local; device execution/connectivity remain pending.

## Acceptance / blocker

Candidate diagnostics only. Current blocker is the actual resource representation at the seed gate. Manual JS can inspect local data but cannot independently read the parser callback or engine-loaded secrets. Seed acceptance and WG connectivity remain pending device evidence.

## Release ledger

- Implementation commit: `394cf9a57096bcaf74092396cecd1155bcfe173d`. Fixed parser manifest now binds this exact script commit; original immutable `.1` URL remains historical and will not update in place.
- Device next action: replace only the home subscription's parser-plugin URL with the new immutable manifest, update that node subscription, then run the standalone JS and share only check.v1. Full config/ROS/private keys remain untouched.

## Follow-up: correct the Remote Script subscription artifact

User reports the JS cannot be subscribed. Restored official `Loon0x00/LoonExampleConfig/RemoteScript/RemoteScript_Example2.list`: the subscription body is Script declarations without a `[Script]` section, not raw JS. Previous handoff incorrectly used a code asset as a subscription resource. Local JS tests never established subscription import success.

- [x] Verify official manifest format and reproduce missing subscription artifact with a focused failing assertion.
- [x] Add `RemoteScript/HomeWGCheck.list`: one Generic invocation pinned to the already published unchanged JS. Correct documentation to distinguish `.list` subscription from `.js` execution asset. No cron, secret/policy/ROS/full-config changes.
- [ ] Run focused checks, publish only explicit wrapper/test/docs/ledger files and verify immutable manifest/child JS. Device import/run and WG connectivity remain unverified.
