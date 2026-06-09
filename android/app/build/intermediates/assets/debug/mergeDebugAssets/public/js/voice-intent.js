import { state, getProj } from './state.js';
import { ALIAS_TO_ID } from '../stitches.js';
import { getLang } from './i18n.js';

const IntentType = {
  STITCH:  'STITCH',
  REPEAT:  'REPEAT',
  REPEAT_ROUND: 'REPEAT_ROUND',
  UNDO:    'UNDO',
  MARK:    'MARK',
  GOTO:    'GOTO',
  CONFIRM: 'CONFIRM',
  UNKNOWN: 'UNKNOWN'
};

const EN_ALIAS = {
  'single crochet': 'X',  'sc': 'X',
  'double crochet': 'F',  'dc': 'F',
  'half double crochet': 'T', 'hdc': 'T',
  'treble': 'E',  'treble crochet': 'E', 'tr': 'E',
  'chain': 'CH',  'chain stitch': 'CH',
  'slip stitch': 'SL', 'sl st': 'SL', 'slst': 'SL',
  'skip': 'SK',   'skip stitch': 'SK',
  'increase': 'V', 'inc': 'V',
  'decrease': 'A', 'dec': 'A',
  'popcorn': 'G',  'popcorn stitch': 'G',
  'bobble': 'Q',   'bobble stitch': 'Q',
};

const EN_NUM = {
  'one':1, 'two':2, 'three':3, 'four':4, 'five':5,
  'six':6, 'seven':7, 'eight':8, 'nine':9, 'ten':10,
};

const EN_COLOR_MAP = {
  'red': '#EF4444',
  'orange': '#F97316',
  'yellow': '#EAB308',
  'green': '#22C55E',
  'blue': '#3B82F6',
  'purple': '#A855F7',
};

const ZH_COLOR_MAP = {
  '红':'#EF4444','红色':'#EF4444',
  '橙':'#F97316','橙色':'#F97316',
  '黄':'#EAB308','黄色':'#EAB308',
  '绿':'#22C55E','绿色':'#22C55E',
  '蓝':'#3B82F6','蓝色':'#3B82F6',
  '紫':'#A855F7','紫色':'#A855F7',
};

function parseChineseNum(s) {
  const map = { '一':1,'二':2,'三':3,'四':4,'五':5,
                '六':6,'七':7,'八':8,'九':9,'十':10 };
  return map[s] || parseInt(s, 10) || 1;
}

function aliasToSid(text) {
  if (!text) return null;
  const lang = getLang();
  const lower = text.trim().toLowerCase();

  if (lang === 'en') {
    const sid = EN_ALIAS[lower];
    if (sid) return sid;
  } else {
    const sid = ALIAS_TO_ID[text.trim().toUpperCase()];
    if (sid) return sid;
  }

  const customStitches = state.data?.settings?.globalCustomStitches || {};
  const customMatch = Object.values(customStitches).find(s => {
    if (s.label && s.label.toLowerCase() === lower) return true;
    if (s.id && s.id.toLowerCase() === lower) return true;
    return false;
  });
  return customMatch?.id || null;
}

function parseColor(text) {
  const t = text.toLowerCase().trim();
  const lang = getLang();
  if (lang === 'en') return EN_COLOR_MAP[t] || null;
  return ZH_COLOR_MAP[text] || null;
}

function parseIntentL1(text) {
  const t = text.trim().toLowerCase();
  const lang = getLang();

  if (lang === 'en') {
    if (/\bundo\b|\bgo back\b/.test(t))
      return { type: IntentType.UNDO };

    for (const [alias, sid] of Object.entries(EN_ALIAS)) {
      for (const [word, num] of Object.entries(EN_NUM)) {
        if (t === `${word} ${alias}`) {
          return { type: IntentType.STITCH, sid, count: num };
        }
      }
      const numMatch = t.match(new RegExp(`^(\\d+)\\s+${alias}$`));
      if (numMatch) {
        return { type: IntentType.STITCH, sid, count: parseInt(numMatch[1], 10) };
      }
      if (t === alias) {
        return { type: IntentType.STITCH, sid, count: 1 };
      }
    }

    if (/\bagain\b|\bone more\b|\brepeat\b/.test(t))
      return { type: IntentType.REPEAT };

    if (/\bone more round\b|\bnext round\b|\brepeat round\b/.test(t))
      return { type: IntentType.REPEAT_ROUND };

    if (/^(done|next|yes|ok|got it)$/.test(t))
      return { type: IntentType.CONFIRM };

  } else {
    if (/撤销|返回|undo|back/.test(t))
      return { type: IntentType.UNDO };

    // 在文本任意位置搜索数字+针法组合（兼容"倒二钩13F""第3行20X"等嵌入格式）
    const numStitch = t.match(/([一二三四五六七八九十\d]+)\s*(短针|中长针|长针|长长针|锁针|引拔|加针|减针|空针|.*针)/);
    if (numStitch) {
      const count = parseChineseNum(numStitch[1]);
      const sid = aliasToSid(numStitch[2]);
      if (sid) return { type: IntentType.STITCH, sid, count };
    }

    // 英文/缩写嵌入匹配（"倒二钩13F""共钩5V"等）
    const embedded = t.match(/(\d+)\s*([a-zA-Z]+)/);
    if (embedded) {
      const count = parseInt(embedded[1], 10);
      const sid = aliasToSid(embedded[2]);
      if (sid) return { type: IntentType.STITCH, sid, count };
    }

    const sid = aliasToSid(t);
    if (sid) return { type: IntentType.STITCH, sid, count: 1 };

    if (/再来一圈|one more round|下一圈花样/.test(t))
      return { type: IntentType.REPEAT_ROUND };

    if (/再来|repeat|再一次|再来一次/.test(t))
      return { type: IntentType.REPEAT };

    if (/^(好|嗯|钩了|下一针|继续)$/.test(t))
      return { type: IntentType.CONFIRM };
  }

  return { type: IntentType.UNKNOWN, raw: text };
}

export { IntentType, parseIntentL1, parseColor, parseChineseNum };
