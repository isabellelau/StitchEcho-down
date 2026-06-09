import { term } from './js/i18n.js';

// ═══════════════════════════════════════════
//  全能针法库（补全别名 aliases 以修复 forEach 报错）
// ═══════════════════════════════════════════
export const STITCH_LIB = {
  // --- 短针类 (Basic & Variants) ---
  X: { id: "X", label: term('X'), abbr: "X", description: "基础短针", category: "basic", aliases: ["X", "SC", "短针"] },
  V: { id: "V", label: term('V'), abbr: "V", description: "1个针目里钩2个短针", category: "increase", aliases: ["V", "INC", "短针加针", "加针"] },
  A: { id: "A", label: term('A'), abbr: "A", description: "2个针目合并为1个短针", category: "decrease", aliases: ["A", "DEC", "短针减针", "减针"] },
  W: { id: "W", label: term('W'), abbr: "W", description: "1个针目里钩3个短针", category: "increase", aliases: ["W", "短针加加针"] },
  M: { id: "M", label: term('M'), abbr: "M", description: "3个针目合并为1个短针", category: "decrease", aliases: ["M", "短针减减针"] },

  // --- 中长针类 (Half Double Crochet) ---
  T: { id: "T", label: term('T'), abbr: "T", description: "基础中长针", category: "basic", aliases: ["T", "HDC", "中长针"] },
  TV: { id: "TV", label: term('TV'), abbr: "TV", description: "1个针目里钩2个中长针", category: "increase", aliases: ["TV", "HDCINC", "中长针加针"] },
  TA: { id: "TA", label: term('TA'), abbr: "TA", description: "2个针目合并为1个中长针", category: "decrease", aliases: ["TA", "HDCDEC", "中长针减针"] },
  TW: { id: "TW", label: term('TW'), abbr: "TW", description: "1个针目里钩3个中长针", category: "increase", aliases: ["TW", "中长针加加针"] },
  TM: { id: "TM", label: term('TM'), abbr: "TM", description: "3个针目合并为1个中长针", category: "decrease", aliases: ["TM", "中长针减减针"] },

  // --- 长针类 (Double Crochet) ---
  F: { id: "F", label: term('F'), abbr: "F", description: "基础长针", category: "basic", aliases: ["F", "DC", "长针"] },
  FV: { id: "FV", label: term('FV'), abbr: "FV", description: "1个针目里钩2个长针", category: "increase", aliases: ["FV", "DCINC", "长针加针"] },
  FA: { id: "FA", label: term('FA'), abbr: "FA", description: "2个针目合并为1个长针", category: "decrease", aliases: ["FA", "DCDEC", "长针减针"] },
  FW: { id: "FW", label: term('FW'), abbr: "FW", description: "1个针目里钩3个长针", category: "increase", aliases: ["FW", "长针加加针"] },
  FM: { id: "FM", label: term('FM'), abbr: "FM", description: "3个针目合并为1个长针", category: "decrease", aliases: ["FM", "长针减减针"] },

  // --- 长长针类 (Treble Crochet) ---
  E: { id: "E", label: term('E'), abbr: "E", description: "基础长长针", category: "basic", aliases: ["E", "TR", "长长针"] },
  EV: { id: "EV", label: term('EV'), abbr: "EV", description: "1个针目里钩2个长长针", category: "increase", aliases: ["EV", "TRINC", "长长针加针"] },
  EA: { id: "EA", label: term('EA'), abbr: "EA", description: "2个针目合并为1个长长针", category: "decrease", aliases: ["EA", "TRDEC", "长长针减针"] },

  // --- 基础功能 (Utility) ---
  CH: { id: "CH", label: term('CH'), abbr: "CH", description: "基础锁针", category: "basic", aliases: ["CH", "锁针", "辫子针"] },
  SL: { id: "SL", label: term('SL'), abbr: "SL", description: "引拔连接", category: "basic", aliases: ["SL", "引拔", "引拔针"] },
  SK: { id: "SK", label: term('SK'), abbr: "SK", description: "跳过不钩", category: "basic", aliases: ["SK", "空针", "SKIP", "K"] },

  // --- 特殊/针目构造 (Specialty) ---
  G: { id: "G", label: term('G'), abbr: "G", description: "5针长针的爆米花", category: "special", aliases: ["G", "爆米花针"] },
  Q: { id: "Q", label: term('Q'), abbr: "Q", description: "3针中长针的未完成针", category: "special", aliases: ["Q", "枣形针", "枣针"] },
};

