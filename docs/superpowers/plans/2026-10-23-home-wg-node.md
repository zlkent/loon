# 家庭 WG 节点版交付计划（candidate）

## SPEC / 已批准边界

用户在两轮假标记跨更新后明确要求“开始吧，直接搞，别测试了，不行再说”。不再要求探针、改数字或分轮实机测试；本轮直接交付能配置使用的节点版，跳过新增测试及全量测试，仅做语法、生成一致性、私密信息与发布检查。不把代码交付写成 ROS 已握手。

继续复用现有分支和普通工作区，保留历史 dirty 文件。不用已暂停的完整配置解析器，不修改 main，不收集任何真实密钥。此处记录实现方案，不再重复请求设计确认。

## 设计

- 手机“数据持久化→导入指定数据”一次保存 JSON 到独立 key `zlkent.loon.home-wg.node.v1`；与旧 HomeWG/NodeProbe key 隔离。只读节点解析器将固定公开 seed 转成 `家庭WG` WireGuard 节点；缺参数时保留同名不可用占位节点，使初次完整配置能装入，不能当作可用连接。
- `Config/Loon-HomeWG.lcf` 从现行正式基础配置派生：保留 DNS、Google/AI 美国限制、其余代理、广告和国内规则；只增加家庭订阅、两层家庭策略、192.168.1.0/24 包含路由和优先规则，从 skip-proxy 扣除该网段，并从全局互联网池排除家庭 WG。
- 普通自动切换插件在网络变化及每分钟读取本地 homeSSID，对比 `$config.getConfig().ssid`，只切换 `家庭自动`；家里 DIRECT，其他或 SSID 无法读取时用 WG。`家庭内网` 外层允许用户手选 WG/DIRECT，不会被脚本抢回。网络识别依赖权限和实际 API，最多有一分钟校正延迟，不改变 Loon 全局模式。
- 设备反馈补齐：订阅节点已为 WireGuard，但家庭策略没有该节点，故家庭策略改用独立 `家庭WG节点` NameRegex 筛选动态引用，与其他地区策略的消费方式一致；不修改节点生成器/本地 key/SSID 脚本。公网测速不在家庭 allowed-ips 内，不作为隧道健康门禁。
- 不公开家庭入口、密钥或真实 SSID。参数、本地生成节点和导出的备份仍是明文，不是 Keychain。公共模板不能保证其他私人订阅或证书的全覆盖更新保留；首次迁移必须先备份，作为新配置导入，私人订阅在手机添加一次。

## TODO / PROGRESS

1. [x] 恢复两轮设备证据，核查官方 WireGuard、节点解析器、include-tun、网络变化脚本和配置 API；不复活旧全配置 parser。
2. [x] 实现只读节点解析器、公开 seed、解析插件、自动切换插件和本地参数示例。
3. [x] 生成完整 WG 配置，写清一次性初始化、更新及回退操作；保留正式基础配置不变量。
4. [x] 定向提交 380baf0f0e3a1dc08c2df5b4351d0c9dc101e481 已发布候选分支，远端 SHA 一致；8 个运行/使用 Raw HTTP 200 且逐字节匹配 Git 对象。正式 main ref 和 Raw 基线哈希未变。真实 ROS 连接和 SSID 行为由用户直接使用后反馈。

工程检查：两个 JS 的 `node --check`、生成器 `--check` 和 diff 检查通过。静态对照确认正式基础配置 SHA256 未变、14 远程规则/27 原策略组/DNS/MITM 保持不变、家庭网段不再被 skip-proxy 绕过且全局互联网池排除家庭 WG。12 个本轮交付文件未含真实 Base64 WG 密钥或个人 SSID。依用户要求没有新增/运行测试套件，也没有手机或 ROS 验收；这不是连接成功声明。

## SUBTASKS / 验收口径

本轮串行：存储接口、节点输出、完整模板和使用文档紧密耦合，不另开重复上下文线程。代码与发布检查是交付证据；手机握手、SSID 权限、LAN 回程、私人订阅及证书保留不属于已完成事实。当前无实施 blocker；家庭公网入口、公钥、手机私钥、手机 WG 地址只由用户在手机填写。

官方依据：
- https://nsloon.app/docs/Node/#wireguard
- https://nsloon.app/docs/Node/subscription/
- https://nsloon.app/docs/General/
- https://nsloon.app/docs/Script/script_v2/
- https://nsloon.app/docs/Script/script_api/
- https://raw.githubusercontent.com/Loon0x00/LoonExampleConfig/master/Script/netChanged.js
