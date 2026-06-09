import { state, uid, getProj, getActivePart, isPartEmpty } from './state.js';
import { showSheet, closeSheet, showToast, escapeHtml, showConfirmDialog } from './ui.js';
import { saveData } from './storage.js';
import { parsePattern, extractStitches } from '../stitches.js';
import { setPageView } from './main.js';
import { t, term } from './i18n.js';

const MAX_ROUNDS = 200;

let _confirmRounds = null;

export function startImportFlow() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  window._popPopupState?.();
  state.flowState.importMode = 'create';
  openPatternPasteSheet();
}

export function startManualFlow() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  window._popPopupState?.();
  window.openMultiRoundEditor(state.curProjId);
}

export function startStitchOnlyFlow() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  window._popPopupState?.();
  window.openStitchSetup('create');
}

export function dismissEntryChoice() {
  state.flowState.newProjectFlow = false;
  closeSheet();
  window.renderProject();
}

export function toggleSelectAllInSetup() {
  const buttons = document.querySelectorAll('[id^="setup-btn-"]');
  if (buttons.length === 0) return;
  const allChecked = Array.from(buttons).every(b => b.dataset.checked === 'true');
  buttons.forEach(b => {
    if (allChecked) {
      b.dataset.checked = 'false';
      b.style.background = 'var(--bg)';
      b.style.color = 'var(--text)';
      b.style.borderColor = 'var(--border)';
    } else {
      b.dataset.checked = 'true';
      const color = b.dataset.color;
      b.style.background = color;
      b.style.color = '#fff';
      b.style.borderColor = color;
    }
  });
  const allBtn = document.getElementById('select-all-btn');
  if (allBtn) allBtn.textContent = allChecked ? t('select_all') : t('clear_all');
}

export function startImportFromSetup() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  state.flowState.importMode = 'create';
  state.flowState.setupMode = null;
  openPatternPasteSheet();
}

