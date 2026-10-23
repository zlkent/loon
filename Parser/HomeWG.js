/* Home WG configuration parser, candidate v1. No HTTP calls or parameter logging.
 * Public inputs: $resourceType, $resourceUrl, $resource.
 * Private inputs: plugin $argument, or a local $persistentStore snapshot.
 * Local storage and the generated configuration contain plaintext secrets.
 */
(function () {
    "use strict";
    var NODE = "家庭WG", GROUP = "家庭内网", LAN = "192.168.1.0/24";
    var STORE = "zlkent.loon.home-wg.v1";
    var PLUGIN = "https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Plugin/HomeWG.lpx";
    var BEGIN = "# BEGIN ZLKENT HOME WG", END = "# END ZLKENT HOME WG";

    function fail(message) { throw new Error("HomeWG: " + message); }
    if (typeof $resource !== "string") fail("资源不是文本，请从完整配置订阅运行解析器。");
    if (typeof $resourceType === "undefined") fail("缺少资源类型，请在配置订阅选择此解析器。");
    if ($resourceType !== 0 && $resourceType !== "0") { $done($resource); return; }
    if (typeof $resourceUrl !== "string" ||
        !/^https:\/\/raw\.githubusercontent\.com\/zlkent\/loon\/(?:main|refs\/heads\/main)\/Config\/Loon\.lcf(?:\?[^#]*)?$/.test($resourceUrl)) {
        fail("仅处理 zlkent/loon main 的 Config/Loon.lcf；请检查配置订阅地址。");
    }
    if (typeof $persistentStore === "undefined" ||
        typeof $persistentStore.read !== "function" || typeof $persistentStore.write !== "function") {
        fail("本地参数存储不可用，停止生成；请保留旧配置。");
    }

    function text(value, name) {
        if (typeof value !== "string") fail(name + "必须填写文本。");
        return value;
    }
    function key(value, name, optional) {
        var result = text(value === undefined && optional ? "" : value, name).trim();
        if (optional && !result) return "";
        if (!/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/.test(result) || /^A{43}=$/.test(result)) {
            fail(name + "格式不正确，应为非零的 32 字节 Base64 密钥。");
        }
        return result;
    }
    function ipNumber(value) {
        if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) return null;
        var octets = value.split(".").map(Number);
        if (octets.some(function (n) { return n > 255; })) return null;
        return octets.reduce(function (n, part) { return n * 256 + part; }, 0);
    }
    function ipString(value) {
        return [24, 16, 8, 0].map(function (shift) { return Math.floor(value / Math.pow(2, shift)) % 256; }).join(".");
    }
    function validate(input) {
        if (!input || typeof input !== "object" || Array.isArray(input)) fail("参数副本格式不正确。");
        var result = {
            wgPrivateKey: key(input.wgPrivateKey, "手机私钥", false),
            wgPublicKey: key(input.wgPublicKey, "ROS 公钥", false),
            wgPresharedKey: key(input.wgPresharedKey, "预共享密钥", true),
            wgHost: text(input.wgHost, "家庭入口主机").trim(),
            wgAddress: input.wgAddress === undefined ? "10.77.77.2" : text(input.wgAddress, "手机 WG 地址").trim(),
            homeSSID: text(input.homeSSID, "家庭 Wi-Fi 名称")
        };
        var host = result.wgHost;
        if (!host || host.length > 253 ||
            (/^[0-9.]+$/.test(host) ? ipNumber(host) === null :
                !host.split(".").every(function (label) { return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label); }))) {
            fail("家庭入口只填写有效 IPv4 或域名，不带协议、路径和端口。");
        }
        var port = input.wgPort === undefined ? 51820 : input.wgPort;
        if ((typeof port !== "number" && typeof port !== "string") || !/^\d{1,5}$/.test(String(port)) ||
            Number(port) < 1 || Number(port) > 65535) fail("WG 端口必须是 1 到 65535 的整数。");
        result.wgPort = Number(port);
        if (ipNumber(result.wgAddress) === null || !/^10\.77\.77\./.test(result.wgAddress) ||
            Number(result.wgAddress.split(".")[3]) < 2 || Number(result.wgAddress.split(".")[3]) > 254) {
            fail("手机 WG 地址应为 10.77.77.2 到 10.77.77.254 的裸 IPv4，并与 ROS Peer 对应。");
        }
        // Avoid interpolating line breaks, quotes or delimiters into the Loon grammar.
        var ssid = result.homeSSID;
        if (!ssid.trim() || /[\x00-\x1f\x7f\x85\u2028\u2029"\\,]/.test(ssid) || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(ssid)) {
            fail("Wi-Fi 名称不能为空，测试版不接受双引号、反斜杠、逗号或控制字符。");
        }
        if (encodeURIComponent(ssid).replace(/%[A-Fa-f\d]{2}/g, "x").length > 32) fail("Wi-Fi 名称超过 32 字节。");
        return result;
    }

    var input = typeof $argument === "object" && $argument !== null ? $argument : {};
    var required = ["wgPrivateKey", "wgPublicKey", "wgHost", "homeSSID"];
    var blank = required.filter(function (name) {
        return input[name] === undefined || input[name] === null || input[name] === "";
    }).length;
    if (blank === required.length) {
        var saved;
        try { saved = $persistentStore.read(STORE); }
        catch (_) { fail("无法读取本地参数副本。"); }
        if (!saved) fail("尚未保存家庭参数，请在解析器插件中填写四个必填项。");
        try { input = JSON.parse(saved); }
        catch (_) { fail("本地参数副本损坏，请在插件中重新填写完整参数。"); }
    } else if (blank) {
        fail("必填项未填完整，停止生成；不会把新旧密钥混合使用。");
    }
    var params = validate(input);

    // Parse and preserve every section, removing ONLY this parser's marked blocks.
    var preamble = [], order = [], sections = Object.create(null), current = null, inside = false;
    $resource.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n").forEach(function (line) {
        var clean = line.trim(), heading = /^\[([^\]]+)\]$/.exec(clean);
        if (heading) {
            if (inside) fail("生成块缺少结束标记。");
            current = heading[1];
            if (Object.prototype.hasOwnProperty.call(sections, current)) fail("配置包含重复 Section。");
            sections[current] = []; order.push(current);
        } else if (clean === BEGIN) {
            if (inside || current === null) fail("生成块标记异常。");
            inside = true;
        } else if (clean === END) {
            if (!inside) fail("生成块标记异常。");
            inside = false;
        } else if (!inside) {
            if (current === null) preamble.push(line);
            else sections[current].push(line);
        }
    });
    if (inside) fail("生成块缺少结束标记。");
    ["General", "Proxy", "Remote Filter", "Proxy Group", "Rule", "Plugin"].forEach(function (name) {
        if (!Object.prototype.hasOwnProperty.call(sections, name)) fail("公共模板缺少必要 Section，请保留旧配置。");
    });
    ["Proxy", "Remote Proxy", "Remote Filter", "Proxy Group"].forEach(function (name) {
        (sections[name] || []).forEach(function (line) {
            if (/^\s*(?:家庭WG|家庭内网)\s*=/.test(line)) fail("存在同名手写家庭节点或策略，请先移除旧的手工配置。");
        });
    });
    function setting(name) {
        var indices = [];
        sections.General.forEach(function (line, index) {
            if (line.trim().split("=")[0].trim() === name) indices.push(index);
        });
        if (indices.length > 1) fail("General 存在重复参数。");
        return indices.length ? indices[0] : -1;
    }
    function list(name) {
        var index = setting(name);
        if (index < 0) return [];
        return sections.General[index].slice(sections.General[index].indexOf("=") + 1).split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    function setList(name, values) {
        var index = setting(name), line = name + " = " + values.join(",");
        if (index < 0) sections.General.push(line);
        else sections.General[index] = line;
    }
    function cidr(value) {
        var parts = value.split("/"), ip = ipNumber(parts[0]), prefix = parts.length === 1 ? 32 : Number(parts[1]);
        if (ip === null || parts.length > 2 || (parts.length === 2 && !/^\d{1,2}$/.test(parts[1])) || prefix < 0 || prefix > 32) return null;
        var size = Math.pow(2, 32 - prefix), first = Math.floor(ip / size) * size;
        return { first: first, last: first + size - 1, prefix: prefix };
    }
    var home = cidr(LAN);
    list("bypass-tun").forEach(function (value) {
        var network = cidr(value);
        if (network && network.prefix > 24 && network.first >= home.first && network.first <= home.last) {
            fail("bypass-tun 存在家庭网段内更具体的绕过路由，请先处理冲突。");
        }
    });
    var included = list("include-tun");
    if (included.indexOf(LAN) < 0) included.push(LAN);
    setList("include-tun", included);
    function subtract(network) {
        if (network.last < home.first || network.first > home.last) return [ipString(network.first) + "/" + network.prefix];
        if (network.first >= home.first && network.last <= home.last) return [];
        var half = Math.pow(2, 31 - network.prefix);
        return subtract({ first: network.first, last: network.first + half - 1, prefix: network.prefix + 1 })
            .concat(subtract({ first: network.first + half, last: network.last, prefix: network.prefix + 1 }));
    }
    var skipped = [];
    list("skip-proxy").forEach(function (value) {
        var network = cidr(value);
        if (network && network.first <= home.last && network.last >= home.first) {
            skipped = skipped.concat(subtract(network));
        } else {
            if (!network && (value === "*" || /^[\d.*?]+(?:\/.*)?$/.test(value))) fail("skip-proxy 存在无法安全扣除家庭网段的 IP 表达式。");
            skipped.push(value);
        }
    });
    if (setting("skip-proxy") >= 0) setList("skip-proxy", skipped);

    var filterCount = 0;
    sections["Remote Filter"] = sections["Remote Filter"].map(function (line) {
        if (!/^\s*全部节点\s*=/.test(line)) return line;
        filterCount++;
        if (!/^\s*全部节点\s*=\s*NameRegex,\s*FilterKey="(?:\.\*|\^\(\?!家庭WG\$\)\.\*)"\s*$/.test(line)) {
            fail("全部节点筛选格式已变化，停止生成，避免家庭 WG 混入互联网节点池。");
        }
        return '全部节点 = NameRegex, FilterKey="^(?!家庭WG$).*"';
    });
    if (filterCount !== 1) fail("全部节点筛选缺失或重复。");
    var rules = sections.Rule.filter(function (line) { return line.trim() && !/^\s*#/.test(line); });
    if (rules.filter(function (line) { return /^\s*FINAL,/.test(line); }).length !== 1 || !/^\s*FINAL,/.test(rules[rules.length - 1])) {
        fail("模板 FINAL 规则缺失、重复或不在末尾。");
    }
    function prepend(name, lines) { sections[name] = [BEGIN].concat(lines, [END], sections[name]); }
    var peer = '{public-key="' + params.wgPublicKey + '"' +
        (params.wgPresharedKey ? ',preshared-key="' + params.wgPresharedKey + '"' : "") +
        ',allowed-ips="' + LAN + '",endpoint=' + params.wgHost + ':' + params.wgPort + '}';
    prepend("Proxy", [NODE + ' = WireGuard,interface-ip=' + params.wgAddress + ',private-key="' + params.wgPrivateKey +
        '",mtu=1280,keepalive=25,peers=[' + peer + '],udp=true,server-dns="223.5.5.5,119.29.29.29"']);
    prepend("Proxy Group", [GROUP + ' = ssid,default=' + NODE + ',cellular=' + NODE + ',"' + params.homeSSID + '"=DIRECT']);
    prepend("Rule", ['IP-CIDR,' + LAN + ',' + GROUP + ',no-resolve']);
    // Keep the parser plugin listed after a full-config update. Its UI association
    // and local argument retention must still be verified in the actual App.
    if (!sections.Plugin.some(function (line) { return line.trim().split(",")[0] === PLUGIN; })) {
        prepend("Plugin", [PLUGIN + ",enabled=true"]);
    }
    var output = preamble.join("\n");
    order.forEach(function (name) { output += "\n[" + name + "]\n" + sections[name].join("\n"); });
    output = output.replace(/^\n/, "").replace(/\n*$/, "\n");
    var stored = false;
    try { stored = $persistentStore.write(JSON.stringify(params), STORE); }
    catch (_) { fail("无法保存本地参数副本，停止生成；请保留旧配置。"); }
    if (stored !== true) fail("无法保存本地参数副本，停止生成；请保留旧配置。");
    $done(output);
}());
