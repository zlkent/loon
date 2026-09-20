# 个人 Loon 统一订阅

## 目标与边界

从 luestr/ShuntRules 选择用户需要的分类，参考 LoonLab 与 iKeLee 的 Loon 配置，发布到 zlkent/loon。
规则选择、默认策略以用户确认为准；不提交私人节点订阅或证书。

## 进度

1. [x] 检查现状：远端 main 初始提交为 43a8d2f，仅 README；本地已克隆，GitHub 账号具备认证。
2. [x] 获取来源：docs/rule-catalog.json 保存上游 668 个分类的名称和地址，属于目录快照，不是规则正文或订阅产物。
3. [x] 用户确认完整配置：Apple、微信、国内直连；Google、Telegram、GitHub、YouTube、OpenAI、Claude、Gemini 代理；启用去广告。
4. [x] 生成 Config/Loon.lcf 和 README；静态检查通过：12 个目录地址、10 个策略组、引用无环、默认策略与排序一致，无私人节点信息。上游下载检查被 Cloudflare HTTP 403 阻止，未验证正文。
5. [x] 配置提交 18ab2cb 已推送 main；远端 SHA 一致，Raw 订阅 HTTP 200、正文与本地一致。手机端导入与实际分流仍待设备验证。

## 当前状态

配置已生成，符合用户选择，未偏离完整订阅方案。发布后仍待 Loon 实机验收。
当前 blocker：本机请求 rule.kelee.one 返回 Cloudflare 403，不能据此确认手机端能否下载；未替换用户指定的规则源。
下一步优先：手机导入、补充节点、更新 12 个规则集、观察请求日志；如手机同样 403，再确定可用来源。
未找到 taskmaster / todo-list-csv 技能，以本文件作为恢复锚点。
