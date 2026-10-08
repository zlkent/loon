# 我的 Loon 统一配置

一次导入完整配置，集中管理所选规则。流量分流规则正文由 Loon 从上游下载、更新；国内 DNS 域名例外由本仓库固定版本生成并内置，不需要另订阅。

**配置订阅地址：**

```text
https://raw.githubusercontent.com/zlkent/loon/main/Config/Loon.lcf
```

## 使用

1. 在 Loon 备份当前配置，将上述地址添加为远程配置/配置订阅（不是节点订阅或单个规则集）。
2. 在手机端添加私人节点订阅，设置节点独立解析 DNS 并更新节点（见下面 DNS 设置）。公共配置不包含节点，未添加节点时无法使用代理或默认境外 DoH。
3. 在“节点选择”选“故障转移”（首次导入的默认选项）、“自动优选”或手动节点。八个服务策略组默认跟随它，也可以分别指定节点；AI 服务需选择服务可用的出口。
4. 使用规则分流模式，更新远程规则，确认全部下载成功。
5. 按下面要求关闭加密 DNS 的普通 DNS 回落，再检查请求日志，核实 DNS、直连、代理、广告拦截是否符合预期。

重新导入或更新完整配置前，请备份私人节点订阅及本机修改，并在更新后检查设置。不要向公共仓库提交节点订阅令牌或 MITM 证书。

## 默认策略

| 类别 | 默认策略 |
| --- | --- |
| 广告 | REJECT；可在“广告拦截”切换 DIRECT 排查误拦截 |
| Apple、微信、高德、国内服务、局域网 | DIRECT |
| Google、Telegram、Twitter / X、GitHub、YouTube | 各自策略组，默认跟随“节点选择” |
| OpenAI、Claude、Gemini | 各自策略组，默认跟随“节点选择” |
| 未匹配流量（含未收录国外网站、视频外链） | FINAL 直接指向“节点选择”，走代理 |

广告规则优先，Apple、微信中的广告域名也可能被拦截。采用域名/IP 规则去广告，无需解密证书，不保证移除 YouTube 视频内广告或所有 App 开屏广告。

Gemini、YouTube 位于 Google 前，ChinaMax 位于最后。Loon 优先匹配域名，未命中再进行 DNS/IP 匹配；列表顺序不代表 IP 规则可以覆盖域名规则。

### 自动切换节点

“节点选择”提供三种选择：

- **故障转移（默认）**：每 60 秒测试全部节点，使用列表中第一个可用节点；测试超过 3000 毫秒视为不可用，检测到失效后选择其他可用节点。优先级由节点列表顺序决定，不代表节点延迟最低。
- **自动优选**：每 60 秒测试全部节点，选择延迟最低的节点；设置 50 毫秒容差，减少延迟小幅波动时的切换。
- **手动节点**：保留固定出口的能力，手动指定节点不使用上述自动组。

两个自动组沿用 General 中的 `proxy-test-url = http://www.gstatic.com/generate_204`。测试地址能通，不代表所有目标网站、视频或 AI 服务均可用，也不代表吞吐速度最快。切换存在检测间隔，已有连接不保证无缝恢复；全部节点不可用时仍无法代理，不配置直连回落。

更新旧配置后，Loon 可能保留之前的策略选择，请主动把“节点选择”切到“故障转移”，并检查需要自动切换的服务组仍选“节点选择”。服务组若固定某个节点，将绕过自动组。AI 服务不建议在不同国家/地区的全部节点之间无约束切换，可在手机端固定可用出口；本次没有增加地区筛选。

自动组会周期测速，节点越多，额外流量和耗电越大。可调整 interval，但检测失效的等待也会随之增加。真实失效切换仍需在设备上验证，本仓库静态测试不模拟 Loon 运行时。

### Twitter 视频与外链

Twitter 使用独立策略组；第三方外链即使不在 Twitter 分类中，只要没有命中其他规则，仍会通过 FINAL 走“节点选择”，不需要仅为未收录域名切换全局。若单独为 Twitter 选择节点，未收录外链仍跟随“节点选择”，不会自动继承 Twitter 节点。

