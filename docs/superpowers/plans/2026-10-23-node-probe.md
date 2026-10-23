# 节点级本地参数原型（candidate）

## Spec / approval

用户同意在原生变量实现前试自写插件。只验证：节点级解析回调、本地保存的非敏感标记能否被解析器读取、连续两轮完整配置和节点更新后的保留。不填写真实密钥，不接入家庭 WG，不改正式订阅。初始化路径以本文底部设备补齐轮及 docs/node-probe.md 为当前口径。

## Architecture / interfaces

- 当前设备初始化使用 App “数据持久化→导入指定数据”保存独立 `zlkent.loon.node-probe.tag.v1` key；参数只能是 `phone-test-1` 至 `phone-test-999999`。普通控制插件/Generic 初始化脚本保留作原候选，入口未通过设备验收，不再要求执行。
- parser 插件处理固定公开 seed URL 的类型 1，读取这个 key，输出名称含标记的假 SS 节点；空值输出 UNSET 状态节点。不是 WireGuard 实现，也不是 Keychain。
- 独立完整测试配置内写明节点 `parser-plugin=URL` 与普通控制器、解析器两个插件 URL，作为完整更新保留关联的候选声明；不依赖完整配置解析器，也不保证该声明已通过设备完整更新。
- seed 是文档保留 IP 的不可用 SS 节点，不添加测速/自动策略/私人订阅/MITM/家庭路由，唯一规则 `FINAL,DIRECT`。

## Tasks / focused validation

1. [x] 恢复现状及官方接口，基线 Node 24/24、Python 16/16 通过。
2. [x] RED：Node VM 8 项用例全部预期失败；实现独立初始化与解析脚本后 8/8 GREEN。只读写独立测试 key，不使用旧真实参数 key。
3. [x] RED：2 项配置/插件集成检查预期失败；添加独立配置、seed、两个插件及手机步骤和回退文档后 GREEN。focused 11/11、全 Node 35/35、Python 16/16，通过。
4. [x] 全量验证、主配置哈希检查、fresh-context 只读审查；实现提交 a7dc4cd16c4fb0c6f1375c6b16664d2d8da73474 已推送候选分支，远端 SHA 及 7 个 Raw 正文匹配。main SHA 与正式配置 Raw 哈希均未变。手机验收明确留空。

Review: fresh-context 只读审查未发现阻止 candidate 发布的 Critical / Important；独立复跑 focused 11/11、Python 16/16，并核对主配置哈希。官方接口成立不代表设备门禁通过。

Ruling: 复用已存在的 `codex/wg-local-parameters` 普通 checkout，不新建 worktree；保留已有未提交资料，只显式暂存本轮文件和进度。候选发布延续本项目已批准的测试订阅交付范围，不合并 main。

Ruling: 用假 SS 而非合成 WG；本轮是节点订阅调用链实验，减少未验证 WG 语法与链路变量。代价是通过后仍需独立 WG 节点验证。

Pre-flight: 初始化脚本与解析脚本共享唯一测试 key 和标记格式；配置 Remote Proxy 的 URL 必须与 parser 目标一致，插件脚本 URL 必须落在同一候选分支。测试检查这些消费接口。

## Device gate

Node VM 只验证 JS 逻辑。Build 1008 用户已回报节点级解析变换、原生持久化导入到解析器读取成功，并按两轮完整配置/节点更新及假标记变更指引回报“值还在”“变2了”“是3了”。据用户报告，当前设备测试标记的两轮跨更新保留及重算通过；未另取逐步截图/日志，不推广为所有更新模式或长期稳定性。Generic 入口未打通且不再必需；旧完整配置 parser 仍暂停。真实 WG 为下一独立阶段，本轮不处理真实密钥。

## 设备证据驱动的补齐轮（2026-10-23）

- 用户回报：单独安装 parser 后 SEED → UNSET；原生“数据持久化→导入指定数据”写入测试键值后名称已变化。节点级执行及 UI 存储到 parser 的读取成立；没有 Generic 入口或完整更新通过证据。
- Ruling: 初始化以已可操作的 App 单项导入为准，旧普通插件 Generic 不再作为必需路径；这不等于通用原生配置变量或 Keychain。
- Ruling: 候选完整配置的 `[Plugin]` 补齐解析器声明，修正只引用 URL、未列 parser 插件的模板缺口。此改动只提供更新保留的候选声明，运行时保留仍要实测。
- [x] 新增声明回归测试，原模板 1 项预期失败；补齐配置后 focused 12/12、全 Node 36/36、Python 16/16 通过。
- [x] 文档按设备证据修正，并要求每轮先读取未重写的原值，再用假标记变化或新日志排除缓存。
- [x] 最小 diff 审查无阻止 candidate 发布的 Critical / Important；实现提交 65e8e5ff4b9515cb899c3606c1ea572328ad2fc5 已推送，远端 SHA 及本轮 4 个 Raw 正文一致；正式 main SHA 和 Raw 哈希未变。
- [x] 按用户两轮更新、原值读取及变更假标记的指引反馈完成手机实验，最终名称变3；已排除仅看旧节点缓存。证据为用户报告，未扩大为所有更新模式/长期稳定性，真实 WG 另阶段验证。
