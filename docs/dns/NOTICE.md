# 国内 DNS 域名数据来源

域名数据由 blackmatrix7/ios_rule_script 衍生，遵循上游 GPL-2.0；许可证原文见本目录 `LICENSE`。此说明适用于域名快照与配置中生成的国内 Host 数据，不把其他第三方来源重新授权。

- 原作者：blackmatrix7；项目：https://github.com/blackmatrix7/ios_rule_script
- 固定提交：`036c097eb26c6a52c4f04ebcb6633043cb942669`
- 获取日期：2026-10-08
- 完整来源 URL、原始文件 SHA256、规范化域名：`docs/dns-domains.json`
- 转换实现：`tools/generate_dns.py`

使用 China / Apple 的 `_Domain.list`（以 `.` 开头表示后缀，否则为精确域名），加 WeChat / GaoDe / DouYin / NetEase 的 `.list`。China / Apple 的普通 `.list` 不包含完整域名正文，不能以其注释统计冒充已提取全量。

转换仅保留域名：小写、校验、去重、移除已被父后缀覆盖的子域及精确项。后缀写成根域和 `*.` 两项；精确项只写自身，统一使用 `server:223.5.5.5`。不转换关键词、顶级域、IP、USER-AGENT。结果为 5323 个后缀、26 个精确项。

本数据是 DNS 例外，不是国内地址权威数据库，也不是远程 ChinaMax 的同覆盖替代；Apple 按用户直连需求一并使用国内 DNS。原始内容可通过固定 URL 与哈希还原，生成器离线可重现已发布配置。未纳入私人节点、用户日志或运行时状态。
