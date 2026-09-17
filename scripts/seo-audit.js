#!/usr/bin/env node
/**
 * seo-audit.js — 轻量技术 SEO 快检脚本（零依赖，Node 18+，仅用内置 fetch/dns/net）
 *
 * 用法：
 *   node seo-audit.js <domain> [more-domains...]
 *   例：node seo-audit.js dtsola.com landoo.me project.xiaoyaosai.com
 *
 * 检查项：
 *   1. 裸域 DNS A 记录（无 A → 🔴）
 *   2. http:// 是否 301 → https（200 并存 → 🔴 重复内容）
 *   3. www/裸域 跳转归一（都 200 → 🟠）
 *   4. robots.txt / sitemap.xml / llms.txt 真实性（⚠️ HTML fallback 检测）
 *   5. 首页 title / meta description / canonical / H1 数量 / JSON-LD / viewport / lang
 *
 * 输出：按 🔴🟠🟡 分级的控制台报告。注意：schema 检测是静态的，
 *   JS 注入的 JSON-LD 检测不到 —— 需浏览器渲染复核（见 references/schema.md）。
 *
 * 语言 / Language：本脚本的用法说明与输出默认中文，可改为英文或其他语言
 *   （output language is your choice, not a constraint）。文案都在下方字符串里，
 *   按需替换即可。
 *
 * 网络与安全边界（本脚本只读，不写入任何站点或本地状态）：
 *   - 只访问命令行显式给出的目标主机，且必须是 **公网** 地址：
 *     解析结果命中回环 / 私有网段 / 链路本地（含云厂商元数据服务地址）/
 *     CGNAT / 保留段 / IPv6 ULA 时直接拒绝，不做任何请求。
 *   - **校验点在建连那一刻，不只在请求前**：预检 `assertPublicTarget()` 负责快速
 *     失败与友好报错；真正的强制点是 `net.connect` 的 lookup 回调
 *     （`connectGuardedLookup()`）—— 每次建立 TCP 连接都重新解析并逐个检查将要
 *     使用的地址，命中内网段即失败。这样就没有"先校验后连接"的时间差可利用
 *     （DNS 重绑定 TOCTOU）。
 *   - **只允许 80/443 端口**，不做端口扫描。
 *   - 重定向不自动跟随（`redirect: 'manual'`），每一跳都重跑上面两层校验，
 *     最多 3 跳 —— 防止公网站点把请求重定向到内网地址。
 *   - 响应体有字节上限（HTML 1 MB / 文本 256 KB，按**解压后**计），
 *     超限即中止读取，避免恶意大响应把进程内存吃满。
 *   - 只发 GET；不带 cookie jar、不带 Authorization、不携带任何凭据，UA 固定。
 *   - 从远端内容里取出的任何字符串（title / description / canonical / lang /
 *     JSON-LD 类型 / 跳转目标…）在打印前都会剥掉控制字符与 ANSI/OSC 转义序列
 *     （终端注入防护），并截断长度。
 *   - 单次运行最多 10 个域名，防止批量探测拖垮本机。
 *   - **明确不做**：不写文件、不改远端内容、不登录、不提交表单、不发 POST、
 *     不探测端口、不访问非 http(s) 协议、不把抓到的内容外发到任何第三方。
 *
 * 退出码：0 = 正常完成（无论发现多少问题）；非 0 = 脚本自身错误。
 */
'use strict';

const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const zlib = require('node:zlib');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 限额（安全边界，见文件头说明） --------------------------------------
const MAX_DOMAINS = 10;
const MAX_BYTES_HTML = 1024 * 1024;      // 1 MB
const MAX_BYTES_TEXT = 256 * 1024;       // 256 KB
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10000;
// 只允许公网站点的标准端口，杜绝把本脚本当成端口扫描器用
const ALLOWED_PORTS = new Set([80, 443]);

/** 终端安全化：剥掉 ANSI/OSC 转义与控制字符，压缩空白，截断长度。
 *  远端页面可以把 title / meta 写成带转义序列的内容，直接打印会伪装审计输出。 */
function safe(value, max = 200) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')   // OSC ... BEL/ST
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')                   // CSI ... final
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, ' ')    // C0/C1（保留 \t \n）
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (s.length > max) s = s.slice(0, max) + '…';
  return s;
}

