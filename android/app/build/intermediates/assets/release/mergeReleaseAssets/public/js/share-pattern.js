import { state, uid, getProj } from './state.js';
import { showSheet, showToast, closeSheet, escapeHtml } from './ui.js';

import { saveData } from './storage.js';
import { t } from './i18n.js';

const APP_URL = 'https://isabellelau.github.io/knit-counter/';

// ── Clipboard helpers ──
function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand failed'));
    } catch (e) { reject(e); }
  });
}

// ── Binary helpers ──
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Text pattern generation ──
function generateTextPattern(proj) {
  const lines = [];
  lines.push(`【${t('app_name')}${t('share_pattern_title')}】${proj.name}`);
  lines.push('');

  const parts = proj.parts || [];
  parts.forEach((part, pi) => {
    if (parts.length > 1) {
      lines.push(part.title || `${t('unnamed')} ${pi + 1}`);
    }
    let hasRound = false;
    (part.rounds || []).forEach(r => {
      const instr = (r.instruction || '').trim();
      if (!instr) return;
      lines.push(instr);
      hasRound = true;
    });
    if (hasRound && pi < parts.length - 1) lines.push('');
  });

  lines.push('');
  lines.push(t('share_text_footer'));
  lines.push(APP_URL);

  return lines.join('\n');
}

// ── Full project export (Pro) ──
function stripProjectForExport(proj) {
  // console.log('[export] proj.markers:', JSON.stringify(proj.markers));
  return {
    name: proj.name,
    useRowTerms: proj.useRowTerms,
    markers: proj.markers || [],
    parts: (proj.parts || []).map(part => ({
      title: part.title,
      customPalette: part.customPalette,
      activeRoundId: part.activeRoundId,
      rounds: (part.rounds || []).map(r => ({
        id: r.id,
        instruction: r.instruction || '',
        seq: r.seq || [],
        ...(r.expectedCount != null ? { expectedCount: r.expectedCount } : {}),
        ...(r.isTextCard ? { isTextCard: true } : {}),
        ...(r.isLoopMarker ? { isLoopMarker: true } : {}),
        ...(r.loopFrom != null ? { loopFrom: r.loopFrom } : {}),
        ...(r.loopTo != null ? { loopTo: r.loopTo } : {}),
        ...(r.roundNum != null ? { roundNum: r.roundNum } : {})
      }))
    }))
  };
}

async function compressAndEncode(data) {
  const json = JSON.stringify(data);
  // CompressionStream 在部分浏览器中会导致流挂起，暂时走无压缩 fallback
  const bytes = new TextEncoder().encode(json);
  return { compressed: false, data: uint8ArrayToBase64(bytes) };
}

function generateFullProjectText(proj, encoded) {
  return `【织影项目】${proj.name}\nKNIT1:${encoded}\n用织影App导入可直接使用 #织影`;
}

// ── Import: decode / decompress ──
async function decodeAndDecompress(b64) {
  try {
    const bytes = base64ToUint8Array(b64);

    // 对应导出的无压缩 fallback：先尝试直接解析
    try {
      const json = new TextDecoder().decode(bytes);
      // console.log('[import] decompressed length (direct):', json.length);
      // console.log('[import] json preview:', json.slice(0, 200));
      return JSON.parse(json);
    } catch {
      // 直接解析失败，说明是 gzip 压缩数据
    }

    if (typeof DecompressionStream === 'undefined') {
      return null;
    }

    try {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      await writer.write(bytes);
      await writer.close();

      const reader = ds.readable.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }
      const json = new TextDecoder().decode(combined);
      // console.log('[import] decompressed length (gzip):', json.length);
      // console.log('[import] json preview (gzip):', json.slice(0, 200));
      return JSON.parse(json);
    } catch {
      return null;
    }
  } catch (e) {
    console.warn('decodeAndDecompress failed:', e);
    return null;
  }
}

function validateProjectData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.parts)) return false;
  for (const part of data.parts) {
    if (!Array.isArray(part.rounds)) return false;
  }
  return true;
}

