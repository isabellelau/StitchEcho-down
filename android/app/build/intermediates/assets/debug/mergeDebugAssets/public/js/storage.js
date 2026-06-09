/**
 * STORAGE SCHEMA VERSIONING
 * =========================
 * Current version: LATEST_SCHEMA (currently 10)
 *
 * Version history:
 *   v1 — initial versioned schema; added schemaVersion field;
 *         restructured migrateData() to version-gated blocks
 *   v2 — cover images moved out of project JSON into separate
 *         localStorage keys (img_{projId}); proj.coverImage removed
 *   v4 — 新增 project.lastModified（时间戳，为 CloudKit 同步冲突解决预留）
 *   v5 — 新增 state.data.settings.globalCustomStitches（全局自定义针法库）
 *   v6 — 新增 state.data.settings.profile（本地昵称，无后端身份卡）
 *   v7 — 针法库全面全局化：合并项目级 customStitches/names/colors 到
 *         全局 globalCustomStitches / globalStitchCustomizations，
 *         废弃项目级 customSettings 的针法定义字段
 *   v8 — 新增 project.refImages（参考图，数组存储 IndexedDB covers key）
 *   v9 — 新增 project.focusSessions（专注时长记录）+ project.dailyCount（每日针数）
 *   v10 — 新增 project.markers（记号扣，针目级彩色标记+备注）
 *   v11 — 新增 part.lastPosition（钩织进度记忆，记录最后钩织位置）
 *   v12 — 新增 round.clusterRanges（复合针法簇范围，平行于 seq 的元数据）
 *   v13 — clusterRanges → seq 内 cluster token：将平行元数据数组内嵌为 seq 元素
 *   v14 — 将 seq 中的 cluster token 展开为独立针
 *   v15 — 新增语音设置字段 voiceSpeakFeedback / voiceWaitTimeout / voiceRepeatDefault
 *   v16 — 新增 project.mode ('normal'|'simple') 和 round.completed (boolean)
 *
 * Rule: whenever you change the shape of state.data, you MUST:
 *   1. Bump LATEST_SCHEMA by 1
 *   2. Add a new migration block: if (d.schemaVersion < N) { ... }
 *   3. Document the change in the version history above
 *   4. Update AI-FEATURE-MAP.md under "数据层 - 数据迁移逻辑"
 */

import { state, uid } from './state.js';
import { STITCH_LIB, OLD_ID_MAP } from '../stitches.js';
import { showToast } from './ui.js';
import { t } from './i18n.js';

// ═══════════════════════════════════════
//  IndexedDB 适配层
// ═══════════════════════════════════════

const DB_NAME = 'knit_db';
const DB_VERSION = 1;

let _db = null;

