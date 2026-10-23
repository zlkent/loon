/* Candidate probe only. Accepts a non-secret test tag, never a WG key.
 * Run manually from the NORMAL control plugin, not as a resource parser.
 */
(function () {
    "use strict";
    var STORE = "zlkent.loon.node-probe.tag.v1";
    var input = typeof $argument === "undefined" ? null : $argument;
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).length !== 1 || typeof input.probeTag !== "string" ||
        !/^phone-test-[1-9][0-9]{0,5}$/.test(input.probeTag)) {
        throw new Error("NodeProbe: INVALID_TEST_TAG");
    }
    var saved = false;
    try {
        saved = typeof $persistentStore !== "undefined" &&
            typeof $persistentStore.write === "function" &&
            $persistentStore.write(input.probeTag, STORE) === true;
    } catch (_) { /* Never expose underlying errors or values. */ }
    if (!saved) throw new Error("NodeProbe: STORE_WRITE_FAILED");
    console.log("NodeProbe: LOCAL_TAG_SAVED");
    $done();
}());
