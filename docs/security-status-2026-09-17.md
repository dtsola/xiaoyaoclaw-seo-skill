# ClawHub 安全检查状态核查与修复（2026-09-17）

## 0. v1.0.2 复扫结果（2026-09-17 11:0x 追加）

**规则扫描已清零**：`clawhub scan download` 拿到的正式报告里
- `static-analysis.json` → **`status: clean` / `findings: []` / `reasonCodes: []`** ⇒ 原先 25 条命中全部消失 ✅
- `skillspector.json` / `virustotal.json` → `null`（本轮未产出）

**仍未通过的两项**
1. `security.status = suspicious`（`clawscan.json`，LLM 复核）：判词只有一句 —— *"its audit script has a remaining web-request boundary weakness"*，**无行级证据、无 guidance 字段**。属 LLM 对"先校验后连接"这一模式的定性判断。
2. `card.missing` —— 平台侧 **Skill Card** 未生成。核查结论：CLI `publish.js:256` 会**主动把 `skill-card.md` 从发布包里剔除**，说明该卡由**服务端生成**（1.0.9 的卡存在、1.0.10/1.0.2 尚无）⇒ **平台侧生成滞后，不是包的问题，也无法靠塞文件解决**。

### 针对 LLM 那条的加固（提交 `378b2a1`）

| 做法 | 说明 |
|---|---|
| **连接时校验**（关键） | 弃用 `fetch`，改用 `node:http/https`；`connectGuardedLookup()` 作为 `lookup` 回调，**每次建立 TCP 连接都重新解析并逐个检查将要使用的地址**，命中内网/保留段即失败 → 堵住「先校验后连接」的时间差（DNS 重绑定 TOCTOU）。`assertPublicTarget()` 降级为预检（快速失败 + 友好报错） |
| **端口白名单** | 只允许 80/443，杜绝把脚本当端口扫描器用 |
| **解压后再计量** | 支持 gzip/deflate/br 解压，体积上限计**解压后**字节（旧实现量的是压缩流） |
| **只读约束明文化** | 只发 GET；无 cookie jar、无 Authorization、UA 固定；文件头新增「明确不做」清单：不写文件、不发 POST、不登录、不探测端口、不外发抓取内容 |

**加固后验证**：守卫套件全绿（13 类内网/保留地址 · `127.0.0.1.nip.io` **在建连时**被拒 · 端口白名单 · 体积上限 · 转义剥离 · 解压正常）＋ 公网抓取与跨跳重定向正常 ＋ **三站实测输出与加固前逐字一致**。

---

> 执行人：天桐｜指令：指挥官「处理 OpenClaw SEO Skill 的问题，一共有 22 个」
> 命令：`clawhub skill verify xiaoyaoclaw-seo-skill`

---

## 1. 结论

**未通过（fail）** —— `ok:false` / `decision:fail` / 原因码 `security.status_not_clean`；`security.status = suspicious`（置信度 **high**），扫描对象 **v1.0.1**（latest）。

- **skillspector**：风险分 **78 / severity HIGH / `DO_NOT_INSTALL`**，**22 条**
  （HIGH 1 · MEDIUM 13 · LOW 8）
- **aig（腾讯 AI-Infra-Guard）**：**3 条** T09（1 warning + 2 note）
- 合计 **25 条命中**
- LLM 综合判词：*"This is a coherent SEO helper, but its audit script can contact arbitrary or redirected web targets without enough limits, so it needs review before installation."*
- moderation 处置层：`verdict = clean`（与 beautify 同款的双轨不一致：处置层干净、证据层可疑，`verify` 只认后者）

---

## 2. 命中清单与修复对照

### 2.1 aig（3 条，全在 `scripts/seo-audit.js`）—— 真问题

| 位置 | 问题 | 修复 |
|---|---|---|
| :30 | **不受限的出站请求（可探测内网/SSRF）**：目标无校验；`getText` 用 `redirect:'follow'`，公网站点可把请求重定向到内网 | 新增 `assertPublicTarget()`：仅 http/https、禁内嵌凭据、**DNS 解析结果命中回环/私有/链路本地/CGNAT/保留段/IPv6 ULA 即拒绝**；`getText`/`probe` 改为**手动重定向**，**每一跳重新校验**，最多 3 跳；单轮域名数上限 10 |
| :47 | **响应体无上限（内存耗尽）** | 新增 `readTextLimited()`：先看 `Content-Length`，再流式累计，**HTML 1 MB / 文本 256 KB** 上限，超限即 `reader.cancel()` 中止 |
| :204 | **远端元数据直接打印（终端转义注入）** | 新增 `safe()`：剥离 **ANSI CSI / OSC 转义 + C0/C1 控制字符**、压缩空白、截断长度；所有远端来源字符串（title/description/canonical/lang/JSON-LD 类型/location/错误信息）打印前一律过 `safe()` |

### 2.2 skillspector（22 条）

