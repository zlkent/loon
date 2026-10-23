/* Only switch the inner home policy. Never log config, SSID or saved parameters.
 * Unknown SSID defaults to WG; the outer group supports a persistent manual override.
 */
(function () {
    "use strict";
    var STORE = "zlkent.loon.home-wg.node.v1";
    function stop(code) {
        console.log("HomeWGNetwork: " + code);
        $done();
    }
    var p = {};
    try {
        var saved = $persistentStore.read(STORE);
        p = saved ? JSON.parse(saved) : {};
    } catch (_) { console.log("HomeWGNetwork: LOCAL_PARAMS_UNAVAILABLE"); }
    var homeSSID = p && typeof p === "object" && !Array.isArray(p) &&
        typeof p.homeSSID === "string" && p.homeSSID.trim() ? p.homeSSID : "";
    var ssid = "";
    try {
        var conf = JSON.parse($config.getConfig() || "{}");
        ssid = conf && typeof conf.ssid === "string" ? conf.ssid : "";
    } catch (_) { console.log("HomeWGNetwork: NETWORK_STATE_UNAVAILABLE"); }
    var target = homeSSID && ssid && ssid === homeSSID ? "DIRECT" : "家庭WG";
    try {
        // getSelectedPolicy is optional on older runtimes; setSelectPolicy is enough.
        if (typeof $config.getSelectedPolicy === "function" && $config.getSelectedPolicy("家庭自动") === target) {
            $done(); return;
        }
        var changed = $config.setSelectPolicy("家庭自动", target);
        // Older runtimes may return undefined; only an explicit false is a rejection.
        if (changed === false) { stop("POLICY_SWITCH_REJECTED"); return; }
        stop(target === "DIRECT" ? "HOME_DIRECT_SELECTED" : "WG_SELECTED");
    } catch (_) { stop("NETWORK_STATE_UNAVAILABLE"); }
}());