/** 该 IP 是否属于内网 / 保留 / 元数据段 —— 命中即拒绝访问。 */
function isBlockedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;              // 本网络/私有/回环
    if (a === 169 && b === 254) return true;                        // 链路本地 + 云元数据
    if (a === 172 && b >= 16 && b <= 31) return true;               // 私有
    if (a === 192 && b === 168) return true;                        // 私有
    if (a === 100 && b >= 64 && b <= 127) return true;              // CGNAT
    if (a === 192 && b === 0) return true;                          // 保留/测试
    if (a === 198 && (b === 18 || b === 19)) return true;           // 基准测试
    if (a >= 224) return true;                                      // 组播 + 保留
    return false;
  }
  if (version === 6) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;                     // 未指定 / 回环
    if (v.startsWith('::ffff:')) return isBlockedIp(v.slice(7));    // IPv4 映射
    if (v.startsWith('fe80')) return true;                          // 链路本地
    if (v.startsWith('fc') || v.startsWith('fd')) return true;      // ULA
    if (v.startsWith('ff')) return true;                            // 组播
    return false;
  }
  return true; // 非 IP：此处按"拒绝"处理，域名由 assertPublicTarget 解析后再判
}

/** 目标校验：仅 http/https、无凭据、解析结果必须全部是公网地址。 */
async function assertPublicTarget(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error(`非法 URL：${urlStr}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`仅允许 http/https：${url.protocol}`);
  }
  if (url.username || url.password) throw new Error('URL 不得内嵌凭据');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new Error(`目标为内网/保留地址，已拒绝：${host}`);
    return url;
  }
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch (e) {
    throw new Error(`DNS 解析失败：${host}`);
  }
  const blocked = addrs.filter((a) => isBlockedIp(a.address));
  if (blocked.length) {
    throw new Error(`目标解析到内网/保留地址，已拒绝：${host} -> ${blocked.map((a) => a.address).join(', ')}`);
  }
  return url;
}

/** 连接时地址过滤（把安全边界放到真正建立 TCP 连接的那一刻）。
 *
 *  `assertPublicTarget()` 是预检：提前把明显的坏目标挡掉，给出友好报错。
 *  但它有经典 TOCTOU 缺口 —— 校验用的 DNS 结果和随后实际连接的地址可能是
 *  两次不同的解析（DNS 重绑定）。所以真正的强制点在 net.connect 的 lookup
 *  回调里：**每次建连都重新解析并逐个检查将要使用的地址**，命中内网/保留段
 *  就直接让连接失败，绝不回退到"先连上再说"。
 */
function connectGuardedLookup() {
  return (hostname, options, callback) => {
    dns
      .lookup(hostname, { all: true, verbatim: true })
      .then((addrs) => {
        const allowed = addrs.filter((a) => !isBlockedIp(a.address));
        if (!allowed.length) {
          callback(new Error(`拒绝连接：${hostname} 解析到的地址全部属于内网/保留段`));
          return;
        }
        if (options && options.all) {
          callback(null, allowed);
          return;
        }
        callback(null, allowed[0].address, allowed[0].family);
      })
      .catch((err) => callback(err));
  };
}

/** 读响应体：按 Content-Encoding 解压，流式累计并按**解压后**大小设上限。 */
function readBodyCapped(res, maxBytes) {
  return new Promise((resolve) => {
    const declared = Number(res.headers['content-length'] || 0);
    // 压缩体的声明长度只能松判（解压后才是真正的内存占用），真正的硬闸在下面的计数器
    if (declared && declared > maxBytes * 4) {
      res.destroy();
      resolve({ text: null, error: `响应体声明 ${declared} 字节，超过上限 ${maxBytes}` });
      return;
    }
    const encoding = String(res.headers['content-encoding'] || '').toLowerCase();
    let stream = res;
    if (encoding.includes('gzip')) stream = res.pipe(zlib.createGunzip());
    else if (encoding.includes('deflate')) stream = res.pipe(zlib.createInflate());
    else if (encoding.includes('br')) stream = res.pipe(zlib.createBrotliDecompress());

    const chunks = [];
    let total = 0;
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };
    stream.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        res.destroy();
        stream.destroy();
        finish({ text: null, error: `响应体超过上限 ${maxBytes} 字节，已中止读取` });
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => finish({ text: Buffer.concat(chunks).toString('utf8'), error: null }));
    stream.on('error', (e) => finish({ text: null, error: safe(e.message, 120) }));
  });
}

/** 单次 GET：手动重定向语义（本函数不跟跳），连接时过地址过滤。
 *
 *  约束：只 http/https、只 80/443、无 cookie jar、无 Authorization、无代理透传、
 *  UA 固定、超时硬上限；bodyWanted=false 时拿到响应头就断开（不下载正文）。
 */
async function httpGetOnce(urlStr, { maxBytes, bodyWanted }) {
  let url;
  try {
    url = await assertPublicTarget(urlStr);
  } catch (e) {
    return { status: null, location: null, ct: '', text: '', error: e.message };
  }
  if (url.port && !ALLOWED_PORTS.has(Number(url.port))) {
    return { status: null, location: null, ct: '', text: '', error: `仅允许 80/443 端口，已拒绝：${url.port}` };
  }
  const mod = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };
    let req;
    try {
      req = mod.request(
        url,
        {
          method: 'GET',
          lookup: connectGuardedLookup(),                 // ★ 真正的边界：建连时校验实际地址
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            'user-agent': UA,
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
            'accept-encoding': 'gzip, deflate, br',
            // 不发送任何凭据：不带 cookie、不带 authorization
          },
        },
        (res) => {
          const ct = String(res.headers['content-type'] || '').slice(0, 60);
          const location = res.headers.location || null;
          if (!bodyWanted || (res.statusCode >= 300 && res.statusCode < 400) || res.statusCode >= 400) {
            res.resume();                                  // 丢弃正文，立刻收尾
            finish({ status: res.statusCode, location, ct, text: '', error: null });
            return;
          }
          readBodyCapped(res, maxBytes).then(({ text, error }) =>
            finish({ status: res.statusCode, location, ct, text: text || '', error })
          );
        }
      );
    } catch (e) {
      finish({ status: null, location: null, ct: '', text: '', error: safe(e.message, 120) });
      return;
    }
    req.on('error', (e) => finish({ status: null, location: null, ct: '', text: '', error: safe(e.message, 120) }));
    req.end();
  });
}

/** 只探响应头（不下载正文）：手动重定向，用来判 301/308 与 location。 */
async function probe(urlStr) {
  const r = await httpGetOnce(urlStr, { maxBytes: 0, bodyWanted: false });
  return {
    url: urlStr,
    status: r.status,
    location: r.location,
    ct: r.ct,
    error: r.error || undefined,
  };
}

/** 取文本：手动重定向（每跳都过公网校验 + 连接时再校验），带上限读取。 */
async function getText(urlStr, { maxBytes = MAX_BYTES_TEXT } = {}) {
  let current = urlStr;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await httpGetOnce(current, { maxBytes, bodyWanted: true });
    if (res.error) {
      return { ok: false, status: res.status, error: res.error, text: '', ct: res.ct, location: res.location };
    }
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) {
        return { ok: false, status: res.status, error: null, text: '', ct: res.ct, location: null };
      }
      if (hop === MAX_REDIRECTS) {
        return {
          ok: false, status: res.status, location: res.location, ct: res.ct, text: '',
          error: `重定向超过 ${MAX_REDIRECTS} 跳，已停止`,
        };
      }
      current = new URL(res.location, new URL(current)).toString();
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      return { ok: false, status: res.status, error: null, text: '', ct: res.ct, location: res.location };
    }
    return { ok: true, status: res.status, error: null, text: res.text, ct: res.ct, location: res.location };
  }
  return { ok: false, status: null, error: '重定向未收敛', text: '', ct: '', location: null };
}

function looksLikeHtml(text) {
  const head = text.slice(0, 300).trim();
  return /^<!DOCTYPE|<html/i.test(head);
}

function extractMeta(html) {
  const out = {};
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  out.title = title ? title[1].trim().slice(0, 200) : null;
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
  out.metaDesc = desc ? desc[1].trim().slice(0, 300) : null;
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  out.h1Count = h1s.length;
  out.h1Samples = h1s.slice(0, 3);
  const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
  out.h2Count = h2Count;
  const canon =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([\s\S]*?)["']/i) ||
    html.match(/<link[^>]+href=["']([\s\S]*?)["'][^>]+rel=["']canonical["']/i);
  out.canonical = canon ? canon[1] : null;
  out.viewport = /name=["']viewport["']/i.test(html);
  out.lang = (html.match(/<html[^>]+lang=["']([\s\S]*?)["']/i) || [])[1] || null;
  const jsonld = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  out.jsonldCount = jsonld.length;
  out.jsonldTypes = [];
  for (const m of jsonld) {
    try {
      const j = JSON.parse(m[1]);
      const types = Array.isArray(j['@type']) ? j['@type'] : [j['@type']];
      out.jsonldTypes.push(...types.filter(Boolean));
    } catch {
      out.jsonldTypes.push('(parse error)');
    }
  }
  out.robotsMeta = (html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i) || [])[1] || null;
  return out;
}

async function checkDomain(domain) {
  console.log(`\n========== ${domain} ==========`);
  const issues = { red: [], orange: [], yellow: [] };

  // 0. 确定实际可访问的 host（裸域无 DNS 时 fallback 到 www）
  let baseHost = domain;
  const isWwwInput = domain.startsWith('www.');
  const bareDomain = isWwwInput ? domain.slice(4) : domain;

  // 1. 裸域 DNS A 记录
  let bareHasA = false;
  try {
    const recs = await dns.resolve4(bareDomain);
    bareHasA = true;
    console.log(`[dns] ${bareDomain} A 记录: ${safe(recs.join(', '), 200)}`);
    issues.yellow.push('裸域有 A 记录，但请确认裸域是否 301 到 www（版本归一）');
  } catch {
    console.log(`[dns] ${bareDomain} ❌ 无 A 记录（只有 www 可访问?）`);
    issues.red.push('裸域无 DNS A 记录：用户输入不带 www 域名打不开，外链若用裸域全失效 → DNS 控制台加 A 记录并 301 归一');
  }

  // 2. http → https（对规范主机探测；若输入是裸域且无 DNS，用 www 探测并注明）
  const httpHost = (!bareHasA && !isWwwInput) ? `www.${bareDomain}` : domain;
  if (httpHost !== domain) console.log(`[note] 裸域无 DNS，后续检查 fallback 到 ${httpHost}`);
  const httpProbe = await probe(`http://${httpHost}/`);
  if (httpProbe.error) {
    console.log(`[http] http://${httpHost} ERROR ${safe(httpProbe.error, 120)}`);
  } else if (httpProbe.status === 301 || httpProbe.status === 308) {
    console.log(`[http] http://${httpHost} -> ${httpProbe.status} → ${safe(httpProbe.location, 200)}`);
    issues.yellow.push('http 已 301，确认目标是 https 规范版本');
  } else if (httpProbe.status === 200) {
    console.log(`[http] http://${httpHost} -> 200 ⚠️ http/https 并存无跳转`);
    issues.red.push('http:// 返回 200 未 301 到 https：重复内容权重分散 + 明文传输 → 服务器/CDN 配 http→https 301');
  } else {
    console.log(`[http] http://${httpHost} -> ${httpProbe.status}${httpProbe.location ? ' → ' + safe(httpProbe.location, 200) : ''}`);
  }

  // 3. www/裸域 版本归一探测（仅对裸域或 www 域名有意义；多级子域如 project.example.com 跳过）
  const isSubdomain = domain.split('.').length > 2 && !isWwwInput;
  if (isSubdomain) {
    console.log(`[www] ${domain} 是多级子域，跳过 www/裸域归一探测（子域站点无此问题）`);
  } else {
  const other = isWwwInput ? bareDomain : `www.${bareDomain}`;
  const wwwProbe = await probe(`https://${other}/`);
  if (wwwProbe.error) {
    console.log(`[www] https://${other} ERROR ${safe(wwwProbe.error, 120)}`);
  } else if (wwwProbe.status === 301 || wwwProbe.status === 308) {
    console.log(`[www] https://${other} -> ${wwwProbe.status} → ${safe(wwwProbe.location, 200)}`);
  } else if (wwwProbe.status === 200) {
    // 输入版本本身可访问（200）且另一版本也 200 → 真双版本问题；输入版本不可访问时，另一版本 200 属正常 fallback
    const inputProbe = await probe(`https://${domain}/`);
    const inputOk = !inputProbe.error && (inputProbe.status === 200);
    if (inputOk) {
      console.log(`[www] https://${other} -> 200 ⚠️ ${isWwwInput ? '裸域' : 'www'}版本也可访问`);
      issues.orange.push(`https://${other} 返回 200 未跳转：${isWwwInput ? '裸域' : 'www'}与 ${domain} 双版本并存 → 统一 301 到 canonical 版本`);
    } else {
      console.log(`[www] https://${other} -> 200（${domain} 不可访问，${other} 为可访问版本）`);
    }
  } else {
    console.log(`[www] https://${other} -> ${wwwProbe.status}`);
  }
  }

  // 4. 关键文件真实性（robots / sitemap / llms.txt）
  for (const f of ['/robots.txt', '/sitemap.xml', '/llms.txt']) {
    const r = await getText(`https://${httpHost}${f}`);
    if (!r.ok) {
      console.log(`[file] ${f} -> ${r.status || safe(r.error, 120)}${r.status === 404 ? '（不存在）' : ''}`);
      if (f === '/robots.txt' && r.status === 404) issues.orange.push('robots.txt 404：无法控制抓取与 AI bot 策略 → 补真实 robots.txt');
      if (f === '/sitemap.xml' && r.status === 404) issues.red.push('sitemap.xml 404：收录全靠爬虫自己发现，新页收录慢 → 生成真实 sitemap 并提交站长平台');
    } else {
      const isHtml = looksLikeHtml(r.text);
      const isPlain = r.ct.includes('text/plain') || r.ct.includes('application/xml') || r.ct.includes('text/xml');
      if (isHtml || (!isPlain && f !== '/robots.txt' && f !== '/sitemap.xml')) {
        console.log(`[file] ${f} -> 200 ct=${safe(r.ct, 60)} ⚠️ HTML fallback（非真实文件）`);
        if (f === '/robots.txt') issues.orange.push('robots.txt 返回 HTML fallback（文件不存在）：无法控制抓取 → 站点根放真实文本文件');
        if (f === '/sitemap.xml') issues.red.push('sitemap.xml 返回 HTML fallback（文件不存在）→ 生成真实 XML sitemap');
        if (f === '/llms.txt') issues.yellow.push('llms.txt 返回 HTML fallback：AI 可读入口缺失 → 补真实 llms.txt（AI 引用红利）');
      } else {
        console.log(`[file] ${f} -> 200 ct=${safe(r.ct, 60)} ✅ 真实文件（${r.text.length} 字符）`);
        if (f === '/robots.txt') {
          const hasSitemap = /sitemap:/i.test(r.text);
          // 全站屏蔽判定：Disallow: / 独占一行（路径仅 "/" 后跟空白/注释/行尾），排除 /console 这类子路径
          const blockedAll = /^\s*disallow:\s*\/\s*(#.*)?$/gim.test(r.text);
          console.log(`       sitemap 引用: ${hasSitemap ? '✅' : '⚠️ 无'} | 全站屏蔽: ${blockedAll ? '⚠️ 是' : '否'}`);
          if (!hasSitemap) issues.yellow.push('robots.txt 未引用 Sitemap → 加一行 Sitemap: <绝对URL>');
          if (blockedAll) issues.red.push('robots.txt 疑似全站 Disallow: / → 检查是否误屏蔽');
        }
        if (f === '/sitemap.xml') {
          const urlCount = (r.text.match(/<url>/g) || []).length;
          const isIndex = /<sitemapindex/i.test(r.text);
          console.log(`       ${isIndex ? 'sitemap index' : 'URL 数: ' + urlCount}`);
        }
      }
    }
    await timeout(250);
  }

  // 5. 首页关键标签（HTML 用较大的 1 MB 上限；其余远端字符串打印前一律 safe()）
  const home = await getText(`https://${httpHost}/`, { maxBytes: MAX_BYTES_HTML });
  console.log(`[home] https://${httpHost}/ -> ${home.ok ? home.status + ' (' + home.text.length + ' 字符)' : safe(home.error || home.status, 120)}`);
  if (home.ok && !looksLikeHtml(home.text)) {
    console.log('       ⚠️ 首页返回非 HTML（可能是 API/重定向页）');
  } else if (home.ok) {
    const m = extractMeta(home.text);
    console.log(`       title: ${m.title ? safe(m.title) : '❌ 无'}`);
    console.log(`       meta description: ${m.metaDesc ? safe(m.metaDesc, 120) : '❌ 无'}`);
    console.log(`       canonical: ${m.canonical ? safe(m.canonical, 200) : '❌ 无'}`);
    const h1s = m.h1Samples.map((s) => safe(s, 60));
    console.log(`       H1: ${m.h1Count} 个${h1s.length ? ' → ' + JSON.stringify(h1s) : ''} | H2: ${m.h2Count} 个`);
    console.log(`       JSON-LD: ${m.jsonldCount} 个${m.jsonldTypes.length ? ' → ' + m.jsonldTypes.map((t) => safe(t, 40)).join(',') : ''}（⚠️ 静态检测，JS 注入需浏览器复核）`);
    console.log(`       viewport: ${m.viewport ? '✅' : '❌ 无'} | lang: ${m.lang ? safe(m.lang, 20) : '❌ 无'} | robots meta: ${m.robotsMeta ? safe(m.robotsMeta, 60) : '无'}`);
    if (!m.title) issues.red.push('首页无 title');
    else if (m.title.length > 70) issues.yellow.push(`首页 title 过长（${m.title.length} 字符，建议 50-60）`);
    if (!m.metaDesc) issues.orange.push('首页缺 meta description → 补 150-160 字符描述');
    if (!m.canonical) issues.orange.push('首页缺 canonical → 补自引用 canonical（配合 http/https 归一）');
    if (m.h1Count === 0) issues.orange.push('首页无 H1 → 结构信号缺失');
    else if (m.h1Count > 1) issues.orange.push(`首页 ${m.h1Count} 个 H1 → 收敛为 1 个，其余降 H2/H3`);
    if (!m.viewport) issues.orange.push('无 viewport meta → 移动端渲染异常');
    if (!m.lang) issues.yellow.push('html 缺 lang 属性');
    if (m.jsonldCount === 0) issues.yellow.push('静态检测 JSON-LD = 0（JS 注入需浏览器复核；若真无 → 补 Organization/WebSite schema）');
  }

  // 输出分级摘要
  const fmt = (arr, icon) => arr.map((x) => `  ${icon} ${x}`).join('\n');
  console.log('\n--- 分级问题摘要 ---');
  if (!issues.red.length && !issues.orange.length && !issues.yellow.length) {
    console.log('  ✅ 未发现明显问题（静态检查范围内）');
  } else {
    if (issues.red.length) console.log('🔴 高危:\n' + fmt(issues.red, '•'));
    if (issues.orange.length) console.log('🟠 中危:\n' + fmt(issues.orange, '•'));
    if (issues.yellow.length) console.log('🟡 优化:\n' + fmt(issues.yellow, '•'));
  }
}

(async () => {
  const rawDomains = process.argv.slice(2);
  if (!rawDomains.length) {
    console.log('用法: node seo-audit.js <domain> [more-domains...]');
    console.log('例:   node seo-audit.js dtsola.com www.landoo.me project.xiaoyaosai.com');
    process.exit(1);
  }
  if (rawDomains.length > MAX_DOMAINS) {
    console.log(`ERROR: 单次最多 ${MAX_DOMAINS} 个域名（收到 ${rawDomains.length} 个）—— 分批运行，避免批量探测拖垮本机。`);
    process.exit(2);
  }
  // 输入规范化 + 白名单校验：只接受裸主机名，剔除协议/路径/端口/凭据等
  const domains = [];
  for (const raw of rawDomains) {
    const cleaned = safe(raw, 253).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^[^@]*@/, '');
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9.\-]*[a-zA-Z0-9])?$/.test(cleaned)) {
      console.log(`ERROR: 非法域名，已跳过：${safe(raw, 80)}（只接受形如 example.com 的主机名）`);
      process.exit(2);
    }
    // 内网/保留字面量直接拒绝（域名会在每次请求前再解析校验一次）
    if (net.isIP(cleaned) && isBlockedIp(cleaned)) {
      console.log(`ERROR: ${cleaned} 属于内网/保留地址，本脚本只审计公网站点。`);
      process.exit(2);
    }
    domains.push(cleaned);
  }
  for (const d of domains) {
    await checkDomain(d);
    await timeout(300);
  }
  console.log('\nDONE');
})();
