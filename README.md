# 我的 Loon 统一配置

一次导入完整配置，集中管理所选规则。规则正文由 Loon 从上游下载、更新，本仓库不复制上游规则正文。

**配置订阅地址：**

```text
https://raw.githubusercontent.com/zlkent/loon/main/Config/Loon.lcf
```

## 使用

1. 在 Loon 备份当前配置，将上述地址添加为远程配置/配置订阅（不是节点订阅或单个规则集）。
2. 在手机端添加私人节点订阅并更新节点。公共配置不包含节点，未添加节点时无法使用代理。
3. 在“节点选择”选一个可用节点。八个服务策略组默认跟随它，也可以分别指定节点；AI 服务需选择服务可用的出口。
4. 使用规则分流模式，更新远程规则，确认全部下载成功。
5. 检查请求日志，核实直连、代理、广告拦截是否命中预期策略。

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

### Twitter 视频与外链

Twitter 使用独立策略组；第三方外链即使不在 Twitter 分类中，只要没有命中其他规则，仍会通过 FINAL 走“节点选择”，不需要仅为未收录域名切换全局。若单独为 Twitter 选择节点，未收录外链仍跟随“节点选择”，不会自动继承 Twitter 节点。

若视频仍失败，请查看失败请求的域名、命中规则和实际策略：REJECT 可能是广告误拦截；DIRECT 可能是直连分类误命中；已走代理则需排查节点、出口地区或网站自身问题。确认误分类后才添加精准例外，避免放行整类广告或把国内服务全部代理。当前未做 Twitter 视频实机播放验证。

### 高德分类不是去广告

GaoDe 用来识别高德业务域名并直连，不应整体设为 REJECT，否则可能影响地图和导航。其原始数据源列出 amap.com、autonavi.com、gaode.com 等域名，见 [GaoDe 上游规则](https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Loon/GaoDe/GaoDe.list)。通用 Advertising 承担广告拦截；未安装高德专用改写或脚本插件，不承诺去除高德全部广告。

## 维护与来源

编辑 [Config/Loon.lcf](Config/Loon.lcf) 的 `[Remote Rule]` 即可调整选择。删除整行或设置 `enabled=false` 可停用分类。新增规则可从 [上游目录快照](docs/rule-catalog.json) 找到地址，策略使用 DIRECT、节点选择或已定义的服务组。目录中的 668 类并未全部启用。

提交到 main 后订阅地址不变；上游规则内容更新不需要重新生成本配置。

- [ShuntRules](https://github.com/luestr/ShuntRules)：全部规则的来源目录，上游注明其数据来自 ios_rule_script。
- [LoonLab 参考配置](https://raw.githubusercontent.com/sooyaaabo/LoonLab/main/Config/Loon_RawConfig.lcf)：参考配置、策略和远程规则的组织方式。
- [iKeLee 中文配置](https://github.com/luestr/ProxyResource/tree/main/Tool/Loon/Lcf/zh-CN)：参考节点筛选和分流组织方式。
- [Loon 官方规则优先级](https://nsloon.app/docs/Rule/)。

静态检查和 HTTP 下载检查不等于手机端验收。导入、节点连通、实际分流和广告效果需要 Loon 实机验证。进度见 [PROGRESS.md](PROGRESS.md)。

本机访问规则源遇到 Cloudflare HTTP 403，地址已与 ShuntRules 目录核对，但未验证规则正文。请在 Loon 中确认 14 个规则集均成功下载；若同样报错，配置尚不能按预期分流，需要解决上游访问或调整来源。检查记录见 [docs/validation.json](docs/validation.json)。