function validateImportData(data) {
  const errors = [];
  if (!data.name || data.name.trim() === '') {
    errors.push('项目名称为空');
  }
  if (!Array.isArray(data.parts) || data.parts.length === 0) {
    errors.push('项目不包含任何部件');
  }
  data.parts?.forEach((part, i) => {
    if (!Array.isArray(part.rounds)) {
      errors.push(`部件 ${i + 1} 缺少圈数据`);
    }
  });
  return errors;
}

// ═══════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════

export function openShareSheet(projId) {
  const proj = getProj(projId);
  if (!proj) return;

  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${t('share_pattern_title')}</div>

    <button class="sheet-item" onclick="window._copyTextPattern('${projId}');closeSheet()">
      <span class="sheet-item-icon">📝</span> ${escapeHtml(t('share_copy_text'))}
    </button>

    <button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>
  `;
  showSheet(html);
}

export function _copyTextPattern(projId) {
  const proj = getProj(projId);
  if (!proj) return;
  const text = generateTextPattern(proj);
  copyToClipboard(text).then(() => {
    showToast(t('share_copied'));
  }).catch(() => {
    showToast(t('share_copied'));
  });
};

export async function _doImportShared() {
  const textarea = document.getElementById('import-share-textarea');
  if (!textarea) return;
  const raw = textarea.value.trim();
  if (!raw) return;

  // console.log('[import] raw input length:', raw.length);
  // console.log('[import] KNIT1 match:', /KNIT1:(\S+)/.test(raw));

  const match = raw.match(/KNIT1:(\S+)/);
  if (!match || !match[1]) {
    showToast(t('import_share_error'));
    return;
  }

  const b64 = match[1];

  // 大小上界检查：base64 字符串过大
  if (b64.length > 500000) {
    showToast('文件过大，无法导入');
    return;
  }

  const data = await decodeAndDecompress(b64);
  if (!data || !validateProjectData(data)) {
    showToast(t('import_share_error'));
    return;
  }

  // 大小上界检查：解压后数据过大
  if (JSON.stringify(data).length > 10000000) {
    showToast('文件过大，无法导入');
    return;
  }

  // 防御性深拷贝：彻底切断与 state 中任何既有项目的引用关系
  const importData = JSON.parse(JSON.stringify(data));

  const errors = validateImportData(importData);
  if (errors.length > 0) {
    showToast(`导入失败：${errors[0]}`);
    console.warn('[import] validation failed:', errors);
    return;
  }

  // console.log('[import] raw data.name:', data.name);
  // console.log('[import] parsed proj name:', importData.name);
  // console.log('[import] parts count:', importData.parts?.length);
  // console.log('[import] first part rounds:', importData.parts?.[0]?.rounds?.length);
  // console.log('[import] first round seq:', importData.parts?.[0]?.rounds?.[0]?.seq?.length);

  const newId = uid();
  const roundIdMap = {}; // old round id -> new round id

  const parts = (importData.parts || []).map(part => {
    const newPartId = uid();
    const rounds = (part.rounds || []).map(r => {
      const newRoundId = uid();
      roundIdMap[r.id] = newRoundId;
      return {
        ...r,
        id: newRoundId,
        seq: r.seq || [],
        instruction: r.instruction || ''
      };
    });
    return {
      ...part,
      id: newPartId,
      rounds
    };
  });

  const proj = {
    id: newId,
    name: importData.name || t('imported_project'),
    useRowTerms: importData.useRowTerms || false,
    markers: (importData.markers || []).map(m => ({ ...m })),
    parts,
    activePartId: parts[0]?.id || null,
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  // console.log('[import] final proj.name:', proj.name);
  // console.log('[import] roundIdMap size:', Object.keys(roundIdMap).length);
  // console.log('[import] markers before remap:', importData.markers?.length);
  // console.log('[import] markers after remap:', proj.markers.length);

  // 重写记号扣 roundId 为新的 round id，找不到映射的保留原值
  if (proj.markers.length) {
    let updated = 0;
    proj.markers = proj.markers.map(m => {
      const mappedId = roundIdMap[m.roundId];
      if (mappedId) { updated++; }
      return { ...m, id: uid(), roundId: mappedId ?? m.roundId };
    });
    // console.log('[import] markers remapped:', updated, '/', proj.markers.length);
  }

  // 同步更新每个 part 的 activeRoundId
  proj.parts.forEach(part => {
    if (part.activeRoundId && roundIdMap[part.activeRoundId]) {
      part.activeRoundId = roundIdMap[part.activeRoundId];
    }
  });

  // 兼容 v12 旧数据：移除 clusterRanges，seq 保持单针
  proj.parts.forEach(part => {
    (part.rounds || []).forEach(r => {
      delete r.clusterRanges;
    });
  });

  // 询问导入模式：跟织模式 / 作为自己项目
  state.flowState.pendingImportProj = proj;

  // console.log('[import] showing mode dialog');

  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${t('import_mode_title')}</div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px">
      <div onclick="window._applyImportMode('follow')" style="background:var(--card);border:2px solid var(--accent);border-radius:14px;padding:18px 16px;cursor:pointer;">
        <div style="font-size:15px;font-weight:700;">${t('import_mode_follow')}</div>
        <div style="font-size:12px;color:var(--muted)">${t('import_mode_follow_sub')}</div>
      </div>
      <div onclick="window._applyImportMode('own')" style="background:var(--card);border:2px solid var(--border);border-radius:14px;padding:18px 16px;cursor:pointer;">
        <div style="font-size:15px;font-weight:700;">${t('import_mode_own')}</div>
        <div style="font-size:12px;color:var(--muted)">${t('import_mode_own_sub')}</div>
      </div>
    </div>
  `;
  showSheet(html);
};

