/* Candidate node parser: fixed public seed -> non-working status node.
 * No credentials, network, config mutation or storage writes.
 */
(function () {
    "use strict";
    var BASE = "https://raw.githubusercontent.com/zlkent/loon/";
    var FILE = "codex/wg-local-parameters/Probe/NodeSeed.txt";
    var STORE = "zlkent.loon.node-probe.tag.v1";
    var TAIL = ' = Shadowsocks,192.0.2.1,9,aes-128-gcm,"nodeprobe-not-a-secret",udp=false';
    var type = typeof $resourceType === "undefined" ? null : $resourceType;
    var url = typeof $resourceUrl === "undefined" ? null : $resourceUrl;
    if ((type !== 1 && type !== "1") ||
        (url !== BASE + FILE && url !== BASE + "refs/heads/" + FILE)) {
        $done($resource);
        return;
    }
    console.log("NodeProbe: NODE_CALLBACK_REACHED");
    var source = typeof $resource === "string" ? $resource.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n") : "";
    // Recognize only the exact fixture (or this parser's own prior output).
    var split = source.indexOf(TAIL);
    var name = split < 0 ? "" : source.slice(0, split);
    if (!/^NodeProbe-(?:SEED|UNSET|phone-test-[1-9][0-9]{0,5})-DO-NOT-USE$/.test(name) ||
        source !== name + TAIL + "\n") {
        throw new Error("NodeProbe: INVALID_SEED");
    }
    var tag;
    try {
        if (typeof $persistentStore === "undefined" || typeof $persistentStore.read !== "function") {
            throw new Error("unavailable");
        }
        tag = $persistentStore.read(STORE);
    } catch (_) { throw new Error("NodeProbe: STORE_READ_FAILED"); }
    if (tag === undefined || tag === null || tag === "") {
        tag = "UNSET";
        console.log("NodeProbe: LOCAL_TAG_MISSING");
    } else {
        if (typeof tag !== "string" || !/^phone-test-[1-9][0-9]{0,5}$/.test(tag)) {
            throw new Error("NodeProbe: INVALID_LOCAL_TAG");
        }
        console.log("NodeProbe: LOCAL_TAG_READ_OK");
    }
    $done("NodeProbe-" + tag + "-DO-NOT-USE" + TAIL + "\n");
}());