| 类别 | 条数 | 位置 | 修复 |
|---|---|---|---|
| **P2** Prompt Injection（HIGH） | 1 | `assets/readme/hero.svg:7` | SVG 内的 `<!-- -->` 注释被当作"隐藏指令"载体 → **移除 hero.svg 全部 6 处注释** |
| **RA2** Rogue Agent / Session Persistence（MEDIUM） | 3 | `README.md`、`README.en.md`（安装说明附近） | 显式声明**无持久化**：不建 cron、不起守护进程、不写启动脚本、不写跨会话状态文件；安装里的 `cp AGENTS.md/CLAUDE.md` 是**用户手动一次性**动作（删文件即撤销），非自动持久化 —— 中英文 README + AGENTS.md + SKILL.md 均写明 |
| **LP3** MCP Least Privilege（MEDIUM） | 1 | `SKILL.md:1` | frontmatter 补 **`allowed-tools`**（Read/Write/Edit/Glob/Grep/Bash/WebFetch/WebSearch/Browser/Env）；SKILL.md 新增「网络与权限边界」小节：只访问用户显式给出的公网目标，禁内网/保留段，禁端口扫描与批量探测 |
| **SQP-1** 触发面过宽（MEDIUM×3 + LOW×1） | 4 | `SKILL.md:8`、`README.md:68`、`README.en.md:68`、`llms.txt.xiaoyaoai.example:21` | 触发词改为**"站点/URL + 明确 SEO 动作"同时出现**才激活，并补**否定示例**（泛问概念 / 纯文案营销 / 无站点的关键词清单 / 仅顺口提到 SEO）；llms.txt 的 AI 引用许可**收窄范围**（只允许公开页面摘要，排除付费正文、用户数据、未发布内容、第三方转载） |
| **SQP-2** 生产改动风险未提示（MEDIUM） | 1 | `README.md:74` | 新增「⚠️ 改动生产站的安全规程」（README 中英 + SKILL.md）：先诊断后改、**高危目标清单**（robots.txt / sitemap / 301·rewrite / canonical / hreflang / noindex / DNS / 框架路由）、可回滚（git 或 .bak）、先验证再生产、禁批量自动化、报告四要素 |
| **SQP-3** 语言/地区中立性（MEDIUM×4 + LOW×8） | 12 | `AGENTS.md`、`references/*.md`×4、`README.en.md` 对比表、`jsonld-site.template.json`、3 个 llms.txt 示例、`robots.txt.template`、`hero.svg`、`scripts/seo-audit.js` | 统一补**语言可选**声明（答案语言跟随用户，中文仅为默认；英文文档在 `README.en.md`）→ 12 处文件全覆盖；`inLanguage` 改为**可配置占位符**并注明按站点填写；hero 副标题改**双语**（"网站搜索可见性分析 · Search visibility audit"）；README.en 对比表 "Chinese-first" → "bilingual docs; answers in the user's language" |

---

## 3. 验证证据（真跑，非纸面）

**安全负向测试**（`tmp/seo_guard_test.js`，剥离主 IIFE 后直调内部函数）

- `isBlockedIp`：13 个内网/保留地址全部拦截（127.0.0.1 / 10.x / 172.16-31 / 192.168 / 169.254.169.254 / 100.64 / 0.0.0.0 / 224.x / ::1 / fe80:: / fd00:: / ff02::），4 个公网地址正常放行 ✅
- `safe()`：`ESC[31m`+`OSC0;pwn;BEL` 样本被剥离为纯文本、超长截断 ✅
- `assertPublicTarget`：`127.0.0.1` / `localhost` / `169.254.169.254` / `10.0.0.1` / `[::1]` / `file://` / 带凭据 URL 全部拒绝 ✅
- **主机名解析到内网**（`127.0.0.1.nip.io` → 127.0.0.1）被拒 ✅（真实的解析后校验，不是只查字面量）
- 云元数据主机名 `169.254.169.254.nip.io` 被拒 ✅
- 响应体上限：`maxBytes=100` 抓 example.com → 正确中止 ✅

**功能回归**（不能修安全问题修坏功能）

- `example.com` 正常抓取（200 / 559 字节）✅
- 跨跳 `http://example.com/` → `https://` 重定向被正确跟随 ✅
- **三站实测**：`node scripts/seo-audit.js dtsola.com landoo.me project.xiaoyaosai.com`
  → 结论与 2026-09-02 小霞体检报告**完全一致**（dtsola/landoo 裸域无 A 记录、dtsola http 并存、landoo robots/sitemap/llms.txt 三件套 HTML fallback、xiaoyao 的 robots/sitemap/llms.txt 三件套均真实存在 + JSON-LD 2 个）✅

**资产回归**

- `jsonld-site.template.json` 仍是合法 JSON（占位符为字符串值）✅
- `assets/readme/hero.svg`：注释清空后 XML 合法 → **Chrome 真实渲染 29 KB PNG** → 视觉模型复核：**双语副标题无溢出/裁切/与右侧面板相撞**（留 ~180px 间距）✅
- 顺带把 hero 底部写死的 `v1.0.0` 去掉（避免每次发版都过期）

---

## 4. 待办

- [ ] 发 **v1.0.2** 到 ClawHub → 等扫描落地 → `clawhub skill verify` 复扫，核对 25 条是否清零
- [ ] GitHub 同步推送（当前代理 22307 未监听 + 直连超时，与 beautify 同一阻塞点）

## 5. 原始证据

- `docs/evidence/security-v1.0.1-2026-09-17.json`（aig SARIF + skillspector 全量 22 条 issue）
