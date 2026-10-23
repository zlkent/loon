"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "Parser/HomeWG.js");
const base = fs.readFileSync(path.join(root, "Config/Loon.lcf"), "utf8");
const sourceUrl = "https://raw.githubusercontent.com/zlkent/loon/main/Config/Loon.lcf";
const pluginUrl = "https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Plugin/HomeWG.lpx";
const storeKey = "zlkent.loon.home-wg.v1";
// Synthetic fixtures only; none of these keys are used on any device.
const args = {
    wgPrivateKey: Buffer.alloc(32, 1).toString("base64"),
    wgPublicKey: Buffer.alloc(32, 2).toString("base64"),
    wgPresharedKey: "",
    wgHost: "home.example.com",
    wgPort: 51820,
    wgAddress: "10.77.77.2",
    homeSSID: "Fixture's WIFI",
};

function execute(options = {}) {
    const calls = [], logs = [], notifications = [], writes = [], reads = [];
    const store = options.store || {};
    let failure;
    const context = {
        $resourceType: options.type === undefined ? 0 : options.type,
        $resource: options.resource === undefined ? base : options.resource,
        $resourceUrl: options.url === undefined ? sourceUrl : options.url,
        $argument: options.args === undefined ? { ...args } : options.args,
        $done: (result) => calls.push(result),
        console: { log: (...v) => logs.push(v), error: (...v) => logs.push(v) },
        $notification: { post: (...v) => notifications.push(v) },
        $persistentStore: {
            read: (key) => { reads.push(key); return store[key]; },
            write: (value, key) => {
                if (options.writeFails) return false;
                if (value === undefined) delete store[key];
                else store[key] = value;
                writes.push(key);
                return true;
            },
        },
    };
    if (options.noStorage) delete context.$persistentStore;
    try {
        const script = fs.existsSync(scriptPath) ? fs.readFileSync(scriptPath, "utf8") : "";
        vm.runInNewContext(script, context, { timeout: 1000, filename: "HomeWG.js" });
    } catch (error) { failure = error; }
    return { result: calls[0], calls, logs, notifications, failure, store, writes, reads };
}

function success(run) {
    assert.equal(run.failure, undefined);
    assert.equal(run.calls.length, 1, "parser must return one generated configuration");
    assert.equal(typeof run.result, "string");
    return run.result;
}

function rejected(run) {
    assert.ok(run.failure, "invalid input must abort generation");
    assert.match(run.failure.message, /^HomeWG:/);
    assert.equal(run.calls.length, 0, "never return a partial or original config on validation failure");
    assert.equal(run.writes.length, 0, "failure must not replace saved parameters");
    const observable = JSON.stringify([run.logs, run.notifications, run.failure.message]);
    for (const value of [args.wgPrivateKey, args.wgPublicKey, args.homeSSID, args.wgHost]) {
        assert.ok(!observable.includes(value), "diagnostics must not disclose local parameters");
    }
}

function sections(config) {
    const result = {};
    let name;
    for (const line of config.replace(/^\uFEFF/, "").split(/\r?\n/)) {
        const match = line.trim().match(/^\[([^\]]+)\]$/);
        if (match) {
            name = match[1];
            assert.ok(!Object.hasOwn(result, name), "no duplicate section");
            result[name] = [];
        } else if (line.trim() && !line.trim().startsWith("#")) {
            result[name].push(line.trim());
        }
    }
    return result;
}

