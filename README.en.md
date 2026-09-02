# SEO Skill 🔍

<div align="center">
  <a href="README.md">🇨🇳 中文</a> | <strong>🌐 English</strong>
</div>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="SEO Skill — analyze & optimize search visibility (technical SEO, on-page, content quality, schema, AI search) for any website, from any Agent Skills tool">
</p>

> Analyze and optimize website search visibility — diagnose SEO issues, output actionable fixes, and help implement them.
> 网站搜索可见性分析与优化技能——诊断 SEO 问题，输出可执行修复，直接帮网站落地。

![license](https://img.shields.io/badge/license-MIT-green)

## Why You Need It

Poor rankings, traffic drops, and slow indexing usually come from a handful of root causes: missing robots.txt/sitemap, http/https duplicates, no canonical tags, H1 abuse, no structured data, invisible to AI search. But finding them systematically is the hard part:

- ❌ **Fragmented knowledge**: SEO best practices are scattered across dozens of articles/tools — no single executable checklist
- ❌ **Diagnose without treatment**: many tools report problems but skip "how to fix + how to verify"
- ❌ **Tool lock-in**: works only in one AI tool; breaks when you switch (Claude Code → Codex → Cursor)
- ❌ **Hidden pitfalls**: robots.txt returning an HTML fake file, schema invisible to static fetches, missing bare-domain DNS — easy to misjudge if you haven't hit them

This skill gives you **one spec, five workflows, cross-tool**: audit (full-site) / page (single URL) / content (quality) / schema (structured data) / geo (AI search). Every workflow follows "checklist → criteria → fix → verify", with real-world pitfalls baked in.

## Features

- 🔍 **audit — full-site technical SEO**: crawlability & indexation → technical foundations → on-page → content quality → authority/links, graded 🔴🟠🟡, each item with Issue / Impact / Evidence / Fix / Verify
- 📄 **page — deep single-URL analysis**: title / meta description / H1 structure / keyword placement / image alt / internal links, with copy-paste rewrite suggestions
- ✍️ **content — quality & keywords**: search-intent classification, keyword research (incl. AI fan-out), E-E-A-T signals, keyword cannibalization checks
- 🧩 **schema — structured data**: JSON-LD templates for common types + browser-render detection (static fetches miss JS-injected schema)
- 🤖 **geo — AI search (AEO/GEO)**: llms.txt, AI bot list & robots policy, `/pricing.md` for AI buying agents, Princeton GEO quantified methods
- 🛠️ **zero-dependency audit script**: `scripts/seo-audit.js` (Node 18+, built-in fetch/dns) — one command checks DNS / 301 / robots / sitemap / homepage tags and auto-grades
- 🧰 **cross-tool**: Agent Skills open standard — works in Claude Code / Codex / Cursor / Gemini CLI and more
- 🪶 **progressive disclosure**: SKILL.md entry <500 lines, deep checklists loaded on demand from references/ — no context burn

## Install

This repo *is* the skill package (Agent Skills structure, SKILL.md at root). Two ways to use it:

```bash
git clone https://github.com/dtsola/xiaoyaoclaw-seo-skill
```

**Option A: project-level SEO spec inside a website repo (recommended)**
```bash
# inside your website repo:
mkdir -p .agents/skills
cp -r xiaoyaoclaw-seo-skill .agents/skills/xiaoyaoclaw-seo-skill   # skill body
cp xiaoyaoclaw-seo-skill/CLAUDE.md ./             # Claude Code entry (one line → AGENTS.md)
cp xiaoyaoclaw-seo-skill/AGENTS.md ./             # read by Codex/Cursor etc.
```

**Option B: install into your AI tool's skill directory (global)**
```bash
# Claude Code → ~/.claude/skills/xiaoyaoclaw-seo-skill/
# Codex       → ~/.codex/skills/
# Cursor      → .cursor/rules/
# others      → corresponding Agent Skills dir
```

> The skill targets **websites / coding tools** (Agent Skills open standard) — no need to install into OpenClaw's skills directory.

## Usage

1. Put the skill in your website repo (or tool skill dir)
2. Tell your AI tool: "**audit this site's SEO**", "**optimize this article's keywords**", "**why isn't my page cited by AI?**" — the skill picks the workflow:
   - `audit` — full-site check (crawlability / indexing / CWV / on-page / E-E-A-T)
   - `page` — deep analysis of one URL
   - `content` — content quality & keyword plan
   - `schema` — structured data detect / generate
   - `geo` — AI search visibility (llms.txt / AI bots / pricing.md)
3. Get a graded issue list with fixes + verification; implement after your confirmation

## 🚀 Quick Start (3 steps)

### Step 1: Install + run a quick check

```bash
git clone https://github.com/dtsola/xiaoyaoclaw-seo-skill
cd xiaoyaoclaw-seo-skill

# zero-dependency quick check: DNS / 301 / robots / sitemap / homepage tags in one command
node scripts/seo-audit.js your-domain.com
```

Sample graded output:

```
🔴 Critical:
  • Bare domain has no DNS A record → add A record + 301 normalization
  • http:// returns 200 without 301 to https → configure server/CDN 301
🟠 Medium:
  • Homepage missing canonical → add self-referencing canonical
  • Homepage has 11 H1s → collapse to one
🟡 Optimization:
  • llms.txt missing → add real llms.txt (AI citation upside)
```

### Step 2: Deep audit with AI

Tell your Claude Code / Codex:

> Use the seo skill to audit this site, output a 🔴🟠🟡 graded issue list

The tool reads SKILL.md → picks `audit` from the router → loads references/technical-seo.md → fetches pages with a browser renderer → outputs the five-element report.

### Step 3: Fix + verify

Every issue ships with a fix (per stack: Next.js / Halo / static site) and a verification method (curl status / Rich Results Test / PageSpeed / GSC coverage).

## Daily Usage Patterns

| Scenario | Action |
|---|---|
| Before launching a site | run `audit`, clear all 🔴 first |
| Traffic drop / lost rankings | `audit` — check crawlability & indexing first (robots/sitemap/canonical) |
| One page not indexed | `page` deep analysis on that URL |
| Writing new content | `content` — define intent + keywords before writing |
| Want rich results | `schema` — generate JSON-LD (Article/FAQ/Product) |
| Want ChatGPT/Perplexity citations | `geo`: llms.txt + allow AI bots + definition first paragraph + FAQ |
| Selling products/services | `geo` also generates `/pricing.md` (readable by AI buying agents) |

## Compared to Other SEO Approaches

| | Scattered guides/tools | marketingskills seo-audit | claude-seo (487 files) | **SEO Skill (this one)** |
|---|---|---|---|---|
| Systematic spec | ❌ scattered | ✅ complete | ✅ complete | ✅ complete |
| Runtime deps | — | light | ⚠️ Python/Chromium heavy | ✅ zero-dep (Node 18+) |
| On-demand loading | — | references | sub-skills | ✅ references/ progressive |
| Chinese support | — | EN only | EN only | ✅ Chinese-first (EN terms kept) |
| Real-world pitfalls | — | some | some | ✅ incl. measured pitfalls (HTML fallback / schema static miss) |
| Cross-tool | — | Claude family | Claude family | ✅ Agent Skills standard |
| AI search optimization | — | separate ai-seo skill | yes | ✅ built-in geo (incl. pricing.md) |

## Directory Structure

```
xiaoyaoclaw-seo-skill/
├── SKILL.md                    # skill body (entry + router + 5 workflow cores)
├── AGENTS.md                   # cross-tool entry (Codex/Cursor/Gemini CLI etc.)
├── CLAUDE.md                   # Claude Code entry (one line → AGENTS.md)
├── README.md                   # this file
├── references/                 # on-demand deep checklists
│   ├── technical-seo.md        # audit: robots/sitemap/canonical/CWV/i18n/pitfalls
│   ├── on-page.md              # page: title/meta/H1/images/internal links
│   ├── content-quality.md      # content: intent/E-E-A-T/keyword targeting
│   ├── schema.md               # schema: JSON-LD templates + detection pitfalls
│   └── ai-seo.md               # geo: AI bots/llms.txt/pricing.md/AEO
├── scripts/
│   └── seo-audit.js            # zero-dep audit script (Node 18+, auto-graded)
├── assets/
│   ├── readme/                 # README assets (hero.svg / community QR)
│   └── examples/               # example configs (3-site llms.txt / robots template / JSON-LD)
└── LICENSE
```

## License

MIT — use freely, attribution optional.

---

## 🛠️ Customization?

**Agent & Skills customization, from ¥800.**

- WeChat: `dtsola` (note: **openclaw定制**)
- Services: website SEO implementation / OpenClaw multi-agent setup / custom Skill development / agent memory systems

## 💬 Join the Community

Xiaoyao product family user group — feedback · discussion · feature requests:

<p align="center">
  <img src="./assets/readme/community-qr.png" width="280" alt="XiaoyaoAI user group QR code: scan to join, or add WeChat dtsola (note: 加群)">
</p>

<p align="center">Scan to join, or add WeChat <code>dtsola</code> (note: <b>加群</b>)</p>

## Sister Projects

- 🏠 **xiaoyaoclaw-workspace-initializer** (workspace initializer): give every agent a "home" — standard dirs + WORKSPACE.md spec + multi-agent config safety. <https://github.com/dtsola/xiaoyaoclaw-workspace-initializer>
- 🧠 **xiaoyaoclaw-memory-distill** (memory distillation): distill conversations into structured memory — tiered semantics (core→MEMORY.md / daily→logs) + first-run build + incremental dedup + sensitive skip. <https://github.com/dtsola/xiaoyaoclaw-memory-distill>
- 🗂️ **xiaoyaoclaw-task-progress-tracker** (task progress tracker): directory-as-container, PROGRESS.md-as-progress — tasks/ & projects/ lifecycle (status + progress log + doc index). <https://github.com/dtsola/xiaoyaoclaw-task-progress-tracker>
- 📚 **xiaoyaoclaw-kb-retriever** (knowledge base retriever): local KB retrieval — hierarchical data_structure.md index navigation + progressive retrieval (md/pdf/xlsx), zero-dep zero-API-key, Windows/macOS. <https://github.com/dtsola/xiaoyaoclaw-kb-retriever>
- 🩹 **xiaoyaoclaw-workspace-auditor** (workspace auditor): read-only audit of 5 health dimensions + graded report + fix suggestions, never modifies files. <https://github.com/dtsola/xiaoyaoclaw-workspace-auditor>
- 📎 **xiaoyaoclaw-web-clipper** (web clipper): save any webpage as clean local Markdown — dual-engine extraction (readability + trafilatura fallback), Chinese-safe filenames, batch + dedup. <https://github.com/dtsola/xiaoyaoclaw-web-clipper>
- 🤝 **xiaoyaoclaw-agent-orchestrator** (agent orchestrator, **collaboration layer**): split tasks, dispatch agents, track progress, aggregate results, retry failures. <https://github.com/dtsola/xiaoyaoclaw-agent-orchestrator>
- 📊 **xiaoyaoclaw-usage-report** (usage report): parse session JSONL to answer "how long did each agent task take, which tools/skills/models, how many tokens" — zero-dep local, token-first. <https://github.com/dtsola/xiaoyaoclaw-usage-report>
- 🎛️ **xiaoyaoclaw-commander** (OpenClaw Cross-Tool Commander, **command layer**): let any Agent Skills tool drive the XiaoyaoClaw/OpenClaw gateway. <https://github.com/dtsola/xiaoyaoclaw-commander>
