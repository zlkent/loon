# 节点级本地参数实验（candidate，非日用订阅）

**只验证调用链，不连接家庭 WG，也不填写私钥。** 正式 `main/Config/Loon.lcf` 没变；旧完整配置解析器方案仍暂停。本轮在本机保存 `phone-test-1` 一类假标记，解析器将其显示在假节点名称中。通过后再做真实 WG 和回家直连，不承诺本轮已实现。

**当前设备证据（用户回报，Build 1008）：** 仅在订阅行写 parser-plugin URL 时显示 SEED；单独安装“节点参数实验-解析器”后变为 UNSET；在“数据持久化→导入指定数据”写入测试键值后，名称变化。随后按两轮完整测试配置和节点订阅更新、原值读取及变更假标记的指引，依次回报“值还在”“变2了”“是3了”。据用户报告，测试标记的两轮更新保留及更新后重算通过；未额外获取逐步截图/日志，不扩大为所有更新模式、长期稳定性或真实 WG 已可用。Generic 入口仍未通过。

## 1. 先验证解析器执行

1. 先在手机备份目前可用配置、私人订阅与 MITM 证书。**新增一个独立测试配置，不覆盖、不删除原配置。** 如果导入页会覆盖原配置，先取消。
2. 从链接导入为托管测试配置：[NodeProbe.lcf](https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Config/NodeProbe.lcf)。这个文件全部直连，不能替代日用配置；无需给它补机场订阅或证书。
3. 在这个测试配置中更新名为“节点参数实验”的节点订阅，查看节点名字：

   | 节点名 | 含义 / 下一步 |
   | --- | --- |
   | `NodeProbe-UNSET-DO-NOT-USE` | 本地尚无标记，但节点解析器已执行，才进入第 2 节 |
   | `NodeProbe-SEED-DO-NOT-USE` | 看到原始 seed，**不能算解析器成功**；停在这里反馈 |
   | `NodeProbe-phone-test-数字-DO-NOT-USE` | 先前留有实验标记；仍需重新保存一个不同数字，排除缓存 |
   | 没有节点 / 报错 | 停在这里反馈本次错误，不继续真实参数操作 |

节点使用文档保留 IP `192.0.2.1`，是故意不可用的。**不要选为代理、不要测速**；超时并不是实验失败，名字才是观察项。此配置没有自动优选和引用此节点的业务规则。

节点级 `parser-plugin=URL` 已写入测试配置，无需再找“完整配置解析器设置”，也不使用旧 `HomeWGProbe.js` 或 `HomeWG.js`。URL 的加载与执行仍需本机验证；如果未执行，不重复猜菜单或宣称接口可用。

实际首轮仅引用 URL 未能触发变换；使用[插件导入入口](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Fzlkent%2Floon%2Fcodex%2Fwg-local-parameters%2FPlugin%2FNodeProbeParser.lpx)单独安装“节点参数实验-解析器”后，用户回报 UNSET。当前测试模板已把该解析器也列入 `[Plugin]`，不再只列控制器；这只是覆盖更新的声明补齐，不预先保证 Loon 自动登记或更新保留。已经看到 UNSET / 测试标记的设备无需重复安装；若出现 SEED，停止并记录当次状态，不循环安装。

## 2. 保存、跨上下文读取假参数

只在第 1 节通过后操作：

1. 打开用户已提供截图的 **“数据持久化”** 管理页，使用 **“导入指定数据”**，只写入本实验项：键 `zlkent.loon.node-probe.tag.v1`，值为普通字符串 `phone-test-1`。按当前 UI 的实际输入提示操作，不把本例猜成某种 JSON / 文件格式。
2. 不操作“导入数据”、任何删除功能或其他已有键值；不填写真实密钥。当前路径不需要控制器参数，也不需要手动运行 Generic / parser / 旧 HomeWG。
3. 仅更新“节点参数实验”节点订阅；节点应变为 `NodeProbe-phone-test-1-DO-NOT-USE`。用户已按此路径回报名称变化。
4. 若要排除旧缓存，可以对同一指定键写 `phone-test-2`，再次更新节点订阅，观察名称随之改变。若当前已经是 phone-test-1，也可先进入下一节保留测试，第二次写入留到第一轮完整更新后。

解析器不接收插件参数、不写本地存储，只读取独立 key；当前验证的是 **App 原生持久化导入 → 节点解析器读取**，不是普通控制器脚本执行。仍出现 UNSET 表示保存/读取未打通，不是 WG 密钥格式问题。

旧 Generic 初始化脚本和控制器保留作候选，不作为当前安装步骤：用户当前长按节点只有节点信息、没有该脚本菜单项，且没有已验证的其他执行入口。不要继续找菜单或在 JS 编辑器直接运行依赖插件参数的 `NodeProbeInit.js`。

## 3. 连续更新保留（必须实测）

只更新**独立测试配置**，不要导入/更新正式日用配置。失效时不要补装插件或重新写入丢失的值来“修复后算通过”。

