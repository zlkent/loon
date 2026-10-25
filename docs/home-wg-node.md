# 家庭 WG 节点版：直接安装使用

这是可配置使用的 **candidate**，不是已经在你 ROS 上握手成功的正式结论。此前两轮 phone-test 标记已验证本地存储到节点解析器的跨更新链路，本轮不再要求探针或改数字。旧完整配置解析器不用，NodeProbe 的两个插件也不是本版依赖。

## 1. 手机本地保存一次参数

打开 Loon 的 **数据持久化 → 导入指定数据**（此前已操作过的页面）。

**键：**

```text
zlkent.loon.home-wg.node.v1
```

**值：整个 JSON 文本**，按下例在手机本地替换占位内容，不把 JSON 再包一层引号。不要把填好密钥的 JSON 发到聊天或 GitHub。

```json
{
  "wgPrivateKey": "替换为手机WG私钥",
  "wgPublicKey": "替换为ROS的WG接口公钥",
  "wgPresharedKey": "",
  "wgHost": "替换为家庭公网IPv4或DDNS域名",
  "wgPort": 51820,
  "wgAddress": "10.77.77.2",
  "homeSSID": "替换为家里Wi-Fi的准确名称"
}
```

- `wgPrivateKey`：手机 Peer 所对应的私钥，不是 ROS 私钥。ROS 中该手机 Peer 保存的是这把私钥推导出的**公钥**。
- `wgPublicKey`：ROS WireGuard **接口**公钥，不是手机 Peer 公钥。
- `wgPresharedKey`：ROS 手机 Peer 配置了 PSK 才填；否则保留空字符串。可省略此字段。
- `wgHost`：裸 IPv4 或 DDNS 域名，不带 `http://`、路径或 `:51820`。
- `wgPort`：51820，可省略，默认就是 51820。
- `wgAddress`：必须与你已添加的 ROS 手机 Peer 的 `allowed-address` 对应。示例 10.77.77.2 **不是替你确认的现有地址**；如现有 Peer 是其他 WG 地址，填实际地址。可以填裸 IPv4 或 `/32`。
- `homeSSID`：大小写、空格、标点必须完全一致；2.4G/5G 同名只填一次。JSON 内的单引号不必转义。

机器可复制模板：[home-wg.local.example.json](https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/docs/examples/home-wg.local.example.json)。它只含占位符，不能直接连接。若需保存本地文件，请使用 `*.local.json` 名称，仓库已忽略此类私密文件；不要编辑提交 example 文件。

## 2. 安装节点解析器，再导入完整配置

