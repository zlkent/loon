"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const secretKey = "zlkent.loon.home-wg.node.v1";
const statusKey = "zlkent.loon.home-wg.status.v1";
const checkKey = "zlkent.loon.home-wg.check.v1";
const seed = fs.readFileSync(path.join(root, "Probe/HomeWGSeed.txt"), "utf8");
test("existing HomeWG complete subscription binds the .3 parser release in both places", () => {
    const config = fs.readFileSync(path.join(root, "Config/Loon-HomeWG.lcf"), "utf8");
    const parser = "https://raw.githubusercontent.com/zlkent/loon/c374eb2b9f945c8f755aa710878a53756203e7a6/Plugin/HomeWGNodeParserPinned.lpx";
    assert.ok(config.includes("parser-plugin=" + parser + ",enabled=true"), "complete-config update must change the actual home-node parser binding");
    assert.ok(config.includes("\n" + parser + ",enabled=true"), "plugin list must use the same parser release");
    assert.ok(config.includes("https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Probe/HomeWGSeed.txt"), "keep seed URL and parser scope unchanged");
});
test("Remote Script subscription contains one Generic declaration, not JS or a plugin section", () => {
    const file = path.join(root, "RemoteScript/HomeWGCheck.list");
    assert.ok(fs.existsSync(file), "provide a Remote Script manifest instead of subscribing raw JS");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("#"));
    assert.deepEqual(lines, ['generic then script("https://raw.githubusercontent.com/zlkent/loon/394cf9a57096bcaf74092396cecd1155bcfe173d/Script/HomeWGCheck.js") with tag="家庭WG独立检查", timeout=10']);
});
function run(file, resource, values = {}, broken = false, scope = {}) {
    const state = new Map(Object.entries(values)), logs = [], reads = [], writes = [], done = [];
    let error;
    const context = {
        $resourceType: scope.type === undefined ? 1 : scope.type,
        $resourceUrl: scope.url === undefined ? "https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Probe/HomeWGSeed.txt" : scope.url,
        $resource: resource,
        $persistentStore: {
            read(k) { reads.push(k); if (broken) throw Error("DO_NOT_DISCLOSE"); return state.get(k); },
            write(v, k) { writes.push(k); state.set(k, v); return true; }
        },
        console: { log(v) { logs.push(v); } },
        $notification: { post() { throw Error("DO_NOT_DISCLOSE"); } },
        $done(v) { done.push(v); }
    };
    const location = path.join(root, file);
    try { vm.runInNewContext(fs.existsSync(location) ? fs.readFileSync(location, "utf8") : "", context); }
    catch (e) { error = e.message; }
    return { state, logs, reads, writes, done, error };
}
function status(r, key = statusKey) {
    const value = JSON.parse(r.state.get(key) || "null");
    assert.ok(value, "script must create its safe status report");
    if (key === statusKey && value.errorCode === "INVALID_SEED") {
        assert.ok(value.sourceFacts, "parser must classify rejected input without dumping it");
    }
    return value;
}
test("seed with no final LF is classified but not accepted before actual device evidence", () => {
    const r = run("Parser/HomeWGNode.js", seed.trimEnd());
    assert.equal(r.error, "HomeWGNode: INVALID_SEED");
    assert.equal(status(r).sourceFacts.trimmedSeedMatches, true);
    assert.equal(status(r).sourceFacts.endsWithLF, false);
    assert.equal(r.reads.length, 0);
});
test("canonical public seed retains placeholder behavior when no local data exists", () => {
    const r = run("Parser/HomeWGNode.js", seed);
    assert.equal(r.error, undefined);
    assert.equal(r.done[0], seed);
    assert.equal(status(r).stage, "SETUP_REQUIRED");
});
for (const [name, input, kind] of [["object", {}, "object"], ["array", [], "array"], ["null", null, "null"], ["undefined", undefined, "undefined"]]) {
    test("non-string resource shape: " + name, () => {
        const r = run("Parser/HomeWGNode.js", input);
        assert.equal(status(r).sourceFacts.kind, kind);
        assert.equal(r.error, "HomeWGNode: INVALID_SEED");
        assert.equal(r.reads.length, 0);
    });
}
test("standalone reports missing data, completes once and only writes its independent report", () => {
    const r = run("Script/HomeWGCheck.js");
    assert.equal(r.error, undefined);
    assert.equal(status(r, checkKey).local.found, false);
    assert.equal(r.done.length, 1);
    assert.deepEqual(r.writes, [checkKey]);
});
test("standalone never echoes malformed local JSON or polluted status strings", () => {
    const r = run("Script/HomeWGCheck.js", undefined, {
        [secretKey]: "DO_NOT_DISCLOSE",
        [statusKey]: JSON.stringify({ stage: "DO_NOT_DISCLOSE", revision: "DO_NOT_DISCLOSE", errorCode: "DO_NOT_DISCLOSE", checkedAt: "DO_NOT_DISCLOSE", sourceFacts: { kind: "DO_NOT_DISCLOSE", trimmedSeedMatches: "DO_NOT_DISCLOSE" }, storeRead: "DO_NOT_DISCLOSE", extra: "DO_NOT_DISCLOSE" })
    });
    assert.equal(status(r, checkKey).local.jsonValid, false);
    assert.ok(!JSON.stringify([r.logs, status(r, checkKey)]).includes("DO_NOT_DISCLOSE"));
    assert.equal(r.done.length, 1);
    assert.deepEqual(r.writes, [checkKey]);
});
test("standalone handles storage failure without logging the exception", () => {
    const r = run("Script/HomeWGCheck.js", undefined, {}, true);
    assert.equal(r.error, undefined);
    assert.equal(status(r, checkKey).local.read, false);
    assert.ok(!JSON.stringify(r.logs).includes("DO_NOT_DISCLOSE"));
    assert.equal(r.done.length, 1);
});
test("WG-shaped single line never supplies fallback credentials when local data is missing", () => {
    const r = run("Parser/HomeWGNode.js", '家庭WG = WireGuard,private-key="DO_NOT_DISCLOSE"');
    assert.equal(r.error, undefined);
    assert.equal(status(r).sourceFacts.looksLikeWGLine, true);
    assert.equal(status(r).inputAccepted, true);
    assert.equal(status(r).inputKind, "WG_LINE");
    assert.equal(status(r).seedValid, false);
    assert.equal(status(r).stage, "SETUP_REQUIRED");
    assert.equal(r.done[0], seed);
    assert.ok(!JSON.stringify([r.logs, status(r)]).includes("DO_NOT_DISCLOSE"));
});
function localFixture() {
    const crypto = require("node:crypto");
    return { wgPrivateKey: crypto.randomBytes(32).toString("base64"),
        wgPublicKey: crypto.randomBytes(32).toString("base64"),
        wgPresharedKey: "", wgHost: "fixture.example.invalid", wgPort: 51820,
        wgAddress: "10.77.77.2", homeSSID: "DO_NOT_DISCLOSE" };
}
test("seed -> WG -> WG roundtrip is idempotent and regenerated from current local data", () => {
    const p = localFixture();
    const values = { [secretKey]: JSON.stringify(p) };
    const first = run("Parser/HomeWGNode.js", seed, values);
    assert.equal(first.error, undefined);
    assert.equal(status(first).stage, "OUTPUT_READY");
    const second = run("Parser/HomeWGNode.js", first.done[0], values);
    assert.equal(second.error, undefined);
    assert.equal(status(second).inputAccepted, true);
    assert.equal(status(second).stage, "OUTPUT_READY");
    assert.equal(second.done[0], first.done[0]);
    const replacement = localFixture();
    const changed = run("Parser/HomeWGNode.js", first.done[0], { [secretKey]: JSON.stringify(replacement) });
    assert.equal(changed.error, undefined);
    assert.equal(status(changed).outputValid, true);
    assert.ok(changed.done[0].includes(replacement.wgPrivateKey));
    assert.ok(!changed.done[0].includes(p.wgPrivateKey));
    assert.ok(!JSON.stringify([changed.logs, status(changed)]).includes(p.wgPrivateKey));
    assert.deepEqual(changed.writes.every(k => k === statusKey), true);
});
test("WG-shaped input with invalid local data fails, never reuses the input node", () => {
    const r = run("Parser/HomeWGNode.js", '家庭WG = WireGuard,private-key="DO_NOT_DISCLOSE"\n', { [secretKey]: "DO_NOT_DISCLOSE" });
    assert.equal(r.error, "HomeWGNode: INVALID_LOCAL_JSON");
    assert.equal(r.done.length, 0);
    assert.ok(!JSON.stringify([r.logs, status(r)]).includes("DO_NOT_DISCLOSE"));
});
for (const input of ['其他WG = WireGuard,private-key="DO_NOT_DISCLOSE"\n', '家庭WG = WireGuard,private-key="DO_NOT_DISCLOSE"\n其他 = DIRECT\n', '家庭WG\n= WireGuard,private-key="DO_NOT_DISCLOSE"\n']) {
    test("reject unrelated node names or embedded multiline input before reading parameters", () => {
        const r = run("Parser/HomeWGNode.js", input);
        assert.equal(r.error, "HomeWGNode: INVALID_SEED");
        assert.equal(r.reads.length, 0);
        assert.equal(r.done.length, 0);
    });
}
test("WG-shaped input still fails on malformed key or inaccessible local store", () => {
    const input = '家庭WG = WireGuard,private-key="DO_NOT_DISCLOSE"\n';
    const invalidKey = run("Parser/HomeWGNode.js", input, { [secretKey]: "{}" });
    assert.equal(invalidKey.error, "HomeWGNode: INVALID_PHONE_PRIVATE_KEY");
    assert.equal(invalidKey.done.length, 0);
    const unreadable = run("Parser/HomeWGNode.js", input, {}, true);
    assert.equal(unreadable.error, "HomeWGNode: STORE_READ_FAILED");
    assert.equal(unreadable.done.length, 0);
});
test("unrelated subscription scope still passes through without reading local secrets", () => {
    const input = '家庭WG = WireGuard,private-key="DO_NOT_DISCLOSE"\n';
    const r = run("Parser/HomeWGNode.js", input, {}, false, { url: "https://example.invalid/subscription" });
    assert.equal(r.error, undefined);
    assert.equal(r.done[0], input);
    assert.equal(r.reads.length, 0);
    assert.equal(r.writes.length, 0);
    assert.ok(!JSON.stringify(r.logs).includes("DO_NOT_DISCLOSE"));
});
test("standalone checks local formats without changing or emitting parameter values", () => {
    const crypto = require("node:crypto");
    const p = {
        wgPrivateKey: crypto.randomBytes(32).toString("base64"),
        wgPublicKey: crypto.randomBytes(32).toString("base64"),
        wgPresharedKey: "", wgHost: "fixture.example.invalid", wgPort: 51820,
        wgAddress: "10.77.77.2/32", homeSSID: "DO_NOT_DISCLOSE"
    };
    const serialized = JSON.stringify(p);
    const r = run("Script/HomeWGCheck.js", undefined, { [secretKey]: serialized });
    const local = status(r, checkKey).local;
    for (const field of ["read", "found", "jsonValid", "privateKeyFormat", "routerPublicKeyFormat", "presharedKeyFormat", "hostFormat", "portFormat", "addressFormat", "ssidConfigured"]) {
        assert.equal(local[field], true, field);
    }
    assert.equal(local.pskConfigured, false);
    const observable = JSON.stringify([r.logs, status(r, checkKey)]);
    for (const value of [p.wgPrivateKey, p.wgPublicKey, p.wgHost, p.wgAddress, p.homeSSID]) assert.ok(!observable.includes(value));
    assert.equal(r.state.get(secretKey), serialized);
    assert.deepEqual(r.writes, [checkKey]);
});
