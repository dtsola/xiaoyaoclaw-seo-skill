---
type: project
status: active
progress: 60
created: 2026-09-02
updated: 2026-09-02
docs:
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

技能本体开发完成 + 三站实测通过 + **GitHub 已发布（dtsola/xiaoyaoclaw-seo-skill public/main/MIT，14 topics）**。剩余：端到端验收（可选）+ 三站实际应用（指挥官决策项）+ ClawHub 发布（待决策）。

## 进度日志

- 2026-09-02 15:10：接手小霞交接（research-seo-skill/ 交接文档 + 调研报告 + 体检报告 + 骨架 + 3 采集脚本）
- 2026-09-02 15:11-15:16：SKILL.md 深化（176 行）+ references/ 五深度清单初稿 + assets/examples/ 示例
- 2026-09-02 15:17-15:24：scripts/seo-audit.js 开发 + 三站实测（dtsola/landoo/xiaoyao 结果与小霞体检报告全吻合）+ 修 4 个 bug（裸域 fallback www / robots 全站屏蔽误报 / 双版本误报 / 子域跳过 www 探测）
- 2026-09-02 15:25-15:27：**原文对照核查补强**（指挥官追问"是否提炼两大库"）——拉 marketingskills seo-audit v2.0.1 + ai-seo v2.4.0 原文，补 pricing.md（代理可读定价）/ Princeton GEO 量化表 / 6.5x 第三方引用 / citation≠recommendation / hreflang 全套 / crawl budget / 分站点类型清单 / 报告五要素；踩坑：edit 大段替换误删 CWV 节（已补回）
- 2026-09-02 15:28：验收通过（frontmatter 规范 / SKILL.md <500 行 / 交叉引用完整 / 脚本实测）
- 2026-09-02 15:29-15:30：指挥官立项定名 **xiaoyaoclaw-seo-skill**；开发副本迁入 projects/，PROGRESS.md 就位
- 2026-09-02 15:33-15:38：**README 优化 + GitHub 发布**——中英 README 重构为九件套统一骨架（hero + 特性 + 对比表 + 快速上手 + 互链）；hero.svg 制作 + Chrome headless 截图 + recognize.ps1 校验（on-page 标签文字裁切修复一次）；LICENSE/.gitignore 就位；commit 33e21a8；仓库 dtsola/xiaoyaoclaw-seo-skill（public/main/MIT，14 topics，中英 description）已推送

## 待办 / 决策点

- [ ] 端到端验收（可选）：技能包装入网站仓库根目录验证 Claude Code/Codex 发现
- [ ] 三站实际应用（指挥官决策）：体检 🔴 项 = 裸域 DNS（dtsola/landoo）+ http→https 301 + xiaoyao/landoo robots.txt/sitemap 补真实文件
- [ ] 是否发布 GitHub/ClawHub（指挥官决策，暂未定）
