/* Standalone Generic diagnostic. No HTTP, config/policy changes, secret-store
 * writes or raw values. Output is whitelisted fixed codes/booleans/timestamps.
 * This cannot read parser callback data or secrets loaded by the native engine.
 */
(function () {
    "use strict";
    var STORE = "zlkent.loon.home-wg.node.v1";
    var STATUS = "zlkent.loon.home-wg.status.v1";
    var REPORT = "zlkent.loon.home-wg.check.v1";
    var result = {
        revision: "20261025.2", checkedAt: new Date().toISOString(),
        local: { read: false, found: null, jsonValid: null, privateKeyFormat: null,
            routerPublicKeyFormat: null, presharedKeyFormat: null, pskConfigured: null,
            hostFormat: null, portFormat: null, addressFormat: null, ssidConfigured: null },
        parserStatus: { read: false, found: null, jsonValid: null, summary: null },
        engineReadback: "UNAVAILABLE"
    };
    function read(key, target) {
        try {
            var value = $persistentStore.read(key);
            target.read = true;
            target.found = value !== null && value !== undefined && value !== "";
            if (!target.found) return null;
            var parsed;
            try { parsed = JSON.parse(value); } catch (_) { target.jsonValid = false; return null; }
            target.jsonValid = !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
            return target.jsonValid ? parsed : null;
        } catch (_) { return null; }
    }
    function keyValid(value, optional) {
        if (optional && (value === undefined || value === "")) return true;
        return typeof value === "string" && /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(value.trim()) && !/^A{43}=$/.test(value.trim());
    }
    function ipv4(value) {
        return typeof value === "string" && /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
            value.split(".").every(function (n) { return Number(n) <= 255; });
    }
    function oneOf(value, values) { return values.indexOf(value) >= 0 ? value : null; }
    function bool(value) { return typeof value === "boolean" ? value : null; }
    function copyBooleans(from, names) {
        var out = {};
        names.forEach(function (name) { out[name] = bool(from[name]); });
        return out;
    }
    var p = read(STORE, result.local);
    if (p) {
        var host = typeof p.wgHost === "string" ? p.wgHost.trim() : "";
        var port = p.wgPort === undefined ? 51820 : p.wgPort;
        var address = typeof p.wgAddress === "string" ? p.wgAddress.trim().replace(/\/32$/, "") : "";
        result.local.privateKeyFormat = keyValid(p.wgPrivateKey, false);
        result.local.routerPublicKeyFormat = keyValid(p.wgPublicKey, false);
        result.local.presharedKeyFormat = keyValid(p.wgPresharedKey, true);
        result.local.pskConfigured = typeof p.wgPresharedKey === "string" && p.wgPresharedKey.trim() !== "";
        result.local.hostFormat = host !== "" && host.length <= 253 && (/^[0-9.]+$/.test(host) ? ipv4(host) :
            host.split(".").every(function (label) { return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label); }));
        result.local.portFormat = (typeof port === "number" || typeof port === "string") &&
            /^\d{1,5}$/.test(String(port)) && Number(port) >= 1 && Number(port) <= 65535;
        result.local.addressFormat = ipv4(address) && !/^(?:0|127|169\.254|192\.168\.1)\./.test(address) && Number(address.split(".")[0]) < 224;
        result.local.ssidConfigured = typeof p.homeSSID === "string" && p.homeSSID !== "";
    }
    var previous = read(STATUS, result.parserStatus);
    if (previous) {
        // Never forward the original status JSON: it is local, untrusted input.
        var summary = copyBooleans(previous, ["resourceTypeMatches", "resourceUrlMatches", "seedValid", "storeRead", "storeFound", "jsonValid", "keyFormatsValid", "pskConfigured", "parametersValid", "outputValid"]);
        summary.revision = oneOf(previous.revision, ["20261025.1", "20261025.2"]);
        summary.checkedAt = typeof previous.checkedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(previous.checkedAt) ? previous.checkedAt : null;
        summary.stage = oneOf(previous.stage, ["START", "ERROR", "RESOURCE_NOT_MATCHED", "STORE_READ", "SETUP_REQUIRED", "JSON_VALID", "KEY_FORMATS_VALID", "OUTPUT_READY", "OUTPUT_MISMATCH"]);
        summary.errorCode = oneOf(previous.errorCode, ["INVALID_SEED", "STORE_READ_FAILED", "INVALID_LOCAL_JSON", "INVALID_PHONE_PRIVATE_KEY", "INVALID_ROUTER_PUBLIC_KEY", "INVALID_PRESHARED_KEY", "INVALID_ENDPOINT_HOST", "INVALID_ENDPOINT_PORT", "INVALID_PHONE_WG_ADDRESS"]);
        if (previous.sourceFacts && typeof previous.sourceFacts === "object" && !Array.isArray(previous.sourceFacts)) {
            summary.sourceFacts = copyBooleans(previous.sourceFacts, ["trimmedSeedMatches", "hasBOM", "hasCR", "endsWithLF", "empty", "looksLikeWGLine", "looksLikeHTML", "looksLikeBase64", "looksLikeURI", "looksSectioned"]);
            summary.sourceFacts.kind = oneOf(previous.sourceFacts.kind, ["string", "null", "array", "object", "undefined", "boolean", "number", "function", "symbol", "bigint"]);
        }
        if (previous.outputMatches && typeof previous.outputMatches === "object" && !Array.isArray(previous.outputMatches)) {
            summary.outputMatches = copyBooleans(previous.outputMatches, ["protocol", "privateKey", "routerPublicKey", "presharedKey", "address", "endpoint", "allowedIPs"]);
        }
        result.parserStatus.summary = summary;
    }
    var safe = JSON.stringify(result);
    try { console.log("HomeWGCheck: " + safe); } catch (_) { /* Optional. */ }
    try {
        if ($persistentStore.write(safe, REPORT) !== true) {
            try { console.log("HomeWGCheck: REPORT_WRITE_FAILED"); } catch (_) { /* Optional. */ }
        }
    } catch (_) { /* Logs remain available when status writing is unavailable. */ }
    try {
        $notification.post("家庭WG独立检查", "20261025.2 / 仅本地诊断",
            "参数存在：" + (result.local.found === null ? "未检查" : result.local.found ? "是" : "否") +
            "；查看脚本日志，或读取 zlkent.loon.home-wg.check.v1。不代表握手成功。");
    } catch (_) { /* Notifications are not the only output channel. */ }
    $done();
}());
