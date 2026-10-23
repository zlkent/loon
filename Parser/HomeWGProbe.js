/* Diagnostic only: add a comment if the main configuration reaches this hook.
 * No keys, local storage, notifications or network requests are used here.
 */
(function () {
    "use strict";
    if (typeof $resource !== "string" || typeof $resourceType === "undefined") {
        throw new Error("HomeWG Probe: use this as a resource parser, not a manual script.");
    }
    var config = $resourceType === 0 || $resourceType === "0";
    var target = typeof $resourceUrl === "string" &&
        /^https:\/\/raw\.githubusercontent\.com\/zlkent\/loon\/(?:main|refs\/heads\/main)\/Config\/Loon\.lcf(?:\?[^#]*)?$/.test($resourceUrl);
    if (!config || !target) { $done($resource); return; }
    console.log("HomeWG Probe: CONFIG_CALLBACK_REACHED");
    var marker = "# HOMEWG_CONFIG_PARSER_PROBE_OK";
    $done(/^# HOMEWG_CONFIG_PARSER_PROBE_OK(?:\r?\n|$)/.test($resource) ? $resource : marker + "\n" + $resource);
}());
