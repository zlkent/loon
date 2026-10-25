/* Secrets stay in the original local store and the generated node.
 * Diagnostics contain only fixed codes, timestamps and booleans. No HTTP,
 * secret-store writes, raw exceptions, input values or engine-readback claims.
 */
(function () {
    "use strict";
    var BASE = "https://raw.githubusercontent.com/zlkent/loon/";
    var FILE = "codex/wg-local-parameters/Probe/HomeWGSeed.txt";
    var STORE = "zlkent.loon.home-wg.node.v1";
    var STATUS = "zlkent.loon.home-wg.status.v1";
    var REVISION = "20261025.1";
    var SEED = '家庭WG = Shadowsocks,192.0.2.1,9,aes-128-gcm,"homewg-not-configured",udp=false\n';
    var type = typeof $resourceType === "undefined" ? null : $resourceType;
    var url = typeof $resourceUrl === "undefined" ? null : $resourceUrl;
    var typeMatches = type === 1 || type === "1";
    var urlMatches = url === BASE + FILE || url === BASE + "refs/heads/" + FILE;
    var status = {
        revision: REVISION, checkedAt: null, stage: "START", errorCode: null,
        resourceTypeMatches: typeMatches, resourceUrlMatches: urlMatches,
        seedValid: null, storeRead: null, storeFound: null, jsonValid: null,
        keyFormatsValid: null, pskConfigured: null, parametersValid: null,
        outputMatches: null, outputValid: null, engineReadback: "UNAVAILABLE"
    };
    function label(value) { return value === null ? "未检查" : value ? "通过" : "未通过"; }
    function report(stage, terminal) {
        // Every diagnostic channel is best-effort, never part of node generation.
        status.stage = stage;
        try { status.checkedAt = new Date().toISOString(); } catch (_) { /* No raw errors. */ }
        var safe;
        try { safe = JSON.stringify(status); } catch (_) { return; }
        try { console.log("HomeWGNode: DIAGNOSTIC " + safe); } catch (_) { /* Optional. */ }
        try {
            if (typeof $persistentStore !== "undefined" && typeof $persistentStore.write === "function") {
                if ($persistentStore.write(safe, STATUS) === false) {
                    try { console.log("HomeWGNode: STATUS_WRITE_FAILED"); } catch (_) { /* Optional. */ }
                }
            }
        } catch (_) { /* A status-write failure must not invalidate a node. */ }
        if (terminal) {
            try {
                if (typeof $notification !== "undefined" && typeof $notification.post === "function") {
                    $notification.post("家庭WG解析诊断", REVISION + " / " + stage,
                        "本地读取：" + label(status.storeRead) + "；找到数据：" + label(status.storeFound) +
                        "；JSON：" + label(status.jsonValid) + "；密钥格式：" + label(status.keyFormatsValid) +
                        "；输出一致：" + label(status.outputValid) +
                        (status.errorCode ? "；错误码：" + status.errorCode : "") +
                        "。仅检查解析器输出，不代表引擎加载或握手成功。");
                }
            } catch (_) { /* Notifications can be unavailable or disabled. */ }
        }
    }
    if (!typeMatches || !urlMatches) {
        // Do not overwrite this subscription's status for unrelated resources.
        if (urlMatches) report("RESOURCE_NOT_MATCHED", true);
        else {
            try { console.log("HomeWGNode: " + REVISION + " RESOURCE_PASSTHROUGH"); } catch (_) { /* Optional. */ }
        }
        $done($resource);
        return;
    }
    report("START", false);
    function fail(code) {
        status.errorCode = code;
        report("ERROR", true);
        throw new Error("HomeWGNode: " + code);
    }
    var source = typeof $resource === "string" ? $resource.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n") : "";
    status.seedValid = source === SEED;
    if (!status.seedValid) fail("INVALID_SEED");
    var saved;
    try {
        saved = $persistentStore.read(STORE);
        status.storeRead = true;
    } catch (_) { status.storeRead = false; fail("STORE_READ_FAILED"); }
    status.storeFound = saved !== null && saved !== undefined && saved !== "";
    report("STORE_READ", false);
    if (!status.storeFound) {
        report("SETUP_REQUIRED", true);
        console.log("HomeWGNode: SETUP_REQUIRED");
        // Stable name keeps the config loadable before one-time local setup.
        // This documented placeholder is deliberately unusable, never a fallback.
        $done(SEED);
        return;
    }
    var p;
    try { p = JSON.parse(saved); } catch (_) { status.jsonValid = false; fail("INVALID_LOCAL_JSON"); }
    status.jsonValid = !!p && typeof p === "object" && !Array.isArray(p);
    if (!status.jsonValid) fail("INVALID_LOCAL_JSON");
    report("JSON_VALID", false);
    function key(value, code, optional) {
        if (optional && (value === undefined || value === "")) return "";
        if (typeof value !== "string") fail(code);
        value = value.trim();
        if (!/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(value) || /^A{43}=$/.test(value)) fail(code);
        return value;
    }
    function ipv4(value) {
        if (typeof value !== "string" || !/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) return false;
        return value.split(".").every(function (n) { return Number(n) <= 255; });
    }
    status.keyFormatsValid = false;
    var privateKey = key(p.wgPrivateKey, "INVALID_PHONE_PRIVATE_KEY", false);
    var publicKey = key(p.wgPublicKey, "INVALID_ROUTER_PUBLIC_KEY", false);
    var psk = key(p.wgPresharedKey, "INVALID_PRESHARED_KEY", true);
    status.keyFormatsValid = true;
    status.pskConfigured = psk !== "";
    report("KEY_FORMATS_VALID", false);
    status.parametersValid = false;
    var host = typeof p.wgHost === "string" ? p.wgHost.trim() : "";
    if (!host || host.length > 253 ||
        (/^[0-9.]+$/.test(host) ? !ipv4(host) :
            !host.split(".").every(function (label) { return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label); }))) {
        fail("INVALID_ENDPOINT_HOST");
    }
    var port = p.wgPort === undefined ? 51820 : p.wgPort;
    if ((typeof port !== "number" && typeof port !== "string") ||
        !/^\d{1,5}$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535) fail("INVALID_ENDPOINT_PORT");
    var address = typeof p.wgAddress === "string" ? p.wgAddress.trim().replace(/\/32$/, "") : "";
    if (!ipv4(address) || /^(?:0|127|169\.254|192\.168\.1)\./.test(address) || Number(address.split(".")[0]) >= 224) {
        fail("INVALID_PHONE_WG_ADDRESS");
    }
    status.parametersValid = true;
    var peer = '{public-key="' + publicKey + '"' + (psk ? ',preshared-key="' + psk + '"' : "") +
        ',allowed-ips="192.168.1.0/24",endpoint=' + host + ':' + Number(port) + '}';
    var node = '家庭WG = WireGuard,interface-ip=' + address + ',private-key="' + privateKey +
        '",mtu=1280,keepalive=25,peers=[' + peer + '],udp=true,server-dns="223.5.5.5,119.29.29.29"\n';
    function field(pattern) { var match = pattern.exec(node); return match ? match[1] : null; }
    status.outputMatches = {
        protocol: node.indexOf("家庭WG = WireGuard,") === 0,
        privateKey: field(/,private-key="([^"]+)"/) === privateKey,
        routerPublicKey: field(/\{public-key="([^"]+)"/) === publicKey,
        presharedKey: psk ? field(/,preshared-key="([^"]+)"/) === psk : node.indexOf(",preshared-key=") < 0,
        address: field(/,interface-ip=([^,]+)/) === address,
        endpoint: field(/,endpoint=([^}]+)\}/) === host + ":" + Number(port),
        allowedIPs: field(/,allowed-ips="([^"]+)"/) === "192.168.1.0/24"
    };
    status.outputValid = Object.keys(status.outputMatches).every(function (name) { return status.outputMatches[name] === true; });
    report(status.outputValid ? "OUTPUT_READY" : "OUTPUT_MISMATCH", true);
    console.log("HomeWGNode: NODE_READY");
    $done(node);
}());
