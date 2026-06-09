import zhLocale from './locales/zh.js';
import enLocale from './locales/en.js';
import { STITCH_TERMS } from './locales/terms.js';

const UI_LANGS = { zh: zhLocale, en: enLocale };
const NOTATION_KEY = 'knit_stitch_notation';

function detectLang() {
  const saved = localStorage.getItem('knit_lang');
  if (saved && UI_LANGS[saved]) return saved;
  const browser = navigator.language?.slice(0, 2).toLowerCase();
  return UI_LANGS[browser] ? browser : 'zh';
}

let currentLang = detectLang();

export function t(key) {
  return UI_LANGS[currentLang]?.[key]
    ?? UI_LANGS['zh']?.[key]
    ?? key;
}

function getNotation() {
  const saved = localStorage.getItem(NOTATION_KEY);
  if (saved) return saved;
  return currentLang === 'zh' ? 'zh' : 'en_us';
}

export function term(sid) {
  const notation = getNotation();
  if (notation === 'symbol') {
    return STITCH_TERMS['symbol']?.[sid] ?? sid;
  }
  return STITCH_TERMS[notation]?.[sid]
    ?? STITCH_TERMS['zh']?.[sid]
    ?? sid;
}

export function setNotation(notation) {
  localStorage.setItem(NOTATION_KEY, notation);
}

export function getNotationKey() {
  return getNotation();
}

export function setLang(lang) {
  if (!UI_LANGS[lang]) return;
  currentLang = lang;
  localStorage.setItem('knit_lang', lang);
}

export function getLang() {
  return currentLang;
}

export const SUPPORTED_LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

const SYMBOL_KEY = 'knit_show_symbol';

export function getShowSymbol() {
  const val = localStorage.getItem(SYMBOL_KEY);
  return val === null ? true : val === 'true';
}

export function setShowSymbol(val) {
  localStorage.setItem(SYMBOL_KEY, String(val));
}

export const NOTATION_OPTIONS = [
  { code: 'symbol', label: '符号 X/V' },
  { code: 'zh', label: '中文' },
  { code: 'en_us', label: 'EN-US' },
  { code: 'en_uk', label: 'EN-UK' },
];
