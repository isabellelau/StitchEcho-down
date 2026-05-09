// ═══════════════════════════════════════════
//  全能针法库（补全别名 aliases 以修复 forEach 报错）
// ═══════════════════════════════════════════
export const STITCH_LIB = {
  // --- 短针类 (Basic & Variants) ---
  X: { id: "X", label: "短针", abbr: "X", description: "基础短针", category: "basic", aliases: ["X", "SC", "短针"] },
  V: { id: "V", label: "短针加针", abbr: "V", description: "1个针目里钩2个短针", category: "increase", aliases: ["V", "INC", "短针加针", "加针"] },
  A: { id: "A", label: "短针减针", abbr: "A", description: "2个针目合并为1个短针", category: "decrease", aliases: ["A", "DEC", "短针减针", "减针"] },
  W: { id: "W", label: "短针加加针", abbr: "W", description: "1个针目里钩3个短针", category: "increase", aliases: ["W", "短针加加针"] },
  M: { id: "M", label: "短针减减针", abbr: "M", description: "3个针目合并为1个短针", category: "decrease", aliases: ["M", "短针减减针"] },

  // --- 中长针类 (Half Double Crochet) ---
  T: { id: "T", label: "中长针", abbr: "T", description: "基础中长针", category: "basic", aliases: ["T", "HDC", "中长针"] },
  TV: { id: "TV", label: "中长针加针", abbr: "TV", description: "1个针目里钩2个中长针", category: "increase", aliases: ["TV", "HDCINC", "中长针加针"] },
  TA: { id: "TA", label: "中长针减针", abbr: "TA", description: "2个针目合并为1个中长针", category: "decrease", aliases: ["TA", "HDCDEC", "中长针减针"] },
  TW: { id: "TW", label: "中长针加加针", abbr: "TW", description: "1个针目里钩3个中长针", category: "increase", aliases: ["TW", "中长针加加针"] },
  TM: { id: "TM", label: "中长针减减针", abbr: "TM", description: "3个针目合并为1个中长针", category: "decrease", aliases: ["TM", "中长针减减针"] },

  // --- 长针类 (Double Crochet) ---
  F: { id: "F", label: "长针", abbr: "F", description: "基础长针", category: "basic", aliases: ["F", "DC", "长针"] },
  FV: { id: "FV", label: "长针加针", abbr: "FV", description: "1个针目里钩2个长针", category: "increase", aliases: ["FV", "DCINC", "长针加针"] },
  FA: { id: "FA", label: "长针减针", abbr: "FA", description: "2个针目合并为1个长针", category: "decrease", aliases: ["FA", "DCDEC", "长针减针"] },
  FW: { id: "FW", label: "长针加加针", abbr: "FW", description: "1个针目里钩3个长针", category: "increase", aliases: ["FW", "长针加加针"] },
  FM: { id: "FM", label: "长针减减针", abbr: "FM", description: "3个针目合并为1个长针", category: "decrease", aliases: ["FM", "长针减减针"] },

  // --- 长长针类 (Treble Crochet) ---
  E: { id: "E", label: "长长针", abbr: "E", description: "基础长长针", category: "basic", aliases: ["E", "TR", "长长针"] },
  EV: { id: "EV", label: "长长针加针", abbr: "EV", description: "1个针目里钩2个长长针", category: "increase", aliases: ["EV", "TRINC", "长长针加针"] },
  EA: { id: "EA", label: "长长针减针", abbr: "EA", description: "2个针目合并为1个长长针", category: "decrease", aliases: ["EA", "TRDEC", "长长针减针"] },

  // --- 基础功能 (Utility) ---
  CH: { id: "CH", label: "锁针/辫子针", abbr: "CH", description: "基础锁针", category: "basic", aliases: ["CH", "锁针", "辫子针"] },
  SL: { id: "SL", label: "引拔针", abbr: "SL", description: "引拔连接", category: "basic", aliases: ["SL", "引拔", "引拔针"] },
  SK: { id: "SK", label: "空针", abbr: "SK", description: "跳过不钩", category: "basic", aliases: ["SK", "空针", "SKIP"] },

  // --- 特殊/针目构造 (Specialty) ---
  BLO: { id: "BLO", label: "内半针", abbr: "BLO", description: "远离自己的半针", category: "special", aliases: ["BLO", "后半针"] },
  FLO: { id: "FLO", label: "外半针", abbr: "FLO", description: "靠近自己的半针", category: "special", aliases: ["FLO", "前半针"] },
  G: { id: "G", label: "爆米花针", abbr: "G", description: "5针长针的爆米花", category: "special", aliases: ["G", "爆米花针"] },
  Q: { id: "Q", label: "枣形针", abbr: "Q", description: "3针中长针的未完成针", category: "special", aliases: ["Q", "枣形针", "枣针"] },
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

// 主题色彩（为所有新针法补全马卡龙色系）
export const COLOR_THEMES = {
  macaron: {
    // 基础类 (蓝色/绿色系)
    X: "#7DD3FC", // 短针 - 天蓝
    T: "#f3da77", // 中长针 - 亮黄
    F: "#2bf14f", // 长针 - 翠绿
    E: "#b43eb4", // 长长针 - 紫罗兰色
    
    // 加针类 (橙色/暖色系 - 警示增加)
    V: "#3c9ffb", // 加针 - 蓝
    W: "#164ff9", // 加加针 - 深蓝
    TV: "#d5b721", // 中长针加针 - 深黄
    TW: "#f5b623", // 中长针加加针 - 橙色
    FV: "#06e55c", // 长针加针 - 深绿
    FW: "#0b3c1e", // 长针加加针 - 暗绿
    EV: "#592348", // 长长针加针 - 深紫色
    
    // 减针类 (粉色/红色系 - 警示减少)
    A: "#F9A8D4", // 减针 - 粉色
    M: "#f7a5b3", // 减减针 - 裸粉
    TA: "#f28484", // 中长针减针 - 浅红
    TM: "#f9c87f", // 中长针减减针 - 浅橙
    FA: "#81f593", // 长针减针 - 浅绿
    FM: "#b8eec0", // 长针减减针 - 薄荷绿
    EA: "#db64eb", // 长长针减针 - 淡紫色
    
    // 功能与特殊 (大地色/中性色)
    CH: "#a72424", // 锁针 - 深红色
    SL: "#A8A29E", // 引拔 - 暖灰
    SK: "#D6D3D1", // 空针 - 石灰
    G: "#FB7185", // 爆米花 - 珊瑚红
    Q: "#818CF8"  // 枣形针 - 靛蓝
  }
};

// ── 兼容层：现有 UI 仍依赖 STITCHES 数组和 SM 对象 ──
export const STITCHES = Object.values(STITCH_LIB).map(s => ({
  id: s.id,
  label: s.label,
  abbr: s.abbr,
  color: COLOR_THEMES.macaron[s.id] || "#ccc"
}));
export const SM = Object.fromEntries(STITCHES.map(s => [s.id, s]));

// ═══════════════════════════════════════════
//  图解解析引擎（纯函数，无副作用）
// ═══════════════════════════════════════════

const ROUND_PREFIX_RE = /^(?:R|Round|第)?\s*(\d+)\s*[:：.]\s*(.*)/i;

/**
 * 解析批量图解文本
 * @param {string} text - 用户粘贴的多行图解
 * @returns {Array<{type:'round'|'text', roundNum:number|null, instruction:string, seq:string[], raw:string}>}
 */
export function parsePattern(text) {
  const lines = text.trim().split(/\n/).map(l => l.trim()).filter(Boolean);
  const results = [];

  lines.forEach((raw, lineIdx) => {
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
      return;
    }

    // 2) 范围圈前缀：R7-11: / R7~11: / 第7-11圈：
    const rangeMatch = raw.match(/^(?:R|Round|第)?\s*(\d+)\s*[\-~—]\s*(\d+)\s*[:：.]\s*(.*)/i);
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
      return;
    }

    // 3) 起针行：第一行无 R 前缀但包含针法（如"起20CH""环起6X"）
    if (lineIdx === 0) {
      const seq = extractStitches(raw);
      if (seq.length > 0) {
        results.push({
          type: "round",
          roundNum: 0,
          instruction: `起针: ${raw}`,
          seq,
          raw
        });
        return;
      }
    }

    // 4) 无明显前缀 → 文本卡片保留
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
  // 匹配针法 token：支持 1X, X, 2V, CH, SL, TV, FV 等写法
  // 使用精确匹配已知缩写（从长到短排序，避免短前缀截断），避免误匹配 TEST 等无关字母组合
  const tokens = text.match(/\b\d*(?:BLO|FLO|TV|TA|TW|TM|FV|FA|FW|FM|EV|EA|SL|CH|SK|X|V|A|F|T|E|W|M|G|Q)\d*\b/gi) || [];
  return tokens.map(t => normalizeStitch(t)).filter(Boolean);
}

/**
 * 将单个 token 归一化为 STITCH_LIB 的 id
 * @param {string} token - 如 "1X", "V", "2CH"
 * @returns {string|null}
 */
export function normalizeStitch(token) {
  // 去掉头尾数字，得到纯字母核心
  const core = token.replace(/^\d+|\d+$/g, "").toUpperCase();
  return ALIAS_TO_ID[core] || null;
}

/**
 * 解析针法颜色（支持项目级 + 全局自定义主题覆盖）
 * @param {string} id - 针法缩写 id
 * @param {object} settings - 全局设置，包含 theme 和 customColors
 * @param {object} [projCustom] - 项目级自定义 { colors: {} }
 * @returns {string} CSS 颜色值
 */
export function resolveColor(id, settings, projCustom) {
  if (!id) return "#ccc";
  // 项目级自定义颜色（最高优先级）
  if (projCustom?.colors?.[id]) return projCustom.colors[id];
  // 全局自定义颜色
  if (settings?.customColors?.[id]) return settings.customColors[id];
  // 主题默认色
  const themeKey = settings?.theme || "macaron";
  const theme = COLOR_THEMES[themeKey] || COLOR_THEMES.macaron;
  return theme[id] || "#ccc";
}
