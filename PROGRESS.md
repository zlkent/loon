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
下一步优先：手机导入、补充节点、更新 14 个规则集、观察请求日志；如手机同样 403，再确定可用来源。
未找到 taskmaster / todo-list-csv 技能，以本文件作为恢复锚点。

## Twitter / 外链补充轮

1. [x] 恢复配置：原 FINAL 默认代理，但兜底可被手动切换为 DIRECT。
2. [x] 增加 Twitter 独立代理组和规则；GaoDe 显式直连。FINAL 改为直接引用节点选择，未匹配流量不依赖国外分类白名单。
3. [x] 核查 GaoDe 原始数据源：属于业务域名分流，不是广告列表；README 说明外链与 Twitter 可能使用不同出口及日志排查方法。
4. [x] 当前 14 规则、10 策略组静态检查通过；引用无环、服务策略、兜底代理和顺序符合预期。新增 Twitter/GaoDe 下载均为 HTTP 403，记录已更新；发布以 Git main 与 Raw 正文核对为准。

阶段判断：配置增量交付，仍符合原方案。未获得失败视频请求日志，不能把增加规则称为视频故障已修复。无设备条件是实际播放验收的缺口，上游 403 是规则下载验证的 blocker。