export async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('main')) {
        db.createObjectStore('main');
      }
      if (!db.objectStoreNames.contains('covers')) {
        db.createObjectStore('covers');
      }
    };
    req.onsuccess = e => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export const storageAdapter = {
  async get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('main', 'readonly');
      const req = tx.objectStore('main').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  async set(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('main', 'readwrite');
      const req = tx.objectStore('main').put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  async remove(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('main', 'readwrite');
      const req = tx.objectStore('main').delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

const STORAGE_KEY = 'crochet_v4';
const OLD_KEYS = ['crochet_v3_fixed', 'crochet_v3'];
const LATEST_SCHEMA = 24;

// ═══════════════════════════════════════
//  一次性迁移：localStorage → IndexedDB
// ═══════════════════════════════════════

async function migrateFromLocalStorage() {
  // 迁移主数据
  const oldData = localStorage.getItem(STORAGE_KEY);
  if (oldData) {
    try {
      await storageAdapter.set(STORAGE_KEY, JSON.parse(oldData));
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { console.warn('migrateFromLocalStorage main failed:', e); }
  }

  // 迁移封面图片（base64 → Blob）
  const keys = Object.keys(localStorage).filter(k => k.startsWith('img_'));
  for (const key of keys) {
    const base64 = localStorage.getItem(key);
    if (base64) {
      try {
        const res = await fetch(base64);
        const blob = await res.blob();
        const projId = key.replace('img_', '');
        const db = await openDB();
        await new Promise((resolve, reject) => {
          const tx = db.transaction('covers', 'readwrite');
          const req = tx.objectStore('covers').put(blob, projId);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        localStorage.removeItem(key);
      } catch (e) { console.warn('migrateFromLocalStorage cover failed:', key, e); }
    }
  }

  // 清理旧 key
  for (const key of OLD_KEYS) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

// ═══════════════════════════════════════
//  save / load
// ═══════════════════════════════════════

export async function saveData() {
  try {
    await storageAdapter.set(STORAGE_KEY, state.data);
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      showToast('存储空间不足，请导出备份后清理数据');
    } else {
      console.error('[saveData] unexpected error:', e);
      showToast('保存失败，请检查设备存储状态');
    }
  }
  checkStorageQuota();
}

// ═══════════════════════════════════════
//  存储用量检测（使用超过 80% 时提示）
// ═══════════════════════════════════════

export async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return;
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const ratio = usage / quota;
    if (ratio >= 0.8) {
      const usedMB = (usage / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      showToast(
        t('storage_usage').replace('{used}', usedMB).replace('{quota}', quotaMB),
        null,
        6000
      );
    }
  } catch {
    // 静默失败，不影响主流程
  }
}

export async function loadData() {
  let d = null;

  // 优先读 IndexedDB
  try {
    d = await storageAdapter.get(STORAGE_KEY);
  } catch (e) { /* ignore */ }

  // 回退到 localStorage 旧 key
  if (!d) {
    const candidates = [
      { key: 'crochet_v3_fixed', check: (v) => v && v.projects && v.projects.length > 0 },
      { key: 'crochet_v3', check: (v) => v && v.projects && v.projects.length > 0 }
    ];

    for (const { key, check } of candidates) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (check(parsed)) { d = parsed; break; }
        }
      } catch (e) { /* ignore */ }
    }

    if (!d) {
      for (const key of OLD_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) { d = JSON.parse(raw); break; }
        } catch (e) { /* ignore */ }
      }
    }

    // 迁移到 IndexedDB 后清理
    if (d) {
      for (const key of OLD_KEYS) {
        try { localStorage.removeItem(key); } catch { /* ignore */ }
      }
    }
  }

  if (d) {
    // 上界检查：拒绝来自更新版本的数据
    if (d.schemaVersion > LATEST_SCHEMA) {
      showToast('该备份来自更新版本的织影，请先升级应用');
      return;
    }
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
    state.data.settings = { theme: "morandi", customColors: {}, globalCustomStitches: {}, voiceEnabled: false };
  }

  // 紧急备份恢复：崩溃前未落盘的数据
  const emergencyBackup = localStorage.getItem('knit_emergency_backup');
  if (emergencyBackup) {
    try {
      const backup = JSON.parse(emergencyBackup);
      if (backup.projects?.length > (state.data.projects?.length || 0)) {
        showToast('检测到未保存的数据，已自动恢复');
        Object.keys(state.data).forEach(k => delete state.data[k]);
        Object.assign(state.data, backup);
      }
    } catch (e) { /* ignore */ }
    localStorage.removeItem('knit_emergency_backup');
  }

  // 1) 先跑 schema 迁移（v1→v2 可能把 coverImage 写入 localStorage img_*）
  const result = migrateData(state.data);
  if (result !== state.data) {
    showToast('数据升级失败，已恢复至上次版本，建议导出备份', null, 6000);
  }

  // 2) 再跑 localStorage → IndexedDB 迁移（一次补齐封面）
  await migrateFromLocalStorage();

  // 3) 落盘
  await saveData();
}

// ── 数据迁移：版本门控 ──

