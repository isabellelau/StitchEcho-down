// ═══════════════════════════════════════════
//  State
// ═══════════════════════════════════════════
export const state = {
  data: {
    schemaVersion: 1,
    projects: [],
    settings: {
      theme: "morandi",
      stitchTheme: "morandi",
      customColors: {},
      globalCustomStitches: {},
      globalStitchCustomizations: {
        names: {},
        colors: {}
      },
      voiceEnabled: false,
      voiceSoundEnabled: false,
      voiceSpeakFeedback: true,
      voiceWaitTimeout: 5000,
      voiceRepeatDefault: 'ask',
      profile: { name: '' }
    }
  },
  curProjId: null,
  immersiveMode: false,
  expandedRounds: new Set(),
  selectedStitch: null,

  pendingInsert: null,
  dlgCallback: null,
  confirmCallback: null,
  filterByRound: true,
  editingPartId: null,
  currentTab: 'projects',
  voiceMode: false,
  recognition: null,
  voiceWaitingFor: null,
  voiceWaitTimer: null,
  voiceLastSid: null,
  flowState: {
    importMode: null,
    newProjectFlow: false,
    setupMode: null,
    setupSelections: null,
    customizingSid: null,
    pendingParsed: null,
    projMenuId: null,
    captureEdit: null,
    glowTimer: null,
  },
  _lastDeletedRound: null,
  _lastDeletedPart: null,
  _lastRemovedParsedItem: null,
  _sessionStart: null,
  _sessionLastActive: null,
};

// Sync editingPartId with window for inline HTML handlers
Object.defineProperty(window, 'editingPartId', {
  get() { return state.editingPartId; },
  set(v) { state.editingPartId = v; }
});

export const NUMBER_MAP = {
  '一': 1, '幺': 1, '1': 1, '一号': 1, '一针': 1, '第一': 1,
  '二': 2, '两': 2, '俩': 2, '2': 2, '二号': 2, '二针': 2, '第二': 2,
  '三': 3, '3': 3, '三号': 3, '三针': 3, '第三': 3,
  '四': 4, '4': 4, '四号': 4, '四针': 4, '第四': 4,
  '五': 5, '5': 5, '五号': 5, '五针': 5, '第五': 5,
  '六': 6, '6': 6, '六号': 6, '六针': 6, '第六': 6,
  '七': 7, '7': 7, '七号': 7, '七针': 7, '第七': 7,
  '八': 8, '8': 8, '八号': 8, '八针': 8, '第八': 8,
  '九': 9, '9': 9, '九号': 9, '九针': 9, '第九': 9,
};

// ── helpers ──
export function uid() { return String(Date.now() + Math.random()); }
export function getProj(id) { return state.data.projects.find(p => String(p.id) === String(id)); }
export function getActivePart(proj) {
  if (!proj || !proj.parts || !proj.parts.length) return null;
  return proj.parts.find(p => p.id === proj.activePartId) || proj.parts[0];
}
export function isPartEmpty(part) {
  if (!part) return true;
  const hasNoRounds = part.rounds.length === 0;
  const hasOnlyEmptyRound = part.rounds.length === 1 &&
    part.rounds[0].seq.length === 0 &&
    !part.rounds[0].instruction &&
    !part.rounds[0].isTextCard;
  return hasNoRounds || hasOnlyEmptyRound;
}
export function getEditingPartId() { return state.editingPartId; }

// ── 每日计数器 ──
const DAILY_LOG_KEY = 'knit_daily_log';

export function getTodayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function getDailyLog() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_LOG_KEY) ?? '{}');
  } catch { return {}; }
}

export function addDailyCount(n) {
  try {
    const key = getTodayKey();
    const log = getDailyLog();
    log[key] = Math.max(0, (log[key] || 0) + n);
    if (log[key] === 0) delete log[key];
    localStorage.setItem(DAILY_LOG_KEY, JSON.stringify(log));
  } catch (e) {
    // Safari 隐私模式 QuotaExceededError，静默忽略
    // 计数丢失但不影响主流程
  }
}

export function calcTotalDays() {
  const log = getDailyLog();
  return Object.keys(log).filter(k => log[k] > 0).length;
}

export function clearDailyLog() {
  localStorage.removeItem(DAILY_LOG_KEY);
}
