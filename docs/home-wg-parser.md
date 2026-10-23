# 家庭 WG 本地参数解析器（候选测试版）

目标：私钥等信息只在手机填写一次；每次更新公共完整配置时，本机解析器自动合并家庭 WG。无需把仓库改成私有，无需新建服务。

**状态：代码和 Node 沙盒可测试，不等于 Loon 1008 已实测。正式主配置不变；首次请用配置副本测试并保留原配置。**

## 安装

1. 先导出备份现用配置、私人节点订阅及 MITM 证书。备份可能含密钥，请仅自己保存。
2. 在 Loon 插件页面添加这个远程解析器插件：

   ```text
   https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Plugin/HomeWG.lpx
   ```

3. 打开插件参数，填写下表。真实内容只填在手机，不粘到公开仓库、Issue 或聊天中。

   | 参数 | 填什么 |
   |---|---|
   | 手机 WG 私钥 | 与 ROS 手机 Peer 公钥配对的手机私钥，不是 ROS 私钥 |
   | ROS 公钥 | ROS 的 WireGuard 接口公钥 |
   | 预共享密钥（可选） | ROS Peer 配了 PSK 才填，未配则留空 |
   | 家庭公网 IP 或 DDNS | 只填 IPv4 或主机域名，不带 `https://`、路径和端口 |
   | WG 端口 | 默认 `51820`，与 ROS 监听端口一致 |
   | 手机 WG 地址 | 默认 `10.77.77.2`，不带 `/32`；须与 ROS Peer 对应 |
   | 家里 Wi-Fi 名称 | 精确匹配、区分大小写；2.4G/5G 同名只填一次 |

4. 在**用于测试的完整配置订阅**的解析器设置中，启用资源解析并选择“家庭WG配置解析器（测试版）”。基础配置地址仍为：

   ```text
   https://raw.githubusercontent.com/zlkent/loon/main/Config/Loon.lcf
   ```

   不要把插件地址当成完整配置订阅地址。菜单名称可能随版本变化；若找不到配置订阅的解析器选择项，先截图该设置页，不要贴完整配置或密钥。

5. 更新这份配置，确认下面的生成结果及自己的私人订阅/证书，再启用测试。若已经手工添加同名 `家庭WG` / `家庭内网`，先在测试副本中去掉手工项；解析器会拒绝覆盖同名项。

## 本机应生成什么

- `[General]` 包含 `include-tun = 192.168.1.0/24`；已有其他包含路由保留。
- `skip-proxy` 只扣除 `192.168.1.0/24`，保留其余 `192.168.*`、`10.*`、`172.16/12` 及域名项。不是简单删除所有私网绕过。
- `[Proxy]` 中有 `家庭WG`，其 `allowed-ips` 仅为 `192.168.1.0/24`，MTU 1280，Keepalive 25 秒。
- `[Proxy Group]` 中有 `家庭内网`：家庭 SSID 选 DIRECT，蜂窝及其他 Wi-Fi 选家庭 WG。不要把整个 Loon 切为直连。
- `[Rule]` 的第一条有效规则是 `IP-CIDR,192.168.1.0/24,家庭内网,no-resolve`。
- “全部节点”的筛选排除精确名称 `家庭WG`，防止它混入互联网自动优选。
- DNS、14 个远程规则、美国服务池和其他互联网策略保持输入模板原样。
- `[Plugin]` 列表保留本解析器的地址，以降低完整更新丢失插件入口的可能；**这不能替代手机端验证解析器关联和开关是否保留**。

`include-tun` 需要 Build 1007+，本候选以用户的 Build 1008 为测试底线。脚本不检查真实出口地理位置、不验证公钥配对，也不自动修改 ROS。

## 一次填写与本地副本

成功生成后，脚本把家庭参数写到 Loon `$persistentStore` 的 `zlkent.loon.home-wg.v1`，不经 HTTP 上传、不打印参数、不发含参数的通知。

- 四个必填控件都空时：尝试读取并校验已有本地副本；没有副本则报错，不静默返回不含 WG 的基础配置。
- 只有部分必填控件为空时：报错，不把旧私钥、新公钥、旧入口混在一起。
- 要修改参数时：四个必填项重新填完整，再修改端口等可选项。全空恢复模式会使用副本中的原端口、地址及 PSK，不用控件默认值覆盖它们。
- 参数不合法、模板不兼容或存储失败时：抛出静态 `HomeWG:` 错误，不向 `$done` 返回半成品。**Loon 遇到异常是保留旧配置、提示失败还是其他行为，仍需在配置副本实测**。