若视频仍失败，请查看失败请求的域名、命中规则和实际策略：REJECT 可能是广告误拦截；DIRECT 可能是直连分类误命中；已走代理则需排查节点、出口地区或网站自身问题。确认误分类后才添加精准例外，避免放行整类广告或把国内服务全部代理。当前未做 Twitter 视频实机播放验证。

### 高德分类不是去广告

GaoDe 用来识别高德业务域名并直连，不应整体设为 REJECT，否则可能影响地图和导航。其原始数据源列出 amap.com、autonavi.com、gaode.com 等域名，见 [GaoDe 上游规则](https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/GaoDe/GaoDe.list)。通用 Advertising 承担广告拦截；未安装高德专用改写或脚本插件，不承诺去除高德全部广告。

### 国内外 DNS 分流（必须完成手机设置）

| 查询类别 | 解析方式 |
| --- | --- |
| 内置国内清单及 Apple、微信、高德、抖音、网易域名 | `[Host]` 指定 `223.5.5.5`（阿里 DNS，普通 DNS） |
| 不在清单的域名（包括未收录的国外视频外链） | 默认 `https://1.1.1.1/dns-query`（Cloudflare DoH） |
| Cloudflare DoH 连接 | `IP-CIDR,1.1.1.1/32,节点选择,no-resolve`，通过代理，不设 DIRECT 备选 |
| 私人代理节点的服务器域名 | **单独**使用 `223.5.5.5,119.29.29.29` 作 bootstrap，不能依赖尚未连通的代理 DoH |

**手机需要做两项设置：**

1. 使用 **Loon 3.5.2 (996) 或更新版本**，为每个私人节点订阅配置 `server-dns`。在本机配置的 `[Remote Proxy]` 中保留真实订阅，增加参数，示例如下（地址只是占位符，不要直接使用）：

   ```ini
   我的订阅 = https://example.com/your-subscription,enabled=true,server-dns="223.5.5.5,119.29.29.29"
   ```

   手工添加的单个节点也需单独设置其节点 DNS。订阅自带 `[Host]` 或主配置已有匹配节点域名的 Host 优先于 `server-dns`，更新后要检查实际解析；指定的节点 DNS 查询失败不会继续回落其他层。不要给 `[Host]` 添加全局 `*` 指向代理 DoH，这会覆盖节点 DNS 并造成启动循环。

2. 到 Loon 的 **DNS 服务器设置页**，关闭“加密 DNS 失败后回落普通 DNS”选项（界面文字可能随版本变化）。当前官方文档仅说明手机端开关，未提供已核实的配置文件参数，**订阅更新无法替你关闭它**。未关闭时，境外 DoH 失败可能回落 `dns-server` 中的国内 DNS，不能保证严格分流。`dns-server` 不包含 `system`，也不代表已关闭回落。

普通 DNS 列表保留阿里 / 腾讯，但 Host 国内例外明确使用阿里，不承诺该例外失败会自动换到腾讯。某网络不通阿里 DNS 时，可调整生成器的国内解析器并重新生成，不应临时开普通 DNS 回落来掩盖问题。DoH 当前仅配置一个服务商：代理或 Cloudflare 不可用时，未命中国内清单的解析可能失败；自动节点故障转移不等于 DNS 服务商故障转移。

**覆盖边界：** 国内清单使用轻量 China 加 Apple / WeChat / GaoDe / DouYin / NetEase，共 5323 个后缀及 26 个精确域名，转换为 10672 条 Host。它不是 ChinaMax 全量域名，也不是按域名国家自动识别。未收录的国内域名仍会默认使用境外 DoH；流量是否直连仍由原有 ChinaMax 等规则决定，两者覆盖可能不同。不使用 `.cn` / `.ms` 这类整体顶级域例外，也不把关键词、IP、USER-AGENT 规则误转成 Host。精确域名不扩展到子域，后缀分别生成根域及 `*.`。