// 旧系统 id → 新缩写 id（数据迁移专用）
export const OLD_ID_MAP = {
  sc: "X", sc_inc: "V", sc_dec: "A",
  dc: "F", hdc: "T", chain: "CH"
};

// 别名反向查找表：别名（大写）→ 缩写 id
export const ALIAS_TO_ID = {};
Object.entries(STITCH_LIB).forEach(([id, s]) => {
  s.aliases.forEach(a => ALIAS_TO_ID[a.toUpperCase()] = id);
  ALIAS_TO_ID[id.toUpperCase()] = id;
});

// 主题色彩 — morandi 按动作功能配色
export const COLOR_THEMES = {
  morandi: {
    X: "#C4A882", T: "#C49A6C", F: "#B07050", E: "#8C5C3E",
    V: "#F4A460", W: "#E07B3E", TV: "#FFB88C", TW: "#D9703A",
    FV: "#FFCC99", FW: "#CC7740", EV: "#FF9F5C",
    A: "#9B8EC4", M: "#7B6DA8", TA: "#B5ABD8", TM: "#66578D",
    FA: "#C8BFE8", FM: "#8A7DBF", EA: "#A89AD0",
    CH: "#9B8E7E", SL: "#B8A99A", SK: "#D4CBC0",
    G: "#E0705C", Q: "#8B5E7D"
  }
};

// ── 兼容层：现有 UI 仍依赖 STITCHES 数组和 SM 对象 ──
export const STITCHES = Object.values(STITCH_LIB).map(s => ({
  id: s.id,
  label: s.label,
  abbr: s.abbr,
  color: COLOR_THEMES.morandi[s.id] || "#ccc"
}));
export const SM = Object.fromEntries(STITCHES.map(s => [s.id, s]));

// ═══════════════════════════════════════════
//  Token 正则 — 从 STITCH_LIB 动态构建（长优先防截断）
// ═══════════════════════════════════════════

const STITCH_IDS = Object.keys(STITCH_LIB).sort((a, b) => b.length - a.length);

function buildTokenRE(ids) {
  // 永久包含复合针法占位符 _C\d+[A-Z]+，避免 extractStitches 运行时 patch source
  return new RegExp(`\\b(\\d*)\\s*(${ids.join('|')}|_C\\d+[A-Z]+)(?![a-zA-Z])`, 'gi');
}

let _tokenRE = buildTokenRE(STITCH_IDS);
let _onBeforeExtract = null;

export function setOnBeforeExtract(fn) { _onBeforeExtract = fn; }
export function getTokenRE() { return _tokenRE; }
export function setTokenRE(re) { _tokenRE = re; }
export { STITCH_IDS };

// ═══════════════════════════════════════════
//  图解解析引擎（纯函数，无副作用）
// ═══════════════════════════════════════════

const ROUND_PREFIX_RE = /^(?:R|Round|第)?\s*(\d+)\s*[:：.]?\s*(.*)/i;

// 说明性前缀词 — 这些词引导的片段是注释而非针法指令，解析时需跳过
const SKIP_PREFIXES = [
  '当作', '相当于', '代替', '作为', '视为', '等于', '即',
  'work as', 'treat as', 'count as', 'same as',
  'instead of', 'equivalent to', 'acts as'
];

/**
 * 展开行内括号重复：将 (X,2K)×3 展开为 X, 2K, X, 2K, X, 2K
 * 使用深度追踪匹配最外层括号组；内部 (NF) / [NF] 视为复合针法 token 保留不展开
 * @param {string} line
 * @returns {string}
 */