test("injects WG node, SSID strategy and rule; preserves existing routing and DNS", () => {
    const run = execute();
    const out = sections(success(run)), before = sections(base);
    assert.equal(out.Proxy.length, 1);
    assert.match(out.Proxy[0], /^家庭WG = WireGuard,interface-ip=10\.77\.77\.2,/);
    assert.ok(out.Proxy[0].includes('private-key="' + args.wgPrivateKey + '"'));
    assert.ok(out.Proxy[0].includes('allowed-ips="192.168.1.0/24"'));
    assert.ok(out.Proxy[0].includes("endpoint=home.example.com:51820"));
    assert.ok(out.Proxy[0].includes("mtu=1280,keepalive=25"));
    assert.ok(!out.Proxy[0].includes("preshared-key="));
    assert.equal(out["Proxy Group"][0], '家庭内网 = ssid,default=家庭WG,cellular=家庭WG,"Fixture\'s WIFI"=DIRECT');
    assert.deepEqual(out["Proxy Group"].slice(1), before["Proxy Group"]);
    assert.equal(out.Rule[0], "IP-CIDR,192.168.1.0/24,家庭内网,no-resolve");
    assert.deepEqual(out.Rule.slice(1), before.Rule);
    assert.deepEqual(out["Remote Rule"], before["Remote Rule"]);
    assert.deepEqual(out.MITM, before.MITM);
    assert.deepEqual(out.Host, before.Host);
    for (const line of before.General.filter(x => !/^(skip-proxy|include-tun)\s*=/.test(x))) {
        assert.ok(out.General.includes(line), "preserve unrelated General settings");
    }
    assert.ok(out.General.includes("include-tun = 192.168.1.0/24"));
    assert.equal(out["Remote Filter"][0], '全部节点 = NameRegex, FilterKey="^(?!家庭WG$).*"');
    assert.deepEqual(out["Remote Filter"].slice(1), before["Remote Filter"].slice(1));
    assert.ok(out.Plugin.includes(pluginUrl + ",enabled=true"));
    assert.deepEqual(run.logs, []);
    assert.deepEqual(run.notifications, []);
    assert.equal(JSON.parse(run.store[storeKey]).wgPrivateKey, args.wgPrivateKey);
});

test("subtracts only home /24 from skip-proxy and preserves other private destinations", () => {
    const out = sections(success(execute()));
    const skip = out.General.find(x => x.startsWith("skip-proxy"));
    assert.equal(skip, "skip-proxy = 192.168.0.0/24,192.168.2.0/23,192.168.4.0/22,192.168.8.0/21,192.168.16.0/20,192.168.32.0/19,192.168.64.0/18,192.168.128.0/17,10.0.0.0/8,172.16.0.0/12,localhost,*.local");
});

test("handles repeated updates without duplicate sections, markers, nodes, plugins or rules", () => {
    const first = success(execute());
    assert.equal(success(execute({ resource: first })), first);
    assert.equal(success(execute({ resource: first, args: { ...args, wgHost: "new.example.com" } })).includes("endpoint=new.example.com:51820"), true);
});

test("empty UI parameters recover saved parameters on next update, not new defaults", () => {
    const run = execute({ args: { ...args, wgPort: 12345, wgAddress: "10.77.77.3" } });
    const first = success(run);
    assert.equal(success(execute({ args: {}, store: run.store })), first);
    assert.equal(success(execute({ args: { wgPort: 51820, wgAddress: "10.77.77.2", wgPrivateKey: "", wgPublicKey: "", wgHost: "", homeSSID: "" }, store: run.store })), first);
});

test("partially filled controls must not silently mix old and new credentials", () => {
    const run = execute(); success(run);
    rejected(execute({ args: { wgPrivateKey: args.wgPrivateKey }, store: run.store }));
});

test("supports optional PSK, IP endpoint, apostrophe and exact SSID spaces", () => {
    const psk = Buffer.alloc(32, 3).toString("base64");
    const out = success(execute({ args: { ...args, wgPresharedKey: psk, wgHost: "203.0.113.10", homeSSID: " Fixture's WIFI " } }));
    assert.ok(out.includes('preshared-key="' + psk + '"'));
    assert.ok(out.includes("endpoint=203.0.113.10:51820"));
    assert.ok(out.includes('" Fixture\'s WIFI "=DIRECT'));
});

