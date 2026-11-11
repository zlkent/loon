# Siri 与 Apple AI 分流增量

## 范围 / SPEC

按用户明确给出的域名增加 Loon 原生规则：Siri 核心直连和真实 IP；六个指定准入/中继端点走现有美国自动优选，OpenAI 继续原美国限定服务组。仅精确例外，不把整个 Apple 或 Cloudflare 改代理，不使用 Surge 字段。

本轮交付到用户现用分支 `codex/wg-local-parameters` 的原 `Config/Loon-HomeWG.lcf` URL；同分支基础配置同步维护并重新生成衍生配置，不晋升 main，不改原 DNS、广告开关、WG 或解析器固定依赖。

## TODO / PROGRESS

1. [x] 恢复工作区、当前订阅及官方语义，明确秘密和已有 dirty 文件边界。
2. [x] 添加失败的静态回归测试，再增加本地规则和 General 字段并重新生成（执行命令及回归结果见后续验证记录）。
3. [x] 完成 focused / 回归验证、自审、文档边界核对。
4. [ ] 仅提交本轮明确文件，推送现用分支，核对原 Raw URL 字节；实机验收另记。

## 设计

- `DOMAIN-SUFFIX` 覆盖 guzzoni / siri / smoot 的根和子域；dejavu / sequoia 为精确域名 DIRECT。
- General `real-ip` 与 `skip-proxy` 仅包括这些 Siri 域名的精确根/必要通配符，避免 `*.apple.com` 把 AI 流量一并绕过。
- 六个用户指定 AI 域名使用精确 `DOMAIN,...,美国自动优选`，本地优先于远程 Apple/ChinaMax/广告；不创建额外组、不影响现有 Google/OpenAI/Claude/Gemini 的美国边界。
- 不添加 UDP 443 拒绝。`udp` / `block-quic` 是节点或 Remote Proxy 覆盖设置，不能用域名 DIRECT/PROXY 规则解除私人订阅中的 QUIC 禁用。更新文档和公共示例；私人节点不得被回填到公开文件。
- 不宣称“否则必报错”，分流与真实 IP 不保证账号、地区、设备、服务资格或节点 UDP 可用。

## 当前核对来源

- <https://nsloon.app/docs/General/>：real-ip 返回真实 IP；skip-proxy 绕过 HTTP Proxy，而非 TUN 全绕过。
- <https://nsloon.app/docs/Rule/>：本地 > 插件 > 远程订阅，规则匹配存在域名优先。
- <https://nsloon.app/docs/Node/subscription/> 和 <https://nsloon.app/docs/Node/>：udp 与 block-quic 的节点/订阅层语义。

## 验收边界

静态测试、发布字节核对与手机真实 Siri/Apple AI 功能验收分开。本轮不承诺修复淘宝、也不把之前长日志的 DNS 429 当作这条功能需求的根因。

## 红阶段

`python -m unittest discover -s tests -p test_apple_ai.py -v`：3 个测试、5 个子测试失败，原因分别为两个配置缺少本地规则、两个配置缺少真实 IP 例外、README 缺少 QUIC 本机限制说明。非语法或环境错误。

第一次完整回归：Python 19/19 通过；Node 54/56，通过的新功能导致两个旧快照检查失效：旧 skip-proxy 固定字符串和基础配置固定哈希。已检查差异仅为本次授权的 Siri / Apple AI 增量，再精确更新这两个断言；没有改旧探针或 WG 的生产实现。新名称明确哈希为当前分支审核基线，不再把它称为 main 正式不变的证明。

## 发布前验证与收口

- `python -m unittest discover -s tests -v`：19/19 通过（包含新增 3 个 Siri / AI 测试）。
- `node --test --test-reporter=spec tests/home_wg_check.test.js tests/home_wg_parser.test.js tests/home_wg_probe.test.js tests/node_probe.test.js`：56/56 通过。
- `python tools/generate_home_wg.py --check`、本轮写集 `git diff --check` 通过。
- 对比 HEAD 的有效 section：两个配置只增加 11 条本地规则，以及 General 的 skip-proxy / real-ip；DNS、策略组、远程规则、WG、解析器 pin、MITM、节点有效内容均不变。公共配置无 key-shaped Base64 私钥。
- `Config/Loon.lcf` SHA256：`6544d36f79ecd0d7e9fbb19a791d21fde047cc5752ba22c3ffb01903945ac74f`。
- `Config/Loon-HomeWG.lcf` SHA256：`9c2b88c3cf0826496c23bb1a99cb2271495469c28aa1e6200d0f83af9ba27427`。
- 改动文件：`Config/Loon.lcf`、`Config/Loon-HomeWG.lcf`、`README.md`、`tests/test_config.py`、`tests/test_apple_ai.py`、`tests/home_wg_parser.test.js`、`tests/node_probe.test.js` 和本任务文档；生成器算法未改，运行后衍生产物与基础配置同步。
- 当前阶段：代码与静态验证完成，待原分支发布核验；不偏离只增加所需规则的范围。
- 设备侧 blocker：私人节点订阅可能保留 `block-quic=true`，公开配置不能替改；还未验证所选美国节点 UDP 能力、真实出口、Siri 新查询与 Apple AI 业务结果。
- 最值得继续：更新原完整订阅、核对私人节点订阅 QUIC 参数，然后在手机观察 Siri DIRECT / 真实 IP 与 AI 美国自动优选。淘宝广告对照仍是独立未验收问题，本轮不处理。