DNS 分流只作用于 Loon 实际处理的查询，不改变代理服务器自己的上游 DNS，也不能保证覆盖 App 自带 HTTPDNS / DoH、缓存或直接访问 IP。广告、业务直连、FINAL 代理和自动组保持不变，未追加脚本、改写或 MITM。

**设备验收：** 备份并更新配置、完成上面两步，清理 DNS 缓存或停止后重新启动 Loon。分别打开 LOOK / 抖音和 Google / Twitter 外链，查看 DNS 记录与请求日志：`look.163.com`、`v95-zj-coldb.douyinvod.com` 应命中国内解析例外；`google.com` 和未知外链应使用默认 DoH，`1.1.1.1:443` 应显示代理策略。再确认 LOOK / 抖音业务流量仍 DIRECT。未见对应记录时，不要仅凭连接列表刷新就判定 DNS 链路正确。

旧日志来自其他配置；上述例外覆盖其抖音超时域名，但尚未证明能解决加载慢，LOOK 根因也未确定。更新后如仍慢，请提供新配置下同一次请求的 DNS 超时、规则、实际节点与连接耗时记录。

## 维护与来源

编辑 [Config/Loon.lcf](Config/Loon.lcf) 的 `[Remote Rule]` 即可调整选择。删除整行或设置 `enabled=false` 可停用分类。新增规则可从 [上游目录快照](docs/rule-catalog.json) 找到地址，策略使用 DIRECT、节点选择或已定义的服务组。目录中的 668 类并未全部启用。

提交到 main 后订阅地址不变；上游流量规则内容更新不需要重新生成本配置。DNS Host 是固定快照，不随远程规则自动变化。

DNS 维护：`python tools/generate_dns.py` 离线从 [域名快照](docs/dns-domains.json) 重建 Host；`python tools/generate_dns.py --check` 检查一致性。`python tools/generate_dns.py --refresh --check` 重新下载固定提交并校验 SHA256，验证同版本可重现，不是追踪最新上游。升级来源需显式更新提交、URL、哈希和快照，并重跑测试。来源、GPL-2.0 许可与转换说明见 [DNS NOTICE](docs/dns/NOTICE.md)。

修改后运行 `python -m unittest discover -s tests -v`，核查自动组参数、引用无环、原有分流策略与隐私边界。

- [ShuntRules](https://github.com/luestr/ShuntRules)：全部规则的来源目录，上游注明其数据来自 ios_rule_script。
- [LoonLab 参考配置](https://raw.githubusercontent.com/sooyaaabo/LoonLab/main/Config/Loon_RawConfig.lcf)：参考配置、策略和远程规则的组织方式。
- [iKeLee 中文配置](https://github.com/luestr/ProxyResource/tree/main/Tool/Loon/Lcf/zh-CN)：参考节点筛选和分流组织方式。
- [Loon 官方规则优先级](https://nsloon.app/docs/Rule/)。
- [Loon 官方策略组](https://nsloon.app/docs/Policy/policygroup/)：fallback、url-test 的行为及参数。
- [Loon DNS](https://nsloon.app/docs/DNS/)、[Host 映射](https://nsloon.app/docs/DNS/hostmap/)、[节点订阅](https://nsloon.app/docs/Node/subscription/)：域名指定解析器、手机回落开关、节点 bootstrap。
- [Loon 官方 DoH 说明](https://t.me/s/LoonNews/532)：DoH 连接也走规则，需要自行添加代理规则。

静态检查和 HTTP 下载检查不等于手机端验收。导入、节点连通、实际分流和广告效果需要 Loon 实机验证。进度见 [PROGRESS.md](PROGRESS.md)。

本机访问规则源遇到 Cloudflare HTTP 403，地址已与 ShuntRules 目录核对，但未验证规则正文。请在 Loon 中确认 14 个规则集均成功下载；若同样报错，配置尚不能按预期分流，需要解决上游访问或调整来源。检查记录见 [docs/validation.json](docs/validation.json)。
