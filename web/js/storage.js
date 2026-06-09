import { state, uid } from './state.js';
import { STITCH_LIB, OLD_ID_MAP } from '../stitches.js';

export function saveData() {
  localStorage.setItem("crochet_v3_fixed", JSON.stringify(state.data));
}

export function loadData() {
  // 诊断：列出 localStorage 中所有 key
  const allKeys = Object.keys(localStorage);
  const dataKeys = allKeys.filter(k => k.includes('crochet') || k.includes('knit'));
  // localStorage keys checked silently

  // 智能读取：优先找有项目数据的 key
  let d = null;
  let sourceKey = null;
  const candidates = [
    { key: 'crochet_v3_fixed', check: (v) => v && v.projects && v.projects.length > 0 },
    { key: 'crochet_v3', check: (v) => v && v.projects && v.projects.length > 0 }
  ];

  for (const { key, check } of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (check(parsed)) {
          d = parsed;
          sourceKey = key;
          break;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 如果没有找到有项目的数据，回退到第一个存在的 key（哪怕为空）
  if (!d) {
    for (const key of ['crochet_v3_fixed', 'crochet_v3']) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          d = JSON.parse(raw);
          sourceKey = key;
          break;
        }
      } catch (e) { /* ignore */ }
    }
  }

  if (d) {
    Object.keys(state.data).forEach(k => delete state.data[k]);
    Object.assign(state.data, d);
  }
  // 保底结构
  if (!state.data || typeof state.data !== "object") {
    console.warn('[loadData] state.data invalid, resetting');
    Object.keys(state.data).forEach(k => delete state.data[k]);
  }
  if (!Array.isArray(state.data.projects)) {
    console.warn('[loadData] state.data.projects not array, resetting');
    state.data.projects = [];
  }
  if (!state.data.settings || typeof state.data.settings !== "object") {
    state.data.settings = { theme: "macaron", customColors: {}, voiceEnabled: false };
  }

  // 迁移旧数据
  migrateData(state.data);
  saveData();
}

// ── 数据迁移：兼容旧版格式 ──
export function migrateData(d) {
  d.projects.forEach(p => {
    // 补全 customSettings
    if (!p.customSettings) p.customSettings = { names: {}, colors: {}, customStitches: {} };
    if (!p.customSettings.customStitches) p.customSettings.customStitches = {};
    if (p.archived === undefined) p.archived = false;
    if (p.coverImage === undefined) p.coverImage = null;

    // 旧版 → 新版：将顶层 rounds 封装为 parts
    if (!p.parts && p.rounds) {
      const partId = uid();
      p.parts = [{
        id: partId,
        title: '主图解',
        rawPattern: '',
        rounds: p.rounds || [],
        activeRoundId: p.activeRoundId || (p.rounds?.length ? p.rounds[p.rounds.length - 1].id : null),
        customPalette: p.customPalette || null
      }];
      p.activePartId = partId;
      delete p.rounds;
      delete p.activeRoundId;
      delete p.customPalette;
    }

    // 保底：确保 parts 数组存在
    if (!p.parts || !Array.isArray(p.parts)) {
      const partId = uid();
      p.parts = [{ id: partId, title: '主图解', rawPattern: '', rounds: [], activeRoundId: null, customPalette: null }];
      p.activePartId = partId;
    }

    // 保底 activePartId
    if (!p.activePartId || !p.parts.find(pt => pt.id === p.activePartId)) {
      p.activePartId = p.parts[0]?.id || null;
    }

    // 迁移每个 part 内的 rounds
    p.parts.forEach(part => {
      if (!part.rounds) part.rounds = [];
      if (part.customPalette === undefined) part.customPalette = null;
      if (!part.rawPattern && part.rawPattern !== '') part.rawPattern = '';
      if (!part.title) part.title = '未命名';

      part.rounds.forEach(r => {
        if (!r.instruction && r.instruction !== "") r.instruction = "";
        if (r.isTextCard === undefined) r.isTextCard = false;
        if (Array.isArray(r.seq)) {
          r.seq = r.seq.map(sid => OLD_ID_MAP[sid] || sid)
            .filter(sid => STITCH_LIB[sid]);
        }
      });

      // 保底 activeRoundId
      if (!part.activeRoundId && part.rounds.length) {
        part.activeRoundId = part.rounds[part.rounds.length - 1].id;
      }
    });
  });
}

export function exportPDF() {
  window.print();
}

// ── 数据导出/导入 ──
export function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `钩织计数本备份_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSingleProject(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (!proj) return;

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: proj
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `${proj.name}_${date}.knt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const guide = document.getElementById('backup-guide');
  if (guide) {
    guide.style.display = 'block';
    guide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
