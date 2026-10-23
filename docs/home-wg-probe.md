# Loon 1008：先验证完整配置解析器调用链

## 为什么暂停原安装指引

用户设备已确认：现有完整配置的“更新策略”只有更新频率/全覆盖开关；“从链接导入”只有 URL、托管及对应更新选项。此前指引中的“选中家庭 WG 解析器插件”没有可操作入口，不能再当作可用流程。

Node 沙盒证明了 JS 逻辑，**没有证明 Loon 1008 会调用脚本或传入插件参数**。原 WG 实现暂不启用，不要求用户继续翻菜单，也不从这个现象推断 Loon 全面不支持配置解析。

## 无密钥探针

脚本：[HomeWGProbe.js](https://raw.githubusercontent.com/zlkent/loon/codex/wg-local-parameters/Parser/HomeWGProbe.js)。

- 仅当资源类型为完整配置、来源为原 main 基础配置地址时，在文件最前面添加注释 `# HOMEWG_CONFIG_PARSER_PROBE_OK`。
- 日志只写固定字符串 `HomeWG Probe: CONFIG_CALLBACK_REACHED`；不打印配置正文、URL 或任何参数。
- 不调用本地存储、通知、HTTP 或配置变更 API；不读取原家庭 WG 参数。
- 其他资源和其他来源原样返回；不改分流、节点、DNS 或证书。

## 操作（探针本身也需要设备验证）

1. 导出备份当前配置、私人节点和证书。优先使用配置副本测试；不要删除原配置。若已有其他全局解析器，先记录其地址，避免导入操作覆盖后无法恢复。
2. 在 iPhone Safari 打开下面的官方通用导入链接，将 **JS 脚本**导入为全局资源解析器，而不是把它当插件或整份配置：

   [导入无密钥探针](https://www.nsloon.com/openloon/import?parser=https%3A%2F%2Fraw.githubusercontent.com%2Fzlkent%2Floon%2Fcodex%2Fwg-local-parameters%2FParser%2FHomeWGProbe.js)

   该链接格式依据 [官方 Scheme 文档](https://nsloon.app/docs/Scheme/)，不代表已在 1008 点击验证。若无法打开或没有导入确认，停在这里，只反馈提示；不要重复导入原完整配置。
3. 在导入确认后，检查测试配置 `[General]` 是否出现指向 `HomeWGProbe.js` 的 `resource-parser`。这是检查，不要求用户每次更新手改。若没有这一行，也没有其他导入成功提示，先反馈实际结果，不继续覆盖更新。
4. 确认探针已注册后，更新**来自原 main 地址**的测试配置，随后查看文件第一行或脚本日志：

   ```text
   # HOMEWG_CONFIG_PARSER_PROBE_OK
   ```

   或固定日志 `HomeWG Probe: CONFIG_CALLBACK_REACHED`。

5. 只反馈导入结果、标记是否出现，以及静态错误文字。不要发送整份配置；它可能含私人订阅或证书。

“导入成功”不等于“配置更新会调用”；首次调用成功也不等于更新关联会长期保留。探针不负责保持自身 `resource-parser` 配置，首次成功后该行仍可能被公共模板覆盖，这也需要记录，不可据此宣称原 WG 方案已可用。

## 回退

切回原配置备份；恢复原全局解析器 URL（如有），或移除指向探针的 `resource-parser`。不要清空脚本存储或删除原节点。注释标记本身不会影响路由，可移除。

## 工程验证与剩余缺口

`node --test tests/home_wg_probe.test.js` 使用无密钥夹具覆盖标记、幂等、非目标透传与不访问私人接口。真正的配置资源调用、更新生命周期及后续插件参数传递仍未验证。