1. **先导出备份现有日用配置、私人节点订阅和 MITM 证书。新配置作为另一份配置添加，不覆盖原配置。** 这不是重复实验，而是首次迁移；公共文件不包含你的私人订阅和证书，不能从旧配置自动恢复它们。
2. 在 iPhone Safari 打开：[安装家庭WG节点解析器](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fzlkent%2Floon%2Fcodex%2Fwg-local-parameters%2FPlugin%2FHomeWGNodeParser.lpx)。确认导入并启用，只需安装一次，不再找 Generic 手动运行项。
3. 从下列 URL 导入为新的托管**完整配置**：

   ```text
   https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Config/Loon-HomeWG.lcf
   ```

   也可尝试官方入口：[导入家庭WG完整配置](https://www.nsloon.com/openloon/import?config=https%3A%2F%2Fraw.githubusercontent.com%2Fzlkent%2Floon%2Fcodex%2Fwg-local-parameters%2FConfig%2FLoon-HomeWG.lcf)。如果入口未直接进入配置页，使用上面的 URL 和已有“从链接导入”即可。
4. 在手机将自己的机场订阅添加到这份新配置一次，选择合适代理策略；MITM 证书如需使用，从原备份保留/恢复。然后更新 **家庭WG订阅**，将“家庭内网”保持在 **家庭自动**。新配置会列出解析器及普通自动切换插件，不必安装旧 HomeWG 或 NodeProbe。

本版仍保留国内/Apple/微信直连、Google/AI 美国节点、其他业务自动优选、广告拦截和未知流量代理兜底；DNS 与现行正式配置相同。

## 3. 直接访问，不再做标记实验

- **在外面**：访问 `192.168.1.x`（例如家里旁路由的管理地址）走 `家庭内网 → 家庭自动 → 家庭WG`。
- **回家连同名 Wi-Fi**：脚本识别到准确 SSID 后，家庭自动切成 `DIRECT`，不绕公网 WG。只改变家庭策略，不把所有流量改成直连。
- 网络变化触发一次，每分钟本地校正一次。初启或漏掉网络事件时，可能等待到下一分钟；不承诺无缝切换已建立连接。
- 系统不给 SSID、权限未开或 API 没返回名称时，默认 WG，**不会把陌生 Wi-Fi 自动视为家里**。若回家仍走 WG，先在“家庭内网”外层手选 `DIRECT`；出门后切回“家庭自动”。外层手选不会被脚本抢回。可在 Loon 请求时允许其所需网络/定位权限，不必为排查额外上传整份日志。
- 外地 Wi-Fi 如果也用 `192.168.1.0/24`，本版优先访问家里的同网段；如要临时访问当地路由器，外层手选 `DIRECT`。这不是两个同网段同时可达的方案。
- WG Peer 的 `allowed-ips` 仅包含 `192.168.1.0/24`，不把互联网流量送回家，也不配置默认路由。`10.x` WG 接口管理地址不在本版家庭规则内。
- 这是 TCP/UDP 代理链路，不保证 ping、mDNS、广播发现或所有局域网协议。直接用设备 IP 访问，不依赖 `.local` 广播发现。
- **不要用通用延迟测试判定家庭 WG 好坏。** 本版 Peer 只允许家庭 `/24`，General 的测速目标是公网 `www.gstatic.com`，不属于允许的目的网段，因此即使家庭内网可用，该测试仍可能超时。不要为消掉 Timeout 把 allowed-ips 扩成默认路由。

如果不能访问，反馈固定错误码或失败连接的目标、命中策略和错误即可。**不要再补写假标记，也不要发真实密钥。** ROS 的 UDP 入站、防火墙 forward、Peer 地址、LAN 回程及旁路由策略仍需原有服务配置正确，本仓库不会远程修改 ROS。

## 解析器脱敏诊断（2026-10-25，revision 20261025.1）

本节只增强现有真实 WG 节点的可观测性，不改变节点格式、密钥、本地参数键、DNS、策略或 ROS。当前用户实机已验证官方 WG 客户端可访问家庭页面，但 Loon 仍未完成握手；增加诊断不等于修复连接。

1. **只更新已有的“家庭WG节点解析器”插件**，再手动更新 **“家庭WG订阅”节点订阅**。本轮不要更新/全覆盖完整配置，不用重填参数、重装自动切换插件或新增测试节点。
2. 解析结束会尝试发送一条 **“家庭WG解析诊断”** 通知，包含 revision `20261025.1`、阶段、读取/JSON/格式/输出一致性结果。通知受 Loon 运行环境及系统通知权限影响，没有通知不能断言解析器未执行。
3. 诊断还写到独立本地键 `zlkent.loon.home-wg.status.v1`，并以 `HomeWGNode: DIAGNOSTIC` 开头记录脚本日志。只查看/分享这个诊断键，不导出全部持久化数据。若现有页面没有单键读取入口，不继续找隐藏菜单；反馈订阅更新提示及能看到的日志即可。隧道访问日志未必包含主 App 更新订阅时的解析器日志。

成功生成时，最新状态应有当前时间、`revision="20261025.1"`、`stage="OUTPUT_READY"`、`storeRead/storeFound/jsonValid/keyFormatsValid/parametersValid/outputValid=true`，以及 `outputMatches` 内各项为 `true`。该对象只含固定代码、布尔值和时间戳，不含密钥、PSK、家庭入口、SSID 或它们的指纹；可以分享这份诊断状态或通知。PSK 未设置时 `pskConfigured=false` 正常。

- `SETUP_REQUIRED`：本轮读取成功但没找到参数；不自动重写原参数。
- `ERROR`：看固定 `errorCode`，例如 `INVALID_LOCAL_JSON` / `INVALID_PHONE_PRIVATE_KEY`；不发送原 JSON 或原密钥。
- `RESOURCE_NOT_MATCHED`：目标 URL 匹配但资源类型不符合；未读取/生成节点。其他资源仍原样透传，不覆盖家庭诊断状态。
- `OUTPUT_MISMATCH`：输出文本的字段与已校验的输入不一致，需分析解析器，不据此修改 ROS。
- revision 或时间未更新：只能说明尚无本轮执行证据，不能把旧 `OUTPUT_READY` 当作当前更新成功。

**限制：** `keyFormatsValid` 仅校验格式，不证明手机私钥与 ROS Peer 公钥配对。`outputMatches` 只比较准备交给 Loon 的节点文本与本次归一化输入，不会读取 Loon 原生引擎已载入的密钥，也不与官方 WG 客户端比较。`engineReadback="UNAVAILABLE"` 明确保留此缺口；`OUTPUT_READY` 不等于引擎加载、握手或内网访问成功。诊断通道失败不应改变原来的节点输出/占位/错误行为。

## 更新与私密边界

以后 WG 参数未变就不再填写：完整配置更新后，节点解析器从同一本地 key 重新生成家庭节点；修改参数时只需更新该 key，再更新家庭WG订阅。已有两轮标记链路证据，但本版实际 WG、SSID 自动切换和长期运行仍以你的使用结果为准。

**此机制只解决 WG 参数本地复用，不解决所有私人字段的整份配置覆盖问题。** 不要开启全覆盖后假定机场订阅、证书、手动策略和其他插件都能保留。已有配置更新方式曾删除私人订阅/证书；应保留备份，并用非全覆盖的托管更新方式使用，具体合并效果仍取决于 Loon。若某次更新删除私人订阅或证书，从备份恢复；这不代表 WG 本地 key 一定丢失。不要为了测试去删除数据。

`$persistentStore` 是普通脚本存储，不是 Keychain。其他脚本、Loon 的数据导出、生成的节点及配置备份可能包含明文私钥；本版不向网络上传、不通知或打印参数原值，诊断通知只含状态，不代表整个客户端和其他插件都无法读取。只安装可信插件，不公开导出数据。原生安全变量需求仍有必要。

初次未导入参数时，`家庭WG` 是地址 `192.0.2.1:9` 的故意不可用 SS 占位节点，日志为 `HomeWGNode: SETUP_REQUIRED`。保存参数后更新家庭WG订阅，应生成 WireGuard 类型，固定状态为 `HomeWGNode: NODE_READY`；READY 只表示生成完成，不是握手成功。不要将占位节点或只允许家庭网段的 WG 加入互联网测速组。

退回：直接切回原日用配置即可；不用删除任何全局数据。自动切换脚本只影响存在的“家庭自动”组，不改变全局运行模式。若以后彻底删除本版，只移除本版订阅和两个插件；按需删除本版单个 key，不用“删除数据”清空所有脚本存储。

## 维护和交付边界

- 正式 `main/Config/Loon.lcf` 未改。候选由 `tools/generate_home_wg.py` 从基础配置派生；基础分流更新后重新生成即可，不把私人文件输入生成器。
- 家庭 `/24` 使用 `include-tun`，从 `skip-proxy` 扣除家庭段，并在本地 Rule 优先于远程 LAN/ChinaMax。全局互联网筛选排除 `家庭WG`。
- 家庭组使用 `家庭WG节点 = NameRegex, FilterKey="^家庭WG$"` 获取订阅节点，不再把订阅内名字当作静态组引用。当前设备曾出现“订阅有 WireGuard，但两层家庭策略只有 DIRECT”的状态；此改动只修复动态引用，节点参数、SSID 脚本、DNS 和 ROS 均不改。已用本版的设备先备份，更新原家庭 WG 完整配置（不开全覆盖）并更新家庭WG订阅；在外面可先从家庭内网选家庭WG直接访问实际内网设备，再恢复家庭自动。
- 语法、生成、私密信息和 Raw 发布核对属于工程检查，不替代手机/ROS 运行证据。按用户要求，本轮不新增自动化测试、不跑全套测试、不安排新的分轮探针。
- 官方接口：[WG 节点](https://nsloon.app/docs/Node/#wireguard)、[节点解析器](https://nsloon.app/docs/Node/subscription/)、[include-tun / skip-proxy](https://nsloon.app/docs/General/)、[网络脚本](https://nsloon.app/docs/Script/script_v2/)、[配置和存储 API](https://nsloon.app/docs/Script/script_api/)、[官方网络变化示例](https://raw.githubusercontent.com/Loon0x00/LoonExampleConfig/master/Script/netChanged.js)。