1. 记录当前测试值，例如 `phone-test-1`，不修改数据，长按更新独立测试完整配置，再更新测试节点订阅。预期名称仍含原值。
2. 核对配置：`[Remote Proxy]` 仍有 parser-enabled / parser-plugin；`[Plugin]` **同时有控制器和解析器两个 URL**。这轮模板新增的就是解析器这一行，若没有，说明尚未拿到新模板或设备没有保留该声明，先停止。
3. 用“数据持久化→读取指定数据”读取实验 key，确认仍是更新前的字符串；只读，不先重写。这用于直接验证存储保留，而不是只看缓存节点名。
4. 为确认完整更新后的解析器确实重新计算，可在上述原值确认仍存在后，单项导入下一个假标记，例如 `phone-test-2`，再更新节点订阅；应看到名字跟随改变。此变更只排除缓存，不用于掩盖存储丢失；第 3 步若缺失/错误就停止，不能补写后算通过。
5. 以 `phone-test-2` 为新基线，再重复一轮第 1–4 步；需要变更测试时可用 `phone-test-3`。每轮保留原值读取、更新成功状态和变更后名称的结果。也可用本次新的回调日志证明重新执行：

   ```text
   NodeProbe: NODE_CALLBACK_REACHED
   NodeProbe: LOCAL_TAG_READ_OK
   ```

脚本及配置更新日志可能在主 App 而非隧道日志；若既没有新回调日志，也没有“原值仍在 + 修改假标记后重新解析”的证据，记录“节点显示保留，但重新执行未确认”，不算完整验收。遇到 UNSET / SEED / 更新报错就停，保留当次时间和固定信息，不重复安装或重新初始化掩盖结果。

## 状态和验收

| 验收项 | 当前结果 |
| --- | --- |
| JS 变换、参数校验、存储失败保护、目标隔离、重复执行 | 本地 Node VM 测试通过，非设备证据 |
| 配置 / 插件 / seed 的链接及隔离 | 静态检查通过，非 Loon 语法解释器验收 |
| Build 1008 节点解析变换、UNSET 输出 | 用户回报：单独安装解析器插件后已通过；不证明 URL 引用会自动安装 |
| App 持久化单项导入 → 节点 parser 读取 | 用户回报：导入 phone-test-1 后名称已变化；已有读取证据 |
| 普通控制器 Generic 执行 | 当前入口未打通；不再作为必需初始化路径 |
| 1 → 2 变更及完整配置更新后解析器调用 | 用户回报变2；具有更新后重算证据，不证明全新环境自动安装 |
| 两轮完整配置 + 节点更新后关联和本地数据保留 | 按用户依序回报通过，最终变3；仅限当前设备与所执行更新流程，非长期稳定性结论 |
| 真实 WG 节点、ROS 握手、SSID 切换、私人节点和证书保留 | 不在本轮范围；未实现 / 未验证 |

## 回退与隐私

- 切回原可用配置即可恢复日用；确认后可删除独立测试配置及两个 NodeProbe 插件。若仍有当前配置关联的测试订阅，先移除它再删除插件。不要覆盖恢复文件，不删除原节点或证书。
- 测试 key 是 `zlkent.loon.node-probe.tag.v1`，仅存假标记，与旧 `zlkent.loon.home-wg.v1` 完全隔离；卸载插件不保证清除此标记。残留假标记可以不管，不要调用会清空所有脚本数据的 API。
- 不接受真实密钥、入口或私人订阅；无 HTTP、通知、配置修改 API，日志和报错只输出固定状态。公开 SS 的密码是固定假字符串，不是凭据。
- `$persistentStore` 是普通脚本存储，不是 Keychain；即使原型通过，也不代表其他插件不能读取，或未来真实密钥可以安全分享/备份。原生安全变量 [需求 #55](https://github.com/Loon0x00/Bugs-Feedback/issues/55) 仍有效。

## 文件与复现

```powershell
node --test --test-reporter=spec tests/node_probe.test.js
node --test --test-reporter=dot tests/*.test.js
python -m unittest discover -s tests -q
git diff --check
```

实现：`Script/NodeProbeInit.js` / `Parser/NodeProbe.js`；声明：`Plugin/NodeProbeControl.lpx` / `Plugin/NodeProbeParser.lpx`；测试输入：`Probe/NodeSeed.txt`；独立配置：`Config/NodeProbe.lcf`。正式 `Config/Loon.lcf` 的 SHA256 必须仍为 `fabe4c679bc7eba0b4674e67ced73b1874c0131b47f8a3cd87e0b3ac79658037`。

官方依据：[节点订阅 parser-plugin](https://nsloon.app/docs/Node/subscription/)、[Generic 与插件对象参数](https://nsloon.app/docs/Script/script_v2/)、[脚本存储 API](https://nsloon.app/docs/Script/script_api/)、[官方 parser 示例](https://raw.githubusercontent.com/Loon0x00/LoonExampleConfig/master/Script/node_parser_ex.js)。文档依据不替代上述手机验收。
