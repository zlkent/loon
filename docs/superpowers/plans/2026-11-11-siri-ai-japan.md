# Siri AI 独立日本策略（替代上一版冲突项）

## SPEC / 边界

用户新要求优先：新增 `Siri AI` 独立策略，默认日本自动优选，可选日本故障转移 / 日本单节点，不提供美国、全局或 DIRECT 回落。接入用户提供的 Siri / Apple Intelligence 域名规则，替换之前 guzzoni / siri / smoot 直连及 AI 中继美国规则。

仅移除改走代理域名的旧 skip-proxy / real-ip 例外，恢复这些域名的默认 Fake-IP 行为，避免返回裸 IP 后影响域名分流；此前未被新列表覆盖的 dejavu / sequoia 保持原直连和真实 IP。不更改 OpenAI / Google / Claude / Gemini 的美国策略、DNS、广告、家庭 WG、MITM 或本地秘密。

用户条目 `gspel-ssl.ls.apple.com` 原样保留，且 `ls.apple.com` 后缀已经覆盖它及正确数字 1 的 `gspe1-ssl.ls.apple.com`。删除被同策略后缀完整覆盖的重复 `DOMAIN,mask-t.apple-dns.net`；保留上一版 `apple-relay.akamaized.net` 中继但改日本。`DOMAIN-KEYWORD,siri` 按请求保留，可能命中非 Apple 的含 siri 域名；`ls.apple.com` 和 `apps.mzstatic.com` 也不只影响 Siri，需说明范围而不宣称为 Siri 专属服务。

## TODO / PROGRESS

1. [x] 恢复当前分支、原订阅、旧例外与测试，确认主配置优先级和私人节点边界。
2. [x] 先修改静态预期并运行红测试，再新增日本组、替换规则、同步生成家庭 WG 文件。
3. [x] 验证日本策略闭包、域名命中 / 绕过冲突、旧美国服务 / DNS / WG 不变，完成完整回归及自审。
4. [x] 仅提交本轮写集，发布原分支并核对原完整订阅字节；手机验收另记。

## 交付

原 `codex/wg-local-parameters/Config/Loon-HomeWG.lcf` URL 不变；同步修改同分支基础文件并使用现有生成器派生，不晋升 main、不修改生成器算法。QUIC 仍需私人节点订阅 `udp=true,block-quic=false` 及节点实际支持；本地规则不能覆写这些设备设置。

## 红绿验证

新增 / 调整 `tests/test_apple_ai.py` 的四项测试后运行，旧配置在日本组 / 新规则 / 绕过例外 / README 各项出现预期失败，首个语义冲突为 guzzoni 仍为 DIRECT 而非 Siri AI。完成配置后四项全部通过；家庭 WG 生成器 `--check` 通过。旧探针的基础哈希和配置解析器 skip-proxy 字符串是已审核快照，随本轮明确授权的基础配置调整同步更新，未改生产探针或解析器代码。

## focused validation / 自审

- `python -m unittest discover -s tests -v`：20/20 通过。
- `node --test --test-reporter=spec tests/home_wg_check.test.js tests/home_wg_parser.test.js tests/home_wg_probe.test.js tests/node_probe.test.js`：56/56 通过。
- `python tools/generate_home_wg.py --check`、本轮写集的 `git diff --check` 通过。
- 静态域名匹配测试覆盖用户清单、siri 子域、数字 1 的 gspe1、旧 Akamai 中继；日本策略叶节点仅为日本池，原四个美国限定服务的叶节点仍为美国池。匹配器仅作静态预期检查，不冒充 Loon 引擎实测。
- 与发布前 HEAD 对比，变化仅为 General 中旧 Siri 例外缩减、本地规则替换、新增 Siri AI 策略组；其余有效 section、原策略组、DNS 端点、家庭 LAN 规则、解析器 pin 和 MITM 均不变。无 key-shaped token 引入公开配置。
- 基础配置 SHA256 `433c27f193206761d597679bc646f2a374e5691b3a7423fb2229a148c56682eb`；家庭 WG 配置 SHA256 `14f0a20cf756306cf346e93891ff6746886192ecf745bc665b3593b1274c5977`。
- 改动文件：`Config/Loon.lcf`、`Config/Loon-HomeWG.lcf`、`README.md`、`tests/test_apple_ai.py`、`tests/home_wg_parser.test.js`、`tests/node_probe.test.js`、本任务文档。
- 当前阶段：日本策略增量实现、静态验收与订阅发布核验完成，等待手机业务验收；未偏离最新用户列表范围，未顺手修改淘宝、DNS 或 WG。
- 当前 blocker / 剩余缺口：手机尚未更新并确认新策略命中，日本节点真实出口 / UDP / QUIC 能力未知；不能宣称 Siri 或 Apple AI 功能已恢复。
- 下一步：在原完整订阅更新后确认 `Siri AI → 日本自动优选`；需要固定日本出口时可在该组手选日本节点。保留私人参数，更新前备份且不全覆盖。

## 发布核验

- 功能提交 `9bad64697e7e661bb7116f2ea949da608341cb84` 已推送现用分支，远端分支 SHA 与本地相同；未改 main（仍为 `771efce05252b600d47edfe9d828595b7fb1bd97`）。
- 原 `https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Config/Loon-HomeWG.lcf` 返回 HTTP 200，9655 字节，与功能提交逐字节相同。基础配置同分支 Raw 返回 HTTP 200，8357 字节，亦与功能提交逐字节相同；哈希见上。
- 旧 dirty 的 `PROGRESS.md`、`docs/home-wg-probe.md`、`docs/superpowers/plans/2026-10-25-home-wg-seed-check.md`，以及本地 `diagnostics/`、`docs/requests/` 均保留，未暂存或上传。