export function _applyImportMode(mode) {
  const proj = state.flowState.pendingImportProj;
  if (!proj) return;
  state.flowState.pendingImportProj = null;

  if (mode === 'own') {
    // 作为自己项目：清空 seq，只保留图解文字
    proj.parts.forEach(part => {
      part.rounds.forEach(r => {
        r.seq = [];
      });
    });
  }
  if (mode === 'follow') {
    proj.isFollowMode = true;
    proj.parts.forEach((part, pi) => {
      (part.rounds || []).forEach((r, ri) => {
        r.followProgress = 0;
        // console.log(`[import] part${pi} round${ri} id:${r.id} seq:${r.seq?.length} followProgress:${r.followProgress}`);
      });
    });
    // console.log('[import] isFollowMode:', proj.isFollowMode);
  }

  // 打印每个 part 的 activeRoundId
  // proj.parts.forEach((part, i) => {
  //   console.log(`[import] part${i} activeRoundId:`, part.activeRoundId);
  // });

  // 合并到已有空白项目，保留用户命名的项目名称
  const existingProj = getProj(state.curProjId);
  if (existingProj) {
    existingProj.parts = proj.parts;
    existingProj.markers = proj.markers || [];
    existingProj.isFollowMode = proj.isFollowMode || false;
    existingProj.useRowTerms = proj.useRowTerms || false;
    existingProj.activePartId = proj.activePartId;
    existingProj.lastModified = Date.now();
    // 保留 existingProj.name 和 existingProj.id
    // console.log('[import] merged into existing project:', existingProj.id, existingProj.name);
  } else {
    // fallback：没有现有项目时才新建
    state.data.projects.push(proj);
    state.curProjId = proj.id;
    // console.log('[import] pushed new project:', proj.id, proj.name);
  }

  saveData();
  state.flowState.importMode = null; // 防止 closeSheet 触发创建方式选择
  state.flowState.importSourceProjId = null;
  state.flowState.newProjectFlow = false; // 防止 closeSheet 触发 renderProject
  closeSheet();

  document.documentElement.classList.add('in-project');
  window.renderProject();
};
