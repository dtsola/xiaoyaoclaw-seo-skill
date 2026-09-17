---
type: project
status: active
progress: 90
created: 2026-09-02
updated: 2026-09-17
docs:
  - path: docs/security-status-2026-09-17.md
    desc: ClawHub 安全检查 25 条命中核查与修复对照（含验证证据）
  - path: docs/evidence/security-v1.0.1-2026-09-17.json
    desc: 原始扫描证据（aig SARIF + skillspector 22 条）
  - path: README.md
    desc: 项目说明（技能包安装/使用）
  - path: SKILL.md
    desc: 技能本体（入口 + 路由表 + 子流程核心）
  - path: references/technical-seo.md
    desc: audit 深度清单（可爬性/索引/CWV/国际 SEO/反模式）
  - path: references/on-page.md
    desc: page 深度清单（title/meta/H1/图片/内链）
  - path: references/content-quality.md
    desc: content 深度清单（意图/E-E-A-T/关键词定向）
  - path: references/schema.md
    desc: schema 深度清单（JSON-LD 模板 + 检测反坑）
  - path: references/ai-seo.md
    desc: geo 深度清单（AI bot/llms.txt/pricing.md/AEO）
  - path: scripts/seo-audit.js
    desc: 零依赖 Node 审计脚本（三站实测通过）
---

# xiaoyaoclaw-seo-skill（SEO 技能）

## 目标 / 背景

指挥官运营三站（小遥AI官网 project.xiaoyaosai.com / 博客 www.dtsola.com / 知识店铺 www.landoo.me），需要一套 SEO 规范技能：既作规范参考指导三站优化，又可被 Claude Code / Codex 等 AI 编码工具直接加载（Agent Skills 开放标准，跨工具通用）。

- **决策**：自研精简版（不直接安装两大现成库——claude-seo 487 文件过重）
- **要点来源**：marketingskills（46.5k★）seo-audit v2.0.1 + ai-seo v2.4.0 + claude-seo 架构（小霞调研提炼 + 天桐 2026-09-02 对照原文核查补强）
- **子流程**：audit（全站审计）/ page（单页）/ content（内容质量）/ schema（结构化数据）/ geo（AI 搜索优化）
- 三站体检报告：`tasks/`（xiaoxia 侧 research-seo-skill/audit-report-2026-09-02.md）

## 当前状态

**双平台已发布**：技能本体开发完成 + 三站实测通过 + **GitHub 已发布**（dtsola/xiaoyaoclaw-seo-skill public/main/MIT，14 topics）+ **ClawHub 已上线**（**@dtsola · v1.0.1**，Created 2026-09-02 09:11 UTC / Updated 09:53 UTC，MIT-0，Moderate **CLEAN**，Reason `scanner.vt.clean`）。剩余：端到端验收（可选）+ 三站实际应用（指挥官决策项）。

## 进度日志

