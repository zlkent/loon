/* Read-only node parser. Secrets stay in local storage and the generated node.
 * No HTTP, argument logging, notifications, storage writes or full-config parser.
 */
(function () {
    "use strict";
    var BASE = "https://raw.githubusercontent.com/zlkent/loon/";
    var FILE = "codex/wg-local-parameters/Probe/HomeWGSeed.txt";
    var STORE = "zlkent.loon.home-wg.node.v1";
    var SEED = '家庭WG = Shadowsocks,192.0.2.1,9,aes-128-gcm,"homewg-not-configured",udp=false\n';
    var type = typeof $resourceType === "undefined" ? null : $resourceType;
    var url = typeof $resourceUrl === "undefined" ? null : $resourceUrl;
    if ((type !== 1 && type !== "1") ||
        (url !== BASE + FILE && url !== BASE + "refs/heads/" + FILE)) {
        $done($resource);
        return;
    }
    function fail(code) { throw new Error("HomeWGNode: " + code); }
    var source = typeof $resource === "string" ? $resource.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n") : "";
    if (source !== SEED) fail("INVALID_SEED");
    var saved;
    try {
        saved = $persistentStore.read(STORE);
    } catch (_) { fail("STORE_READ_FAILED"); }
    if (saved === null || saved === undefined || saved === "") {
        console.log("HomeWGNode: SETUP_REQUIRED");
        // Stable name keeps the config loadable before one-time local setup.
        // This documented placeholder is deliberately unusable, never a fallback.
        $done(SEED);
        return;
    }
    var p;
    try { p = JSON.parse(saved); } catch (_) { fail("INVALID_LOCAL_JSON"); }
    if (!p || typeof p !== "object" || Array.isArray(p)) fail("INVALID_LOCAL_JSON");
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
    var privateKey = key(p.wgPrivateKey, "INVALID_PHONE_PRIVATE_KEY", false);
    var publicKey = key(p.wgPublicKey, "INVALID_ROUTER_PUBLIC_KEY", false);
    var psk = key(p.wgPresharedKey, "INVALID_PRESHARED_KEY", true);
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
    var peer = '{public-key="' + publicKey + '"' + (psk ? ',preshared-key="' + psk + '"' : "") +
        ',allowed-ips="192.168.1.0/24",endpoint=' + host + ':' + Number(port) + '}';
    var node = '家庭WG = WireGuard,interface-ip=' + address + ',private-key="' + privateKey +
        '",mtu=1280,keepalive=25,peers=[' + peer + '],udp=true,server-dns="223.5.5.5,119.29.29.29"\n';
    console.log("HomeWGNode: NODE_READY");
    $done(node);
}());