export function expandRepeatGroups(line) {
  let result = '';
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '(' || ch === '[') {
      const openBracket = ch;
      const closeBracket = ch === '(' ? ')' : ']';
      let depth = 1;
      let j = i + 1;

      while (j < line.length && depth > 0) {
        if (line[j] === openBracket) depth++;
        else if (line[j] === closeBracket) depth--;
        j++;
      }

      if (depth !== 0) {
        // 括号不闭合 — 原样输出当前字符并继续
        result += ch;
        i++;
        continue;
      }

      const inner = line.substring(i + 1, j - 1);
      const after = line.substring(j);

      // 检查是否后跟重复运算符 × / x / X / * / 乘
      const repeatMatch = after.match(/^\s*[×*xX乘]\s*(\d+)/);
      if (repeatMatch) {
        const times = parseInt(repeatMatch[1], 10);
        const trimmed = inner.trim();

        // 单 token 复合针法 (如 5F) — 按 times 展开为多个簇
        if (/^\d+[A-Z]+$/i.test(trimmed) && !/[,，]/.test(trimmed)) {
          const compoundToken = line.substring(i, j); // "(5F)"
          result += Array(times).fill(compoundToken).join(', ');
          i = j + repeatMatch[0].length;
          continue;
        }

        if (times > 0 && times <= 200) {
          const tokens = trimmed.split(/[,，]/).map(t => t.trim()).filter(Boolean);
          if (tokens.length > 0) {
            result += Array(times).fill(tokens.join(', ')).join(', ');
            i = j + repeatMatch[0].length;
            continue;
          }
        }
      }

      // 不是重复组 — 原样输出
      result += line.substring(i, j);
      i = j;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

/**
 * 解析批量图解文本
 * @param {string} text - 用户粘贴的多行图解
 * @returns {Array<{type:'round'|'text', roundNum:number|null, instruction:string, seq:string[], raw:string}>}
 */
export function parsePattern(text) {
  // 预处理：括号感知合并 — 括号未闭合前不切行
  const rawLines = text.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
  const merged = [];
  let buf = '';
  let depth = 0;

  for (const line of rawLines) {
    // 累加当前行（首个片段直接赋值，后续用空格连接）
    buf = buf ? buf + ' ' + line : line;

    for (const ch of line) {
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
    }

    if (depth === 0) {
      merged.push(buf);
      buf = '';
    }
  }

  // 容错：括号永远不闭合，强制结束当前逻辑行
  if (buf) merged.push(buf);

  const lines = merged;
  const results = [];

  lines.forEach((raw, lineIdx) => {
    // 0) 预处理：展开行内括号重复
    raw = expandRepeatGroups(raw);

    // 1) 标准单圈前缀：R1: / Round 1: / 1.
    const match = raw.match(ROUND_PREFIX_RE);
    if (match) {
      const [, numStr, content] = match;
      const seq = extractStitches(content);
      results.push({
        type: "round",
        roundNum: parseInt(numStr, 10),
        instruction: `R${numStr}: ${content}`,
        seq,
        raw
      });
      const remarks = extractRemarks(content);
      if (remarks.length > 0) {
        results.push({
          type: "text",
          roundNum: null,
          isTextCard: true,
          instruction: remarks.join('；'),
          seq: [],
          raw: content,
          source: 'auto'
        });
      }
      return;
    }

    // 2) 范围圈前缀：R7-11: / R7~11: / 第7-11圈：
    const rangeMatch = raw.match(/^(?:R|Round|第)?\s*(\d+)\s*[\-~—－]\s*[Rr]?\s*(\d+)\s*[:：.]?\s*(.*)/i);
    if (rangeMatch) {
      const [, startStr, endStr, content] = rangeMatch;
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      const seq = extractStitches(content);
      for (let i = start; i <= end; i++) {
        results.push({
          type: "round",
          roundNum: i,
          instruction: `R${start}-${end}: ${content}`,
          seq,
          raw
        });
      }
      const remarks = extractRemarks(content);
      if (remarks.length > 0) {
        results.push({
          type: "text",
          roundNum: null,
          isTextCard: true,
          instruction: remarks.join('；'),
          seq: [],
          raw: content,
          source: 'auto'
        });
      }
      return;
    }

    // 3) 起针行：第一行无 R 前缀但包含针法（如"起20CH""环起6X"）
    if (lineIdx === 0) {
      const seq = extractStitches(raw);
      if (seq.length > 0) {
        results.push({
          type: "round",
          roundNum: 0,
          instruction: `${term('cast_on')}: ${raw}`,
          seq,
          raw
        });
        const remarks = extractRemarks(raw);
        if (remarks.length > 0) {
          results.push({
            type: "text",
            roundNum: null,
            isTextCard: true,
            instruction: remarks.join('；'),
            seq: [],
            raw,
            source: 'auto'
          });
        }
        return;
      }
    }

    // 4) 循环标记：循环R2-R3 / repeat R2-R3 / 重复第2-3圈
    const loopRe = /(?:一直\s*)?(循环|重复|loop|repeat)\s*(?:第\s*)?R?(\d+)\s*(?:圈)?\s*[-~—至到]\s*(?:第\s*)?R?(\d+)\s*(?:圈)?/i;
    const loopMatch = raw.match(loopRe);
    if (loopMatch) {
      results.push({
        type: "round",
        roundNum: null,
        isLoopMarker: true,
        loopFrom: parseInt(loopMatch[2], 10),
        loopTo: parseInt(loopMatch[3], 10),
        instruction: raw,
        seq: [],
        raw
      });
      return;
    }

    // 5) 无明显前缀 → 文本卡片保留
    results.push({
      type: "text",
      roundNum: null,
      instruction: raw,
      seq: [],
      raw
    });
  });

  return results;
}

/**
 * 从单条图解文字中提取针法缩写序列
 * @param {string} text
 * @returns {string[]} 归一化后的针法 id 数组
 */
export function extractStitches(text) {
  if (_onBeforeExtract) _onBeforeExtract();

  // 展开括号重复：(X,2K)×3 → X, 2K, X, 2K, X, 2K
  text = expandRepeatGroups(text);

  // 移除说明性前缀片段（如"当作1个长针"），避免别名误解析为针法指令
  let cleaned = text;
  for (const prefix of SKIP_PREFIXES) {
    cleaned = cleaned.replace(
      new RegExp(prefix + '[^，,。\\.\\n]+', 'gi'),
      ' '
    );
  }

  // 预处理：将中英文别名替换为缩写，使后续正则能识别
  // 例："引拔" → "SL", "SC" → "X", "HDCINC" → "TV"
  let processed = cleaned;
  const allAliases = Object.entries(ALIAS_TO_ID)
    .filter(([a, id]) => a.toUpperCase() !== id.toUpperCase())
    .sort((a, b) => b[0].length - a[0].length);
  for (const [alias, id] of allAliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isAscii = /^[a-zA-Z0-9]+$/.test(alias);
    const b = isAscii ? '\\b' : '';

    // 前置数字："6CH" "3inc" → "6CH" "3V"
    processed = processed.replace(new RegExp(`${b}(\\d*)${escaped}${b}`, 'gi'), (_, num) => (num || '1') + id);
    // 后置数字："K2" "CH3" → "2SK" "3CH"
    processed = processed.replace(new RegExp(`${b}${escaped}(\\d+)${b}`, 'gi'), (_, num) => num + id);
  }

  // 保护复合针法：(5F) → _C5F，防止被后续正则以 \b 拆分为 5×F
  // 前置数字也保护：3(5F) → 3 _C5F，正则匹配为 3×_C5F → push 3 次 (5F)
  const compoundIds = new Set();
  processed = processed.replace(/(\d*)\s*[\(\[](\d+[A-Z]+)[\)\]]/gi, (_, prefix, inner) => {
    const compoundId = '_C' + inner.toUpperCase();
    compoundIds.add(compoundId);
    ALIAS_TO_ID[compoundId] = compoundId; // 注册供 normalizeStitch 使用
    return (prefix || '') + ' ' + compoundId;
  });

  // 用动态 token 正则匹配针法（已永久包含 _C\d+[A-Z]+ 复合针法占位符）
  const re = getTokenRE();

  const result = [];
  let m;
  while ((m = re.exec(processed)) !== null) {
    // 检查 token 前是否为技法说明（3+ 连续中文字符紧接 token）
    const prevChar = processed[m.index - 1] || '';
    const prevPrevChar = processed[m.index - 2] || '';
    const prevPrevPrevChar = processed[m.index - 3] || '';
    const isChinese = (ch) => ch >= '一' && ch <= '鿿';
    if (isChinese(prevChar) && isChinese(prevPrevChar) && isChinese(prevPrevPrevChar)) {
      // 尝试提取嵌入的数字+针法组合（如"倒二钩13F"→13×F）
      const embedded = m[0].match(/(\d+)([A-Z]+)/i);
      if (embedded) {
        const embCount = parseInt(embedded[1], 10);
        const embSid = embedded[2].toUpperCase();
        const embId = normalizeStitch(embSid);
        if (embId) {
          for (let i = 0; i < embCount; i++) result.push(embId);
        }
      }
      continue;
    }

    const count = m[1] ? parseInt(m[1], 10) : 1;
    let id = m[2];
    if (id.startsWith('_C')) {
      const cm = id.match(/_C(\d+)([A-Z]+)/);
      if (cm) {
        const innerSid = cm[2].toUpperCase();
        const innerCount = parseInt(cm[1], 10);
        const cluster = {
          type: 'cluster',
          stitches: Array(innerCount).fill(innerSid),
          raw: `(${innerCount}${innerSid})`
        };
        for (let i = 0; i < count; i++) result.push(cluster);
      }
    } else {
      id = normalizeStitch(id);
      if (id) {
        for (let i = 0; i < count; i++) result.push(id);
      }
    }
  }
  return result;
}

/**
 * 从文字中提取纯文本备注片段（不含针法 token，不含数字，长度 > 2 的中文）
 * @param {string} text
 * @returns {string[]}
 */
function extractRemarks(text) {
  const remarks = [];
  if (!text) return remarks;

  // 收集原始文本中所有针法 token 的位置，从右向左空白化（避免索引偏移）
  const re = getTokenRE();
  const tokenSpans = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    tokenSpans.push({ start: m.index, end: m.index + m[0].length });
  }

  let cleaned = text;
  for (let i = tokenSpans.length - 1; i >= 0; i--) {
    const { start, end } = tokenSpans[i];
    cleaned = cleaned.substring(0, start) + ' '.repeat(end - start) + cleaned.substring(end);
  }

  // 清除数字和括号计数
  cleaned = cleaned.replace(/\(\d+\)/g, s => ' '.repeat(s.length));
  cleaned = cleaned.replace(/\b\d+\b/g, s => ' '.repeat(s.length));

  // 按分隔符切分
  const fragments = cleaned.split(/[,，、。；\s:：.·*×\-—+()（）]+/).filter(s => s.trim());

  for (const frag of fragments) {
    const trimmed = frag.trim();
    const hasDigit = /\d/.test(trimmed);
    const chineseChars = (trimmed.match(/[一-鿿]/g) || []);

    // 必须无数字、≥2 个中文字符、中文占比 ≥60%
    if (hasDigit || chineseChars.length < 2 || chineseChars.length / trimmed.length < 0.6) {
      continue;
    }

    // 在原始文本中定位，检查是否紧跟针法 token（无分隔符）→ 技法说明
    const pos = text.indexOf(trimmed);
    if (pos === -1) continue;
    const after = text.substring(pos + trimmed.length);
    if (/^\s*\d*[A-Za-z]/.test(after) && !/^\s*[,，、。；\s:：.·*×\-—+()（）]/.test(after)) {
      continue;
    }

    remarks.push(trimmed);
  }

  return remarks;
}

