# 节点级本地参数原型（candidate）

## Spec / approval

用户同意在原生变量实现前试自写插件。只验证：节点级解析回调、普通插件保存的非敏感标记能否跨上下文读取、连续两轮完整配置和节点更新后的保留。不填写真实密钥，不接入家庭 WG，不改正式订阅。

## Architecture / interfaces

- 普通控制插件调用独立 Generic 初始化脚本，参数只能是 `phone-test-1` 至 `phone-test-999999`，保存为独立 `zlkent.loon.node-probe.tag.v1` key。
- parser 插件处理固定公开 seed URL 的类型 1，读取这个 key，输出名称含标记的假 SS 节点；空值输出 UNSET 状态节点。不是 WireGuard 实现，也不是 Keychain。
- 独立完整测试配置内写明节点 `parser-plugin=URL` 与普通插件 URL，以便完整更新重建关联；不依赖完整配置解析器。
- seed 是文档保留 IP 的不可用 SS 节点，不添加测速/自动策略/私人订阅/MITM/家庭路由，唯一规则 `FINAL,DIRECT`。

## Tasks / focused validation

1. [x] 恢复现状及官方接口，基线 Node 24/24、Python 16/16 通过。
2. [x] RED：Node VM 8 项用例全部预期失败；实现独立初始化与解析脚本后 8/8 GREEN。只读写独立测试 key，不使用旧真实参数 key。
3. [x] RED：2 项配置/插件集成检查预期失败；添加独立配置、seed、两个插件及手机步骤和回退文档后 GREEN。focused 11/11、全 Node 35/35、Python 16/16，通过。
4. [ ] 全量验证、主配置哈希检查、fresh-context 只读审查；仅发布候选分支并核验远端及 Raw，手机验收明确留空。

Review: fresh-context 只读审查未发现阻止 candidate 发布的 Critical / Important；独立复跑 focused 11/11、Python 16/16，并核对主配置哈希。官方接口成立不代表设备门禁通过。

Ruling: 复用已存在的 `codex/wg-local-parameters` 普通 checkout，不新建 worktree；保留已有未提交资料，只显式暂存本轮文件和进度。候选发布延续本项目已批准的测试订阅交付范围，不合并 main。

Ruling: 用假 SS 而非合成 WG；本轮是节点订阅调用链实验，减少未验证 WG 语法与链路变量。代价是通过后仍需独立 WG 节点验证。

Pre-flight: 初始化脚本与解析脚本共享唯一测试 key 和标记格式；配置 Remote Proxy 的 URL 必须与 parser 目标一致，插件脚本 URL 必须落在同一候选分支。测试检查这些消费接口。

## Device gate

Node VM 只验证 JS 逻辑；导入可执行性、普通脚本与解析器的存储共享、完整更新保留必须由 Build 1008 真机确认。旧完整配置 parser 仍暂停，不能据此恢复真实密钥操作。
