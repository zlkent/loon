"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ROOT = path.join(__dirname, "..");
const BASE = "https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/";
const URL = BASE + "Probe/NodeSeed.txt";
const KEY = "zlkent.loon.node-probe.tag.v1";
const TAIL = ' = Shadowsocks,192.0.2.1,9,aes-128-gcm,"nodeprobe-not-a-secret",udp=false\n';
const SEED = "NodeProbe-SEED-DO-NOT-USE" + TAIL;
const generated = tag => "NodeProbe-" + tag + "-DO-NOT-USE" + TAIL;

function run(file, options = {}) {
    const state = options.state || new Map(), logs = [], results = [], writes = [], reads = [];
    const sandbox = {
        $argument: options.argument,
        $resourceType: options.type === undefined ? 1 : options.type,
        $resourceUrl: options.url === undefined ? URL : options.url,
        $resource: options.resource === undefined ? SEED : options.resource,
        $persistentStore: {
            read(key) {
                reads.push(key);
                if (options.readError) throw Error("SECRET READ DETAIL");
                return state.get(key);
            },
            write(value, key) {
                if (options.writeError) throw Error("SECRET WRITE DETAIL");
                writes.push([key, value]);
                if (options.writeFalse) return false;
                state.set(key, value);
                return true;
            },
        },
        console: { log: value => logs.push(value) },
        $done: value => results.push(value),
    };
    if (options.noStore) delete sandbox.$persistentStore;
    // These scripts must work without network, notification, config or require APIs.
    const filename = path.join(ROOT, file);
    const source = fs.existsSync(filename) ? fs.readFileSync(filename, "utf8") : "";
    let error;
    try { vm.runInNewContext(source, sandbox, { timeout: 1000 }); } catch (e) { error = e; }
    return { state, logs, results, writes, reads, error };
}

test("initializer saves only a strict test tag in an isolated key, with no resource context", () => {
    const out = run("Script/NodeProbeInit.js", { argument: { probeTag: "phone-test-1" }, resource: null });
    assert.equal(out.error, undefined);
    assert.deepEqual(out.writes, [[KEY, "phone-test-1"]]);
    assert.deepEqual(out.results, [undefined]);
    assert.deepEqual(out.logs, ["NodeProbe: LOCAL_TAG_SAVED"]);
});

test("initializer rejects missing, secret-shaped, extra and injection arguments before writing", () => {
    const bad = [undefined, null, "phone-test-1", {}, { probeTag: null },
        { probeTag: "" }, { probeTag: " phone-test-1" }, { probeTag: "phone-test-0" },
        { probeTag: "phone-test-1000000" }, { probeTag: "phone-test-1\nFINAL,PROXY" },
        { probeTag: "phone-test-1\u2028" }, { probeTag: "phone-test-1\n" },
        { probeTag: "A".repeat(43) + "=" },
        { probeTag: "phone-test-1", wgPrivateKey: "SECRET EXTRA DETAIL" }];
    for (const argument of bad) {
        const out = run("Script/NodeProbeInit.js", { argument });
        assert.match(String(out.error), /NodeProbe: INVALID_TEST_TAG/);
        assert.deepEqual(out.writes, []);
        assert.deepEqual(out.results, []);
        assert.deepEqual(out.logs, []);
    }
});

test("initializer fails closed on storage absence or failure and never echoes error details", () => {
    for (const opts of [{ noStore: true }, { writeError: true }, { writeFalse: true }]) {
        const out = run("Script/NodeProbeInit.js", { argument: { probeTag: "phone-test-1" }, ...opts });
        assert.match(String(out.error), /NodeProbe: STORE_WRITE_FAILED/);
        assert.ok(!String(out.error).includes("SECRET"));
        assert.deepEqual(out.results, []);
        assert.deepEqual(out.logs, []);
    }
});

test("separate parser context reads saved tag, and re-saving replaces it without other state changes", () => {
    const state = new Map([["zlkent.loon.home-wg.v1", "DO NOT TOUCH"]]);
    for (const tag of ["phone-test-1", "phone-test-2", "phone-test-999999"]) {
        assert.equal(run("Script/NodeProbeInit.js", { state, argument: { probeTag: tag } }).error, undefined);
        for (const type of [1, "1"]) {
            const out = run("Parser/NodeProbe.js", { state, type });
            assert.equal(out.error, undefined);
            assert.deepEqual(out.results, [generated(tag)]);
            assert.deepEqual(out.reads, [KEY]);
            assert.deepEqual(out.writes, []);
            assert.deepEqual(out.logs, ["NodeProbe: NODE_CALLBACK_REACHED", "NodeProbe: LOCAL_TAG_READ_OK"]);
        }
        assert.equal(state.get("zlkent.loon.home-wg.v1"), "DO NOT TOUCH");
        assert.equal(state.size, 2);
    }
});

test("missing local tag is visibly different from a parser never called", () => {
    for (const value of [undefined, null, ""]) {
        const out = run("Parser/NodeProbe.js", { state: new Map([[KEY, value]]) });
        assert.equal(out.error, undefined);
        assert.deepEqual(out.results, [generated("UNSET")]);
        assert.deepEqual(out.logs, ["NodeProbe: NODE_CALLBACK_REACHED", "NodeProbe: LOCAL_TAG_MISSING"]);
    }
});