- 2026-09-02 15:10：接手小霞交接（research-seo-skill/ 交接文档 + 调研报告 + 体检报告 + 骨架 + 3 采集脚本）- 2026-09-02 15:11-15:16：SKILL.md 深化（176 行）+ references/ 五深度清单初稿 + assets/examples/ 示例
- 2026-09-02 15:17-15:24：scripts/seo-audit.js 开发 + 三站实测（dtsola/landoo/xiaoyao 结果与小霞体检报告全吻合）+ 修 4 个 bug（裸域 fallback www / robots 全站屏蔽误报 / 双版本误报 / 子域跳过 www 探测）
- 2026-09-02 15:25-15:27：**原文对照核查补强**（指挥官追问"是否提炼两大库"）——拉 marketingskills seo-audit v2.0.1 + ai-seo v2.4.0 原文，补 pricing.md（代理可读定价）/ Princeton GEO 量化表 / 6.5x 第三方引用 / citation≠recommendation / hreflang 全套 / crawl budget / 分站点类型清单 / 报告五要素；踩坑：edit 大段替换误删 CWV 节（已补回）
- 2026-09-02 15:28：验收通过（frontmatter 规范 / SKILL.md <500 行 / 交叉引用完整 / 脚本实测）
- 2026-09-02 15:29-15:30：指挥官立项定名 **xiaoyaoclaw-seo-skill**；开发副本迁入 projects/，PROGRESS.md 就位
- 2026-09-02 15:33-15:38：**README 优化 + GitHub 发布**——中英 README 重构为九件套统一骨架（hero + 特性 + 对比表 + 快速上手 + 互链）；hero.svg 制作 + Chrome headless 截图 + recognize.ps1 校验（on-page 标签文字裁切修复一次）；LICENSE/.gitignore 就位；commit 33e21a8；仓库 dtsola/xiaoyaoclaw-seo-skill（public/main/MIT，14 topics，中英 description）已推送
- 2026-09-15 10:4x：**发布状态更正**（指挥官 10:39 纠正）—— ClawHub **实为 2026-09-02 已上线**（`@dtsola · v1.0.1`，Created 09:11 UTC），此前卡内 pending 记录有误；同日 `clawhub inspect` 复核确证（MIT-0 / Moderate CLEAN / `scanner.vt.clean`）。进度 60 → 90（余项均为可选或指挥官决策项）。同步口径：`context-budget` 与 `beautify-github-readme` 归「生态扩展篇」，十件套口径不动。
- **2026-09-17 10:4x–11:2x：ClawHub 安全检查 25 条全部修复**（指挥官指令「处理 SEO Skill 的问题，一共有 22 个」）
  - 核查结果：`clawhub skill verify` → **fail / suspicious（conf high）**；skillspector **22 条**（HIGH 1 / MEDIUM 13 / LOW 8，风险分 78）+ **aig 3 条** = **25 条**；moderation 处置层却为 clean（双轨不一致，同 beautify）
  - **真问题（aig 3 条，全在 `scripts/seo-audit.js`）**：① 出站请求无校验 + `redirect:'follow'` → 可被重定向到内网（SSRF 面）② 响应体无上限（内存耗尽）③ 远端元数据直接打印（终端转义注入）→ 对应新增 `assertPublicTarget()`（解析级公网校验 + 逐跳校验 + 3 跳上限 + 10 域名上限）、`readTextLimited()`（1MB/256KB 上限 + 流式中止）、`safe()`（剥 ANSI/OSC 与控制字符）
  - **文档类 22 条**：P2 hero.svg 注释（隐藏指令）→ 清空 6 处注释；RA2 ×3 → 四处显式声明**无持久化**；LP3 → 补 `allowed-tools` + 「网络与权限边界」小节；SQP-1 ×4 → 触发词收窄为「站点/URL + 明确 SEO 动作」并补否定示例；SQP-2 → 新增「改动生产站安全规程」（6 条 + 高危目标清单）；SQP-3 ×12 → 12 个文件补「语言可选」声明、`inLanguage` 改可配置、hero 副标题改双语、README.en 对比表改写
  - **验证**：安全负向测试全绿（13 类内网/保留地址拦截、nip.io 解析到 127.0.0.1 被拒、转义注入被剥、体积上限生效）＋ 功能回归（example.com 抓取/跨跳重定向正常）＋ **三站实测结论与原体检报告完全一致** ＋ hero 渲染 29KB PNG 且视觉复核无裁切溢出
  - 产出：`docs/security-status-2026-09-17.md` + 原始证据 `docs/evidence/security-v1.0.1-2026-09-17.json`（134 KB）
  - 待办：发 **v1.0.2** → 复扫；GitHub 推送待代理恢复

## 待办 / 决策点

- [ ] **发 v1.0.2 到 ClawHub** → 等扫描落地 → `clawhub skill verify` 复扫核对 25 条是否清零（待指挥官点头）
- [ ] GitHub 同步推送（代理 22307 未监听 + 直连超时，与 beautify 同一阻塞点）
- [ ] 端到端验收（可选）：技能包装入网站仓库根目录验证 Claude Code/Codex 发现
- [ ] 三站实际应用（指挥官决策）：体检 🔴 项 = 裸域 DNS（dtsola/landoo）+ http→https 301 + xiaoyao/landoo robots.txt/sitemap 补真实文件
- [x] ~~是否发布 GitHub/ClawHub~~ → **均已完成**（GitHub 2026-09-02 / ClawHub v1.0.1 2026-09-02 已上线）

## 更正记录

- **2026-09-15 更正（原记录有误）**：此前本卡记为「ClawHub 发布待决策 / 停 pending-publication」，**实为已上线**。指挥官 10:39 纠正 + 天桐同日 `clawhub inspect xiaoyaoclaw-seo-skill` 复核确证：`@dtsola · v1.0.1 · latest=1.0.1`，Created 2026-09-02 09:11 UTC，Updated 09:53 UTC，MIT-0，Moderate CLEAN（`scanner.vt.clean`），Engine v2.4.26。发布状态改为「已上线（ClawHub）」。
- 关联口径（指挥官 2026-09-15 拍板）：`context-budget` 与 `beautify-github-readme` 同归**「生态扩展篇」**，**不升格为十一/十二件套**，「十件套」名称不动。