export function openPatternPasteSheet() {
  state.flowState.pendingParsed = null;
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">${t('import_pattern')}</div>
  <div style="padding:12px 16px">
    <textarea id="pattern-input" placeholder="${t('pattern_placeholder').replace(/\n/g, '&#10;')}"
    style="width:100%;height:120px;border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;font-family:inherit;resize:none;outline:none;background:var(--bg);color:var(--text)"></textarea>
  </div>
  <div style="padding:0 16px 10px;display:flex;gap:8px;align-items:center">
    <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1.5px dashed var(--border);border-radius:10px;background:var(--bg);cursor:pointer;color:var(--muted);font-size:13px;font-weight:600">
      <input type="file" id="ocr-file" accept="image/*" style="display:none" onchange="handleOCR(this)">
      ${t('ocr_button')}
    </label>
    <button class="bar-btn primary" style="flex:2" onclick="handleParsePattern()">${t('parse_preview')}</button>
  </div>
  <div id="ocr-status" style="padding:0 16px 10px;font-size:12px;color:var(--muted);display:none"></div>
  <div style="padding:0 16px 12px;font-size:11px;color:var(--muted);line-height:1.6;text-align:center">${t('ocr_android_notice')}</div>
  <button class="sheet-cancel" onclick="cancelPasteSheet()">${t('cancel')}</button>`;
  showSheet(html);
  setTimeout(() => document.getElementById('pattern-input').focus(), 100);
}

export function cancelPasteSheet() {
  const wasImport = state.flowState.importMode === 'create';
  state.flowState.importMode = null;
  closeSheet();
  if (wasImport) window.showEntryChoiceSheet();
}

export function handleParsePattern() {
  const text = document.getElementById('pattern-input').value;
  if (!text.trim()) {
    alert(t('pattern_empty_error'));
    return;
  }
  const parsed = parsePattern(text);
  if (parsed.length === 0) {
    alert(t('pattern_parse_failed'));
    return;
  }
  state.flowState.pendingParsed = parsed;
  openParseConfirmSheet(parsed);
}

// ── Tesseract.js 懒加载 ──
let _tesseractLoaded = false;
let _tesseractLoading = false;

export function showLoading(text) {
  const mask = document.getElementById('loading-mask');
  const txt = document.getElementById('loading-text');
  if (txt) txt.textContent = text || t('loading');
  if (mask) mask.classList.add('show');
}

export function hideLoading() {
  const mask = document.getElementById('loading-mask');
  if (mask) mask.classList.remove('show');
}

export function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (_tesseractLoaded) return resolve();
    if (_tesseractLoading) {
      const check = () => {
        if (_tesseractLoaded) resolve();
        else if (!_tesseractLoading) reject(new Error(t('tesseract_load_failed')));
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    _tesseractLoading = true;
    const script = document.createElement('script');
    script.src = './lib/tesseract.min.js';
    script.onload = () => { _tesseractLoaded = true; _tesseractLoading = false; resolve(); };
    script.onerror = () => { _tesseractLoading = false; reject(new Error(t('tesseract_script_failed'))); };
    document.head.appendChild(script);
  });
}

export async function handleOCR(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('ocr-status');
  const textarea = document.getElementById('pattern-input');
  if (status) {
    status.style.display = 'block';
    status.style.color = 'var(--muted)';
    status.textContent = t('ocr_initializing');
  }

  try {
    showLoading(t('ocr_loading_engine'));
    await loadTesseract();
    hideLoading();

    if (status) status.textContent = t('ocr_in_progress_zero');

    const result = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: m => {
        if (m.status === 'recognizing text' && status) {
          status.textContent = t('ocr_in_progress') + ` ${(m.progress * 100).toFixed(0)}%`;
        }
      }
    });
    const text = result.data.text;
    if (textarea) textarea.value = text;
    if (status) {
      status.textContent = t('ocr_complete');
      status.style.color = 'var(--accent)';
    }
  } catch (err) {
    hideLoading();
    console.error('OCR 失败:', err);
    if (status) {
      status.textContent = t('ocr_failed');
      status.style.color = '#E07070';
    }
  }
}

export function openParseConfirmSheet(parsed) {
  if (parsed.length > MAX_ROUNDS) {
    showToast(`图解包含 ${parsed.length} 圈，超出上限 ${MAX_ROUNDS} 圈，已截取前 ${MAX_ROUNDS} 圈，其余可手动补充`);
    parsed = parsed.slice(0, MAX_ROUNDS);
  }
  _confirmRounds = parsed;
  const roundCount = parsed.filter(p => p.type === 'round').length;
  const textCount = parsed.filter(p => p.type === 'text').length;

  const proj = getProj(state.curProjId);
  const unit = window.getUnitLabel(proj);
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">${t('parse_confirm_title').replace('{rounds}', roundCount).replace('{unit}', unit).replace('{texts}', textCount)}</div>
  <div style="max-height:50vh;overflow-y:auto;padding:0 4px">`;

  parsed.forEach((item, idx) => {
    const badge = item.type === 'round'
      ? `<span style="display:inline-block;background:var(--accent);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:6px;flex-shrink:0">${t('round_label').replace('{n}', item.roundNum).replace('{unit}', unit)}</span>`
      : `<span style="display:inline-block;background:var(--border);color:var(--muted);font-size:10px;padding:2px 6px;border-radius:4px;margin-right:6px;flex-shrink:0">${t('text_card_badge')}</span>`;

    html += `<div class="sheet-item" style="padding:10px 16px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">${badge}</div>
        <input id="edit-${idx}" value="${escapeHtml(item.instruction)}"
          placeholder="${t('confirm_round_placeholder')}"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;font-family:inherit"
          onchange="updatePendingInstruction(${idx}, this.value)">
        ${item.seq && item.seq.length ? `<div style="font-size:11px;color:var(--muted);margin-top:3px">${t('detected_stitches')}${[...new Set(item.seq)].map(s => (s && typeof s === 'object' && s.type === 'cluster') ? s.raw : s).join(' · ')}</div>` : ''}
      </div>
      <button onclick="removeParsedItem(${idx})" style="background:none;border:none;color:#D0B0A0;font-size:20px;padding:4px 8px;cursor:pointer;line-height:1;margin-top:20px">×</button>
    </div>`;
  });

  html += `</div>
  <button class="pattern-add-round-btn" onclick="addConfirmRound()">${t('add_confirm_round')}</button>`;
  const currentPart = proj ? getActivePart(proj) : null;
  const isEmpty = isPartEmpty(currentPart);

  if (isEmpty) {
    html += `<div style="padding:10px 16px">
    <button class="bar-btn primary" style="width:100%;animation:scale-in 0.25s ease-out" onclick="updateCurrentPart()">${t('confirm_import_start')}</button>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-top:6px">${t('import_to_empty_hint')}</div>
  </div>`;
  } else {
    html += `<div style="padding:10px 16px;display:flex;gap:8px">
    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
      <button class="bar-btn" style="width:100%" onclick="updateCurrentPart()">${t('overwrite_part')}</button>
      <span style="font-size:10px;color:var(--muted);text-align:center">${t('overwrite_warning')}</span>
    </div>
    <div style="flex:2;display:flex;flex-direction:column;gap:4px">
      <button class="bar-btn primary" style="width:100%;animation:scale-in 0.25s ease-out" onclick="addNewPart()">${t('import_as_new_part')}</button>
      <span style="font-size:10px;color:var(--muted);text-align:center">${t('import_new_part_hint')}</span>
    </div>
  </div>`;
  }
  html += `<button class="sheet-cancel" onclick="openPatternPasteSheet()">${t('back_to_edit')}</button>`;

  showSheet(html);
}

export function updatePendingInstruction(idx, value) {
  if (state.flowState.pendingParsed && state.flowState.pendingParsed[idx]) {
    state.flowState.pendingParsed[idx].instruction = value.trim();
  }
}

