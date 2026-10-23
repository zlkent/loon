"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const scriptPath = path.join(__dirname, "../Parser/HomeWGProbe.js");
const marker = "# HOMEWG_CONFIG_PARSER_PROBE_OK";
const fixture = "[General]\ndns-server = 223.5.5.5\n[Rule]\nFINAL,DIRECT\n";

function run(type, resource = fixture, url = "https://raw.githubusercontent.com/zlkent/loon/main/Config/Loon.lcf") {
    const results = [], logs = [];
    const sandbox = {
        $resourceType: type, $resource: resource, $resourceUrl: url,
        $done: value => results.push(value),
        console: { log: value => logs.push(value) },
    };
    const source = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, "utf8") : "";
    vm.runInNewContext(source, sandbox, { timeout: 1000 });
    assert.equal(results.length, 1, "probe must finish exactly once");
    return { result: results[0], logs };
}

test("adds only a comment when full main configuration reaches the parser", () => {
    const out = run(0);
    assert.equal(out.result, marker + "\n" + fixture);
    assert.deepEqual(out.logs, ["HomeWG Probe: CONFIG_CALLBACK_REACHED"]);
});

test("probe is idempotent and accepts string resource type zero", () => {
    assert.equal(run("0", run(0).result).result, run(0).result);
});

test("other resources and other configurations are returned byte-for-byte unchanged", () => {
    for (const type of [1, 2, 3, 4, 5]) {
        const out = run(type, "content sentinel\r\n");
        assert.equal(out.result, "content sentinel\r\n");
        assert.deepEqual(out.logs, []);
    }
    const out = run(0, fixture, "https://example.invalid/other.lcf");
    assert.equal(out.result, fixture);
    assert.deepEqual(out.logs, []);
});

test("probe uses no argument, persistence, notification, HTTP or mutation APIs", () => {
    run(0);
    const source = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, "utf8") : "";
    assert.ok(source.length > 0);
    for (const name of ["$argument", "$persistentStore", "$httpClient", "$notification", "$config"]) {
        assert.ok(!source.includes(name), name);
    }
});