test("preserves private subscriptions, MITM, unrelated plugins and include routes already in input", () => {
    const input = base.replace("[Remote Proxy]", "[Remote Proxy]\nFixture = https://sub.example.invalid/token,enabled=true")
        .replace("ca-p12 =", "ca-p12 = LOCAL_CERT_FIXTURE")
        .replace("[General]", "[General]\ninclude-tun = 10.9.0.0/24")
        .replace("[Plugin]", "[Plugin]\nhttps://example.invalid/other.lpx,enabled=true");
    const before = sections(input), out = sections(success(execute({ resource: input })));
    assert.deepEqual(out["Remote Proxy"], before["Remote Proxy"]);
    assert.deepEqual(out.MITM, before.MITM);
    assert.ok(out.Plugin.includes("https://example.invalid/other.lpx,enabled=true"));
    assert.ok(out.General.includes("include-tun = 10.9.0.0/24,192.168.1.0/24"));
});

test("non-config resources are passed through without reading or writing secrets", () => {
    for (const type of [1, 2, 3, 4, 5]) {
        const run = execute({ type, resource: "resource fixture", args: {} });
        assert.equal(success(run), "resource fixture");
        assert.deepEqual(run.writes, []);
        assert.deepEqual(run.reads, []);
    }
});

test("wrong config source is rejected before secret material is accessed", () => {
    for (const url of ["https://example.com/Loon.lcf", sourceUrl + "/other", sourceUrl.replace("https:", "http:"), sourceUrl.replace("/zlkent/", "/attacker/")]) {
        const run = execute({ url, args: {} });
        rejected(run);
        assert.deepEqual(run.reads, []);
    }
    success(execute({ url: sourceUrl.replace("/main/", "/refs/heads/main/") }));
    success(execute({ url: sourceUrl + "?cache=1" }));
});

test("missing parameters or malformed saved state abort without returning the public base", () => {
    rejected(execute({ args: {} }));
    rejected(execute({ args: {}, store: { [storeKey]: "broken JSON" } }));
    rejected(execute({ args: {}, store: { [storeKey]: '{"wgPrivateKey":"bad"}' } }));
});

test("rejects invalid key material and unsafe strings without echoing any input", () => {
    for (const name of ["wgPrivateKey", "wgPublicKey", "wgPresharedKey"]) {
        for (const value of ["bad", "A".repeat(43) + "=", args.wgPrivateKey + '\n[Rule]', '"' + args.wgPrivateKey]) {
            rejected(execute({ args: { ...args, [name]: value } }));
        }
    }
    for (const name of ["homeSSID", "wgHost"]) {
        for (const value of ['bad"name', "bad\\name", "bad\nname", "bad,name", "bad\rname", "bad\0name"]) {
            rejected(execute({ args: { ...args, [name]: value } }));
        }
    }
});

test("rejects invalid host, interface address and port", () => {
    for (const wgHost of ["https://home.example.com", "home.example.com:51820", "999.1.1.1", "-bad.example.com", "a..example.com"]) {
        rejected(execute({ args: { ...args, wgHost } }));
    }
    for (const wgAddress of ["10.77.77.2/32", "999.1.1.1", "192.168.1.2", "0.0.0.0", "10.77.77.1", "10.77.77.255"]) {
        rejected(execute({ args: { ...args, wgAddress } }));
    }
    for (const wgPort of [0, 65536, 1.1, "51820,udp=true", true, "", null]) {
        rejected(execute({ args: { ...args, wgPort } }));
    }
});

test("storage unavailable or write failure aborts generation instead of promising persistence", () => {
    rejected(execute({ noStorage: true }));
    rejected(execute({ writeFails: true }));
});

test("rejects colliding hand-written names, duplicate sections and unbalanced generated markers", () => {
    rejected(execute({ resource: base.replace("[Proxy]", "[Proxy]\n家庭WG = WireGuard,manual") }));
    rejected(execute({ resource: base.replace("[Proxy Group]", "[Proxy Group]\n家庭内网 = select,DIRECT") }));
    rejected(execute({ resource: base + "\n[General]\n" }));
    rejected(execute({ resource: base.replace("[Proxy]", "[Proxy]\n# BEGIN ZLKENT HOME WG") }));
});

