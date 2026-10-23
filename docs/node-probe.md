# 节点级本地参数实验（candidate，非日用订阅）

**只验证调用链，不连接家庭 WG，也不填写私钥。** 正式 `main/Config/Loon.lcf` 没变；旧完整配置解析器方案仍暂停。本轮普通脚本只保存 `phone-test-1` 一类假标记，解析器将其显示在假节点名称中。通过后再做真实 WG 和回家直连，不承诺本轮已实现。

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

## 2. 保存、跨上下文读取假参数

只在第 1 节通过后操作：

1. 打开测试配置包含的普通插件 **“节点参数实验-控制器”**，将“非敏感测试标记”填为 `phone-test-1`，保存插件设置。
2. 在 Loon 的可手动执行脚本入口运行 **“NodeProbe 保存测试标记”**。仅保存插件设置不等于执行脚本；Generic 不会自动运行。应看到固定日志 `NodeProbe: LOCAL_TAG_SAVED`。**不要手动运行 parser 插件，也不要运行旧 HomeWG 脚本。** 如果找不到这个执行入口，停下提供不含私人信息的该页面截图；本文不虚构 1008 的具体菜单位置。
3. 更新“节点参数实验”节点订阅；节点应变为 `NodeProbe-phone-test-1-DO-NOT-USE`。
4. 把标记改为 `phone-test-2`，保存设置并再次运行保存脚本，再更新节点订阅，节点应变为 `NodeProbe-phone-test-2-DO-NOT-USE`。这个变化用于排除旧节点缓存。

解析器不接收插件参数、不写本地存储，只读取独立 key；因此这个测试针对普通插件与节点解析器的存储共享。仍出现 UNSET 表示共享/保存未打通，不是 WG 密钥格式问题。

## 3. 连续更新保留（必须实测）

此阶段不要重新运行保存脚本，也不要导入/更新正式日用配置。

1. 可将控制插件输入框清空并保存设置，**不要执行保存脚本**。已有 `phone-test-2` 副本应留在实验 key，解析器也不读输入框。
2. 对**独立测试完整配置**执行你之前用的长按更新，然后再更新“节点参数实验”节点订阅。
3. 核对：配置 `[Remote Proxy]` 仍有 `parser-enabled=true` 和 `parser-plugin=...NodeProbeParser.lpx`；`[Plugin]` 仍有控制插件；节点仍为 `NodeProbe-phone-test-2-DO-NOT-USE`。
4. 再重复一次第 2–3 步。每轮需有本次更新的新回调日志，避免把缓存节点误判为保留成功：

   ```text
   NodeProbe: NODE_CALLBACK_REACHED
   NodeProbe: LOCAL_TAG_READ_OK
   ```

脚本及配置更新日志可能在主 App 而非隧道日志；若拿不到新的回调证据，记录“节点显示保留，但重新执行未确认”，不算完整验收。遇到 UNSET / SEED / 报错就停，保留当次时间和这几行固定信息。

## 状态和验收

| 验收项 | 当前结果 |
| --- | --- |
| JS 变换、参数校验、存储失败保护、目标隔离、重复执行 | 本地 Node VM 测试通过，非设备证据 |
| 配置 / 插件 / seed 的链接及隔离 | 静态检查通过，非 Loon 语法解释器验收 |
| Build 1008 节点 parser URL 加载、UNSET 输出 | 待手机 |
| 普通插件保存 → 节点 parser 读取，1 → 2 的变更 | 待手机 |
| 两轮完整配置 + 节点更新后关联和本地数据保留 | 待手机，不能用 VM 模拟代替 |
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