/**
 * 将单个 token 归一化为 STITCH_LIB 的 id
 * 支持复合针法：(5F) → 返回 "(5F)" 作为 id
 * @param {string} token - 如 "1X", "V", "2CH", "(5F)"
 * @returns {string|null}
 */
export function normalizeStitch(token) {
  // 复合针法占位符：_C5F → cluster 对象
  const compoundPlaceholder = token.match(/^_C(\d+)([A-Z]+)$/i);
  if (compoundPlaceholder) {
    const count = parseInt(compoundPlaceholder[1], 10);
    const innerSid = compoundPlaceholder[2].toUpperCase();
    const resolved = ALIAS_TO_ID[innerSid];
    if (!resolved) return null;
    return {
      type: 'cluster',
      stitches: Array(count).fill(resolved),
      raw: `(${count}${resolved})`
    };
  }

  // 复合针法直接格式：(5F), [5F], (3X) 等
  const compoundMatch = token.match(/^[\(\[](\d+)([A-Z]+)[\)\]]$/i);
  if (compoundMatch) {
    const count = parseInt(compoundMatch[1], 10);
    const innerSid = compoundMatch[2].toUpperCase();
    const resolved = ALIAS_TO_ID[innerSid];
    if (!resolved) return null;
    return {
      type: 'cluster',
      stitches: Array(count).fill(resolved),
      raw: `(${count}${resolved})`
    };
  }

  // 去掉头尾数字，得到纯字母核心
  const core = token.replace(/^\d+|\d+$/g, "").toUpperCase();
  return ALIAS_TO_ID[core] || null;
}

/**
 * 解析针法颜色
 * @param {string} id - 针法缩写 id
 * @param {object} settings - 全局设置
 * @returns {string} CSS 颜色值
 */
export function resolveColor(id, settings) {
  if (!id) return "#ccc";
  // 全局针法自定义颜色（最高优先级）
  if (settings?.globalStitchCustomizations?.colors?.[id]) return settings.globalStitchCustomizations.colors[id];
  // 旧全局自定义颜色（向后兼容）
  if (settings?.customColors?.[id]) return settings.customColors[id];
  // 全局自定义针法的默认颜色
  if (settings?.globalCustomStitches?.[id]?.color) return settings.globalCustomStitches[id].color;
  // 主题默认色
  const themeKey = settings?.theme || "morandi";
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.morandi;
  return theme[id] || "#ccc";
}