本地副本是普通脚本存储，不是 Keychain 或加密保险箱；其他可访问同一存储的 Loon 脚本可能读取它。最终生效的配置、导出备份中也有明文私钥。删除/重装 App、清理脚本存储可能丢失副本；这不是密钥备份方案。

**只保存家庭 WG 参数。** 解析器不会删除其输入里已有的私人订阅和证书，但下载的公共模板本身不含这些内容；它不会凭空读取、恢复手机旧配置中的机场订阅或 MITM。完整配置更新的“保留”机制仍须核对，不能因此省略备份。

## 手机验收（未勾选即未验证）

- [ ] 1008 能安装 parser 插件，在配置订阅中选择它，参数能传进脚本。
- [ ] 第一次更新生成节点、组、include 路由、家庭规则；私人订阅和证书无丢失。
- [ ] 再更新一次：只有一份家庭节点/组/规则，解析器关联仍在，四个必填项仍在或副本恢复有效。
- [ ] 蜂窝网络访问一个原本可用的家庭设备 IP，连接记录显示 `家庭内网 → 家庭WG`；ROS Peer 有近期握手且收发计数增加。
- [ ] 回到家庭 Wi-Fi，确认 Loon 能读到 SSID；关闭旧连接后重试同一 IP，记录显示 DIRECT。
- [ ] Google/AI 仍走美国池，其他代理业务仍按原策略；国内 App、DNS、广告拦截无回归。

先测试直接 IP，不把局域网域名、mDNS/Bonjour 自动发现也视为已实现。只接管家庭 `/24`，不接管 WG 管理网段。其他 Wi-Fi 若也使用相同 `192.168.1.0/24`，该范围仍按家庭 WG 处理，不会自动区分两个同名网段。更具体的 `bypass-tun`（包括其他插件下发的）及 SSID 识别权限可能影响结果。

ROS 前置条件是 UDP 入站放行、手机 Peer 地址和公钥正确，且家庭 LAN 有正确回程（此前方案使用限定手机到 LAN 的 SNAT）。本候选不证明这些条件已执行。

失败时只提供 `HomeWG:` 报错和已打码的策略/握手状态；不要贴含 `private-key`、`preshared-key`、订阅 token 或证书的整份生成配置。

## 回退和清除

1. 切回原配置备份；或者对测试订阅关闭自定义解析器，再重新下载原公共配置。不要只删除家庭节点却留下引用它的策略。
2. 不再使用时移除这个解析器插件及测试配置。此操作不保证清除脚本存储副本。
3. 如需清除副本，可在本机单次 Generic 脚本执行下面内容。只删除这一项，不清空其他脚本数据：

   ```javascript
   $persistentStore.write(undefined, "zlkent.loon.home-wg.v1");
   $done();
   ```

4. 清除副本后，旧配置、旧备份或插件输入框可能仍有私钥，需要分别清理。清空输入框并不等同于删除副本。

## 本地复核与依据

```powershell
node --check Parser/HomeWG.js
node --test tests/home_wg_parser.test.js
python -m unittest discover -s tests -v
git diff --exit-code 771efce -- Config/Loon.lcf
```

Node 只模拟 Loon 脚本入参、结束回调和存储接口，不运行 Loon 的配置语法解析器、iOS 路由或 WireGuard 协议。测试用的密钥全部是合成字节，不对应任何设备；不生成含真实参数的测试产物。

- [Loon 官方插件参数与 parser 类型](https://nsloon.app/docs/Plugin/)
- [官方 parser 插件新语法示例](https://github.com/Loon0x00/LoonExampleConfig/blob/master/Plugin/NewPlugin/Plugin_Loon_Parser_Example.lpx)
- [官方资源解析器输入、类型 0 和字符串输出示例](https://github.com/Loon0x00/LoonExampleConfig/blob/master/Script/node_parser_ex.js)
- [官方单节点 / WireGuard](https://nsloon.app/docs/Node/)
- [include-tun 与 HTTP 绕过](https://nsloon.app/docs/General/)
- [本地存储 API](https://nsloon.app/docs/Script/script_api)
- [官方 SSID 策略示例](https://github.com/Loon0x00/LoonExampleConfig/blob/master/example.conf)

本候选位于 `codex/wg-local-parameters`，不会替换 `main` 的正式配置；验证完成前不要删除测试分支，否则插件及脚本 URL 会失效。