test("non-target resources pass through unchanged without storage access or logs", () => {
    for (const options of [
        ...[0, "0", 2, 3, 4, 5, null].map(type => ({ type })),
        { url: "https://example.invalid/private-sub?token=SECRET" },
        { url: URL + ".evil" }, { url: URL + "?token=SECRET" }, { url: null },
    ]) {
        const out = run("Parser/NodeProbe.js", { ...options, resource: "sentinel\r\n", noStore: true });
        assert.equal(out.error, undefined);
        assert.deepEqual(out.results, ["sentinel\r\n"]);
        assert.deepEqual(out.reads, []);
        assert.deepEqual(out.logs, []);
    }
});

test("target parser aborts on unexpected source, bad local data or unavailable store without partial output", () => {
    for (const options of [
        { resource: "<html>SECRET ERROR</html>" }, { resource: null },
        { state: new Map([[KEY, "SECRET DATA"]]) },
        { state: new Map([[KEY, "phone-test-1\nFINAL,PROXY"]]) },
        { noStore: true }, { readError: true },
    ]) {
        const out = run("Parser/NodeProbe.js", options);
        assert.match(String(out.error), /NodeProbe: (INVALID_SEED|INVALID_LOCAL_TAG|STORE_READ_FAILED)/);
        assert.ok(!String(out.error).includes("SECRET"));
        assert.deepEqual(out.results, []);
        assert.deepEqual(out.writes, []);
        assert.deepEqual(out.logs, ["NodeProbe: NODE_CALLBACK_REACHED"]);
    }
});

test("repeated node updates are deterministic and accept normalized refs/heads URLs", () => {
    const state = new Map([[KEY, "phone-test-2"]]);
    const first = run("Parser/NodeProbe.js", { state });
    assert.deepEqual(first.results, [generated("phone-test-2")]);
    for (const resource of [SEED, "\uFEFF" + SEED.replace(/\n/g, "\r\n"), first.results[0]]) {
        const out = run("Parser/NodeProbe.js", { state, resource,
            url: URL.replace("/codex/", "/refs/heads/codex/") });
        assert.equal(out.error, undefined);
        assert.deepEqual(out.results, first.results);
    }
});

function artifact(file) {
    const filename = path.join(ROOT, file);
    return fs.existsSync(filename) ? fs.readFileSync(filename, "utf8") : "";
}

test("standalone configuration explicitly retains the two links without a full-config parser", () => {
    const text = artifact("Config/NodeProbe.lcf");
    assert.ok(text.includes("[Remote Proxy]\n"));
    const line = text.split("\n").find(line => line.startsWith("节点参数实验 = "));
    assert.equal(line, "节点参数实验 = " + URL + ",parser-enabled=true,parser-plugin=" +
        BASE + "Plugin/NodeProbeParser.lpx,enabled=true");
    assert.ok(text.includes(BASE + "Plugin/NodeProbeControl.lpx,enabled=true"));
    const uncommented = text.split("\n").filter(line => line.trim() && !line.trim().startsWith("#"));
    assert.deepEqual(uncommented.filter(line => /^(FINAL,|IP-CIDR,|DOMAIN)/.test(line)), ["FINAL,DIRECT"]);
    assert.ok(!/resource-parser|url-test|fallback|\[MITM\]|\[Host\]/i.test(uncommented.join("\n")));
    assert.ok(!/192\.168\.1\.|10\.77\.77\./.test(text));
    assert.equal(artifact("Probe/NodeSeed.txt"), SEED);
});

test("full update template declares the parser plugin itself, not only its subscription binding", () => {
    const text = artifact("Config/NodeProbe.lcf").replace(/\r\n/g, "\n");
    const plugins = text.split("[Plugin]\n")[1].split(/^\[/m)[0].split("\n")
        .map(line => line.trim()).filter(line => line && !line.startsWith("#"));
    assert.deepEqual(plugins, [
        BASE + "Plugin/NodeProbeControl.lpx,enabled=true",
        BASE + "Plugin/NodeProbeParser.lpx,enabled=true",
    ]);
});

test("normal control plugin and parser plugin use separate scripts and no secret arguments", () => {
    const control = artifact("Plugin/NodeProbeControl.lpx");
    const parser = artifact("Plugin/NodeProbeParser.lpx");
    assert.ok(control.includes("[Argument]\nprobeTag = input,\"\",type=string"));
    assert.ok(control.includes('generic then script("' + BASE + 'Script/NodeProbeInit.js", {${probeTag}})'));
    assert.ok(!control.includes("#!type"));
    assert.ok(parser.includes("#!type = parser"));
    assert.ok(parser.includes('generic then script("' + BASE + 'Parser/NodeProbe.js")'));
    assert.ok(!parser.includes("[Argument]"));
    for (const text of [control, parser]) {
        assert.ok(!/wgPrivateKey|wgPublicKey|preshared|network-changed|\[Mitm\]/i.test(text));
    }
});

test("formal internet configuration remains byte-for-byte unchanged", () => {
    const hash = require("node:crypto").createHash("sha256").update(fs.readFileSync(path.join(ROOT, "Config/Loon.lcf"))).digest("hex");
    assert.equal(hash, "fabe4c679bc7eba0b4674e67ced73b1874c0131b47f8a3cd87e0b3ac79658037");
});