test("rejects changed template invariants and more specific bypass conflicts", () => {
    rejected(execute({ resource: base.replace('[Rule]', '[Missing Rule]') }));
    rejected(execute({ resource: base.replace('FilterKey=".*"', 'FilterKey="US"') }));
    rejected(execute({ resource: base.replace('[General]', '[General]\nbypass-tun = 192.168.1.10/32') }));
    rejected(execute({ resource: base.replace('[General]', '[General]\nskip-proxy = 192.168.*') }));
    success(execute({ resource: base.replace('[General]', '[General]\nbypass-tun = 192.168.0.0/16') }));
});

test("normalizes CRLF and BOM without producing duplicate blocks", () => {
    const once = success(execute({ resource: "\uFEFF" + base.replace(/\r?\n/g, "\r\n") }));
    assert.equal(success(execute({ resource: once })), once);
});

test("route subtraction handles broad ranges and removes only covered home IPs", () => {
    function range(value) {
        const [ip, prefix = "32"] = value.split("/");
        const num = ip.split(".").reduce((n, x) => n * 256 + Number(x), 0);
        const size = 2 ** (32 - Number(prefix));
        return [Math.floor(num / size) * size, Math.floor(num / size) * size + size - 1];
    }
    const home = range("192.168.1.0/24");
    for (const network of ["0.0.0.0/0", "192.0.0.0/8", "192.168.0.0/16", "192.168.1.0/24", "192.168.1.42/32", "192.168.2.0/24"]) {
        const input = base.replace(/^skip-proxy = .*$/m, "skip-proxy = " + network);
        const out = sections(success(execute({ resource: input })));
        const ranges = out.General.find(x => x.startsWith("skip-proxy")).split("=")[1].trim().split(",").filter(Boolean).map(range);
        for (const [first, last] of ranges) assert.ok(last < home[0] || first > home[1]);
        const [first, last] = range(network);
        const overlap = Math.max(0, Math.min(last, home[1]) - Math.max(first, home[0]) + 1);
        assert.equal(ranges.reduce((n, [a, b]) => n + b - a + 1, 0), last - first + 1 - overlap);
        assert.equal(success(execute({ resource: success(execute({ resource: input })) })), success(execute({ resource: input })));
    }
});

test("rejects invalid FINAL placement and malformed markers", () => {
    rejected(execute({ resource: base.replace('FINAL,节点选择', 'FINAL,节点选择\nIP-CIDR,8.8.8.8/32,DIRECT') }));
    rejected(execute({ resource: base.replace('FINAL,节点选择', 'IP-CIDR,8.8.8.8/32,DIRECT') }));
    rejected(execute({ resource: base.replace('[Proxy]', '[Proxy]\n# END ZLKENT HOME WG') }));
    rejected(execute({ resource: base.replace('[Proxy]', '[Proxy]\n# BEGIN ZLKENT HOME WG\n# BEGIN ZLKENT HOME WG\n# END ZLKENT HOME WG') }));
});

test("SSID byte length and Unicode controls are validated before interpolation", () => {
    success(execute({ args: { ...args, homeSSID: "\u5bb6\u91cc\ud83c\udfe0 WiFi" } }));
    for (const homeSSID of ["x".repeat(33), "\u5bb6".repeat(11), "bad\u2028name", "bad\u2029name", "bad\ud800name"]) {
        rejected(execute({ args: { ...args, homeSSID } }));
    }
});

test("plugin declares empty secret defaults and passes all parameters to generic parser", () => {
    const plugin = fs.readFileSync(path.join(root, "Plugin/HomeWG.lpx"), "utf8");
    assert.match(plugin, /^#!type\s*=\s*parser$/m);
    assert.match(plugin, /^#!loon_version\s*=\s*3\.5\.2\(1008\)$/m);
    for (const name of ["wgPrivateKey", "wgPublicKey", "wgPresharedKey", "wgHost", "homeSSID"]) {
        assert.match(plugin, new RegExp('^' + name + '\\s*=\\s*input,"",', 'm'));
    }
    for (const name of Object.keys(args)) assert.ok(plugin.includes('${' + name + '}'));
    assert.ok(plugin.includes("/codex/wg-local-parameters/Parser/HomeWG.js"));
    assert.ok(!plugin.includes(args.wgPrivateKey));
});