export function migrateData(d) {
  d.schemaVersion = parseInt(d.schemaVersion, 10) || 0;
  try {
    const backup = JSON.parse(JSON.stringify(d));
  if (!d.schemaVersion || d.schemaVersion < 1) {
    d.projects.forEach(p => {
      // 补全 customSettings
      if (!p.customSettings) p.customSettings = { names: {}, colors: {}, customStitches: {} };
      if (!p.customSettings.customStitches) p.customSettings.customStitches = {};
      if (p.archived === undefined) p.archived = false;

      // 旧版 → 新版：将顶层 rounds 封装为 parts
      if (!p.parts && p.rounds) {
        const partId = uid();
        p.parts = [{
          id: partId,
          title: t('default_part_title'),
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
        p.parts = [{ id: partId, title: t('default_part_title'), rawPattern: '', rounds: [], activeRoundId: null, customPalette: null }];
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
        if (!part.title) part.title = t('unnamed');

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

  // v3 → v4: 补全 lastModified 时间戳
  if (d.schemaVersion < 4) {
    d.projects.forEach(p => {
      if (!p.lastModified) {
        p.lastModified = Date.now();
      }
    });
  }

  // v1 → v2: 将 coverImage 从项目对象迁移到 localStorage key
  //          → migrateFromLocalStorage() 再迁到 IndexedDB covers store
  if (d.schemaVersion < 2) {
    d.projects.forEach(p => {
      if (p.coverImage) {
        localStorage.setItem('img_' + p.id, p.coverImage);
        const verified = localStorage.getItem('img_' + p.id);
        if (!verified) throw new Error('v1→v2 coverImage write failed for ' + p.id);
      }
      delete p.coverImage;
    });
  }

  // v4 → v5: 补全全局自定义针法库
  if (d.schemaVersion < 5) {
    if (!d.settings) d.settings = {};
    if (!d.settings.globalCustomStitches) {
      d.settings.globalCustomStitches = {};
    }
  }

  // v5 → v6: 补全 profile 字段
  if (d.schemaVersion < 6) {
    if (!d.settings) d.settings = {};
    if (!d.settings.profile) {
      d.settings.profile = { name: '' };
    }
  }

  // v6 → v7: 针法库全面全局化
  if (d.schemaVersion < 7) {
    // 确保全局字段存在
    if (!d.settings) d.settings = {};
    if (!d.settings.globalCustomStitches) d.settings.globalCustomStitches = {};
    if (!d.settings.globalStitchCustomizations) d.settings.globalStitchCustomizations = { names: {}, colors: {} };
    if (!d.settings.customColors) d.settings.customColors = {};

    const globalCustom = d.settings.globalCustomStitches;
    const globalNames = d.settings.globalStitchCustomizations.names;
    const globalColors = d.settings.globalStitchCustomizations.colors;

    // 将旧 settings.customColors 合并到 globalStitchCustomizations.colors（全局已有跳过）
    Object.keys(d.settings.customColors).forEach(sid => {
      if (!globalColors[sid]) {
        globalColors[sid] = d.settings.customColors[sid];
      }
    });

    // 遍历所有项目，将项目级针法数据合并到全局
    d.projects.forEach(p => {
      if (!p.customSettings) return;

      // customStitches → globalCustomStitches（全局已有跳过）
      if (p.customSettings.customStitches) {
        Object.keys(p.customSettings.customStitches).forEach(sid => {
          if (!globalCustom[sid]) {
            globalCustom[sid] = { ...p.customSettings.customStitches[sid] };
          }
        });
      }

      // names → globalStitchCustomizations.names（全局已有跳过）
      if (p.customSettings.names) {
        Object.keys(p.customSettings.names).forEach(sid => {
          if (!globalNames[sid]) {
            globalNames[sid] = p.customSettings.names[sid];
          }
        });
      }

      // colors → globalStitchCustomizations.colors（全局已有跳过）
      if (p.customSettings.colors) {
        Object.keys(p.customSettings.colors).forEach(sid => {
          if (!globalColors[sid]) {
            globalColors[sid] = p.customSettings.colors[sid];
          }
        });
      }

      // 清空项目级针法定义字段
      delete p.customSettings.customStitches;
      delete p.customSettings.names;
      delete p.customSettings.colors;
    });
  }

  // v7 → v8: 补全 refImages
  if (d.schemaVersion < 8) {
    d.projects.forEach(p => {
      if (!Array.isArray(p.refImages)) p.refImages = [];
    });
  }

  // v8 → v9: 补全 focusSessions + dailyCount
  if (d.schemaVersion < 9) {
    d.projects.forEach(p => {
      if (!Array.isArray(p.focusSessions)) p.focusSessions = [];
      if (!p.dailyCount || typeof p.dailyCount !== 'object') p.dailyCount = {};
    });
  }

  // v9 → v10: 补全 markers
  if (d.schemaVersion < 10) {
    d.projects.forEach(p => {
      if (!Array.isArray(p.markers)) p.markers = [];
    });
  }

  // v10 → v11: 补全 lastPosition
  if (d.schemaVersion < 11) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        if (!part.lastPosition) part.lastPosition = null;
      });
    });
  }

  // v11 → v12: 补全 round.clusterRanges
  if (d.schemaVersion < 12) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (!Array.isArray(r.clusterRanges)) r.clusterRanges = [];
        });
      });
    });
  }

  // v12 → v13: 将 clusterRanges 平行数组迁移为 seq 内的 cluster token
  if (d.schemaVersion < 13) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (Array.isArray(r.clusterRanges) && r.clusterRanges.length > 0 && Array.isArray(r.seq)) {
            const newSeq = [];
            let seqIdx = 0;
            const sortedRanges = [...r.clusterRanges].sort((a, b) => a.start - b.start);
            while (seqIdx < r.seq.length) {
              const cr = sortedRanges.find(c => c.start === seqIdx);
              if (cr) {
                newSeq.push({
                  type: 'cluster',
                  stitches: r.seq.slice(cr.start, cr.start + cr.length),
                  raw: cr.raw || `(${cr.length}${r.seq[cr.start]})`
                });
                seqIdx += cr.length;
              } else {
                newSeq.push(r.seq[seqIdx]);
                seqIdx++;
              }
            }
            r.seq = newSeq;
          }
          delete r.clusterRanges;
        });
      });
    });
  }

  // v13 → v14: 将 seq 中的 cluster token 拆分为独立针
  if (d.schemaVersion < 14) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (Array.isArray(r.seq)) {
            const newSeq = [];
            for (const token of r.seq) {
              if (token && typeof token === 'object' && token.type === 'cluster') {
                for (const innerSid of token.stitches) {
                  newSeq.push(innerSid);
                }
              } else {
                newSeq.push(token);
              }
            }
            r.seq = newSeq;
          }
        });
      });
    });
  }

  // v14 → v15: 补全语音设置字段
  if (d.schemaVersion < 15) {
    if (!d.settings) d.settings = {};
    d.settings.voiceSpeakFeedback = d.settings.voiceSpeakFeedback ?? true;
    d.settings.voiceWaitTimeout = d.settings.voiceWaitTimeout ?? 5000;
    d.settings.voiceRepeatDefault = d.settings.voiceRepeatDefault ?? 'ask';
  }

  // v15 → v16: 新增 project.mode 和 round.completed
  if (d.schemaVersion < 16) {
    d.projects.forEach(p => {
      if (!p.mode) p.mode = 'normal';
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (r.completed === undefined) r.completed = false;
        });
      });
    });
  }

  // v16 → v24: 合并迁移（语音设置 + normalHighlightIndex + originalInstruction）
  if (d.schemaVersion < 17) {
    if (!d.settings) d.settings = {};
    d.settings.voiceNumberKeys = d.settings.voiceNumberKeys ?? false;
  }
  if (d.schemaVersion < 18) {
    if (!d.settings) d.settings = {};
    d.settings.voiceReadEnabled = d.settings.voiceReadEnabled ?? false;
  }
  if (d.schemaVersion < 19) {
    if (!d.settings) d.settings = {};
    d.settings.voiceReadInterval = d.settings.voiceReadInterval ?? 5000;
  }
  if (d.schemaVersion < 20) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (r.normalHighlightIndex === undefined) {
            r.normalHighlightIndex = 0;
          }
        });
      });
    });
  }
  if (d.schemaVersion < 21) {
    if (!d.settings) d.settings = {};
    d.settings.voiceSoundEnabled = d.settings.voiceSoundEnabled ?? true;
    d.settings.voiceNumberKeys = d.settings.voiceNumberKeys ?? true;
    d.settings.voiceSpeakRate = d.settings.voiceSpeakRate ?? 'medium';
  }
  if (d.schemaVersion < 22) {
    if (!d.settings) d.settings = {};
    d.settings.voiceDebugEnabled = false;
  }
  if (d.schemaVersion < 23) {
    d.projects.forEach(p => {
      if (!p.mode) p.mode = 'normal';
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (r.completed === undefined) r.completed = false;
        });
      });
    });
  }
  if (d.schemaVersion < 24) {
    d.projects.forEach(p => {
      (p.parts || []).forEach(part => {
        (part.rounds || []).forEach(r => {
          if (r.originalInstruction === undefined) r.originalInstruction = null;
        });
      });
    });
  }

  d.schemaVersion = LATEST_SCHEMA;
  } catch (err) {
    console.error('[Migration] snapshot or migration failed at schemaVersion', d.schemaVersion, err);
    return d;
  }
  return d;
}

export function exportPDF() {
  if (/iPhone|iPad/.test(navigator.userAgent)) {
    showToast('PDF 导出请使用浏览器菜单中的「打印」功能');
    return;
  }
  window.print();
}

// ── 数据导出/导入 ──
export function exportData() {
  const json = JSON.stringify(state.data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = t('export_filename').replace(/[/\\:*?"<>|]/g, '_');
  a.download = safeName.replace('{date}', new Date().toISOString().slice(0,10));
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
  const safeName = proj.name.replace(/[/\\:*?"<>|]/g, '_');
  a.download = `${safeName}_${date}.knt`;
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