export function removeParsedItem(idx) {
  if (!_confirmRounds) return;

  state._lastRemovedParsedItem = {
    item: JSON.parse(JSON.stringify(_confirmRounds[idx])),
    index: idx,
    confirmRoundsSnapshot: JSON.parse(JSON.stringify(_confirmRounds))
  };

  _confirmRounds.splice(idx, 1);
  if (_confirmRounds.length === 0) {
    closeSheet();
    _confirmRounds = null;
    state.flowState.pendingParsed = null;
    state._lastRemovedParsedItem = null;
    return;
  }
  openParseConfirmSheet(_confirmRounds);

  showToast(t('removed_item'), {
    label: t('undo'),
    onClick: undoRemoveParsedItem
  }, 5000);
}

export function undoRemoveParsedItem() {
  if (!state._lastRemovedParsedItem) return;
  const { item, index, confirmRoundsSnapshot } = state._lastRemovedParsedItem;
  state._lastRemovedParsedItem = null;

  _confirmRounds = confirmRoundsSnapshot;
  _confirmRounds.splice(index, 0, item);
  state.flowState.pendingParsed = _confirmRounds;
  openParseConfirmSheet(_confirmRounds);

  showToast(t('restored'));
}

export function addConfirmRound() {
  if (!_confirmRounds) return;
  const roundCount = _confirmRounds.filter(r => r.type === 'round').length;
  _confirmRounds.push({ type: 'round', instruction: '', roundNum: roundCount + 1, seq: [] });
  openParseConfirmSheet(_confirmRounds);
}

export function confirmImport(mode) {
  const parsed = _confirmRounds;
  if (!parsed || parsed.length === 0) {
    closeSheet();
    _confirmRounds = null;
    state.flowState.pendingParsed = null;
    return;
  }

  const proj = getProj(state.curProjId);
  if (!proj) return;

  let targetPart;
  if (mode === 'newPart') {
    // 创建新部件
    const partId = uid();
    targetPart = { id: partId, title: t('new_part_label') + (proj.parts.length + 1), rawPattern: '', rounds: [], activeRoundId: null, customPalette: null };
    proj.parts.push(targetPart);
    proj.activePartId = partId;
  } else {
    // 覆盖当前部件
    targetPart = getActivePart(proj);
    if (!targetPart) return;
    // 清理默认空圈
    if (targetPart.rounds.length === 1) {
      const only = targetPart.rounds[0];
      if (only.seq.length === 0 && !only.instruction && !only.isTextCard) {
        targetPart.rounds.pop();
      }
    }
  }

  // 追加解析结果到目标 part
  parsed.forEach((item, idx) => {
    const input = document.getElementById(`edit-${idx}`);
    const instruction = input ? input.value.trim() : item.instruction;
    const round = {
      id: uid(),
      seq: [],
      instruction,
      isTextCard: item.type === 'text',
      roundNum: item.roundNum,
      completed: false
    };
    // 粘贴图解：只保留 instruction 文字，seq 由用户后续钩织产生
    targetPart.rounds.push(round);
  });

  // 将第一圈设为活跃圈
  const firstRound = targetPart.rounds[0];
  const lastRound = targetPart.rounds[targetPart.rounds.length - 1];
  targetPart.activeRoundId = firstRound.id;
  state.expandedRounds.add(firstRound.id);

  // 自动配置 customPalette 为解析识别出的针法（cluster 展开为内层 stitches）
  const detectedIds = new Set();
  parsed.forEach(item => {
    if (item.seq) {
      item.seq.forEach(sid => {
        if (sid && typeof sid === 'object' && sid.type === 'cluster') {
          sid.stitches.forEach(innerSid => detectedIds.add(innerSid));
        } else {
          detectedIds.add(sid);
        }
      });
    }
  });
  if (detectedIds.size > 0) {
    targetPart.customPalette = Array.from(detectedIds);
  }
  state.flowState.importMode = null;
  state.flowState.newProjectFlow = false;

  window.normalizeRoundNums(targetPart.rounds);

  _confirmRounds = null;
  state.flowState.pendingParsed = null;
  proj.lastModified = Date.now();
  saveData();
  closeSheet();
  setPageView(null);
  window.renderProject();
  showToast(t('pattern_synced') + targetPart.title);
  setTimeout(() => {
    const firstRound = targetPart.rounds[0];
    const el = document.getElementById('round-' + firstRound.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

export function updateCurrentPart() {
  confirmImport('overwrite');
}

export function addNewPart() {
  confirmImport('newPart');
}

export function normalizeRoundNums(rounds) {
  let n = 1;
  for (const r of rounds) {
    if (r.isTextCard) {
      r.roundNum = null;
    } else if (r.roundNum === 0) {
      // 起针保持 0
    } else {
      r.roundNum = n++;
    }
  }
}
