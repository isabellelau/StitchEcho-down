import { state, uid, getProj, getActivePart } from './state.js';
import { showConfirmDialog, showToast, showSheet, closeSheet, escapeHtml } from './ui.js';
import { saveData } from './storage.js';
import { t, term } from './i18n.js';
import { normalizeRoundNums } from './pattern.js';
import { getUnitLabel, refreshBottomBar, renderFilterToggle, renderTaskSlide, renderImmersive, getProjColor, countSeqStitches } from './stitch.js';

export function addRound() {
  const proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;

  // 收集当前部件中有 seq 数据的圈（用于复制结构）
  const roundsWithSeq = [];
  part.rounds.forEach(r => {
    if (r.seq && r.seq.length > 0) {
      roundsWithSeq.push({ round: r, part });
    }
  });

  if (roundsWithSeq.length > 0) {
    // 显示 Sheet 提供空白 / 复制选项
    const unit = getUnitLabel(proj);
    let itemsHtml = '';
    roundsWithSeq.forEach(({ round, part: pt }, i) => {
      const total = countSeqStitches(round.seq);
      const dots = round.seq.slice(-6).map(sid => {
        const c = getProjColor(sid);
        return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${c};margin-right:1px;flex-shrink:0"></span>`;
      }).join('');
      const rn = round.roundNum != null ? round.roundNum : (pt.rounds.indexOf(round) + 1);
      const label = round.isTextCard
        ? (round.instruction || t('note'))
        : (round.roundNum === 0 ? term('cast_on') : t('round_label').replace('{n}', rn).replace('{unit}', unit));
      itemsHtml += `<div class="sheet-item" onclick="copyRoundStructure('${round.id}')">
        <div class="sheet-item-icon" style="background:var(--accent-bg);color:var(--accent);font-size:13px">↻</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;color:var(--text)">${escapeHtml(label)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px;display:flex;align-items:center;gap:3px">${total} ${term('stitches')} ${dots}</div>
        </div>
      </div>`;
    });

    const html = `<div class="sheet-handle"></div>
    <div class="sheet-title">${t('add_round_sheet_title').replace('{unit}', unit)}</div>
    <div class="sheet-item" onclick="addRoundBlank()">
      <div class="sheet-item-icon" style="background:var(--accent-bg);color:var(--accent);font-size:16px">＋</div>
      <div><div class="sheet-item-label">${t('add_round_blank').replace('{unit}', unit)}</div></div>
    </div>
    <div class="sheet-divider"></div>
    <div class="sheet-section">${t('copy_structure_from')}</div>
    ${itemsHtml}
    <div style="padding:10px 14px">
      <button class="sheet-cancel" style="width:100%;margin:0" onclick="closeSheet()">${t('cancel')}</button>
    </div>`;

    showSheet(html);
    return;
  }

  // No rounds with seq — create empty round directly
  addRoundBlank();
}

export function toggleRoundComplete(roundId) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  let found = false;
  for (const part of proj.parts) {
    const r = part.rounds.find(r => r.id === roundId);
    if (r) {
      r.completed = !r.completed;
      found = true;
      break;
    }
  }
  if (!found) return;
  saveData();
  window.renderProject?.();
}

export function addRoundBlank() {
  const proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const r = { id: uid(), seq: [], instruction: "", isTextCard: false, completed: false, notes: "" };
  part.rounds.push(r);
  normalizeRoundNums(part.rounds);
  state.expandedRounds.add(r.id);
  proj.lastModified = Date.now();
  saveData();
  setActiveRound(proj, r.id);
  closeSheet();
  window.renderProject();
  setTimeout(() => {
    const el = document.getElementById("round-" + r.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

export function toggleRound(rid) {
  const wasExpanded = state.expandedRounds.has(rid);
  if (wasExpanded) state.expandedRounds.delete(rid);
  else state.expandedRounds.add(rid);

  const roundEl = document.getElementById("round-" + rid);
  if (roundEl) {
    const body = roundEl.querySelector('.round-body');
    const chev = roundEl.querySelector('.round-chev');
    if (body) body.classList.toggle('open', !wasExpanded);
    if (chev) chev.classList.toggle('open', !wasExpanded);
  } else {
    window.renderProject();
  }
}

export function deleteRound(roundId) {
  const proj = getProj(state.curProjId);
  if (!proj) return;

  let ownerPart = null;
  for (const p of proj.parts) {
    if (p.rounds.find(r => r.id === roundId)) { ownerPart = p; break; }
  }
  if (!ownerPart) return;

  const unit = getUnitLabel(proj);
  showConfirmDialog(t('delete_round_confirm').replace('{unit}', unit), (ok) => {
    if (!ok) return;

    const idx = ownerPart.rounds.findIndex(r => r.id === roundId);
    if (idx === -1) return;

    state._lastDeletedRound = {
      round: JSON.parse(JSON.stringify(ownerPart.rounds[idx])),
      partId: ownerPart.id,
      index: idx,
      prevActiveRoundId: ownerPart.activeRoundId
    };

    ownerPart.rounds.splice(idx, 1);

    if (ownerPart.activeRoundId === roundId) {
      const last = ownerPart.rounds[ownerPart.rounds.length - 1];
      ownerPart.activeRoundId = last ? last.id : null;
    }

    if (ownerPart.rounds.length === 0) {
      const r = { id: uid(), seq: [], instruction: "", isTextCard: false, completed: false, notes: "" };
      ownerPart.rounds.push(r);
      ownerPart.activeRoundId = r.id;
      state._lastDeletedRound = null;
    }

    normalizeRoundNums(ownerPart.rounds);
    proj.lastModified = Date.now();
    saveData();
    window.renderProject();

    if (state._lastDeletedRound) {
      showToast(t('deleted_round').replace('{unit}', unit), {
        label: t('undo'),
        onClick: undoDeleteRound
      }, 5000);
    }
  });
}

export function undoDeleteRound() {
  if (!state._lastDeletedRound) return;
  const { round, partId, index, prevActiveRoundId } = state._lastDeletedRound;
  state._lastDeletedRound = null;

  const proj = getProj(state.curProjId);
  if (!proj) return;

  const part = proj.parts.find(p => p.id === partId);
  if (!part) return;

  part.rounds.splice(index, 0, round);

  part.activeRoundId = prevActiveRoundId;

  normalizeRoundNums(part.rounds);
  proj.lastModified = Date.now();
  saveData();
  window.renderProject();

  showToast(t('restored'));
}

export function setActiveRound(proj, rid) {
  if (!proj) proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const oldRid = part.activeRoundId;
  if (oldRid === rid) return;

  part.activeRoundId = rid;
  proj.lastModified = Date.now();
  saveData();

  if (state.immersiveMode) {
    renderImmersive(proj);
    return;
  }

  const oldIdx = part.rounds.findIndex(r => r.id === oldRid);
  const newIdx = part.rounds.findIndex(r => r.id === rid);
  const oldRound = oldIdx >= 0 ? part.rounds[oldIdx] : null;
  const newRound = newIdx >= 0 ? part.rounds[newIdx] : null;

  function roundLabelHtml(r, idx, isActive) {
    const unit = getUnitLabel(proj);
    const base = r.isTextCard
      ? (escapeHtml(r.instruction) || t('note'))
      : (r.roundNum === 0 ? term('cast_on') : t('round_label').replace('{n}', r.roundNum != null ? r.roundNum : idx + 1).replace('{unit}', unit));
    return isActive
      ? base + ` <span style='font-size:10px;background:var(--accent);color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px'>${term('active')}</span>`
      : base;
  }

  if (oldRound) {
    const oldEl = document.getElementById("round-" + oldRid);
    if (oldEl) {
      const badge = oldEl.querySelector('.round-badge');
      if (badge) badge.classList.remove('active');
      const label = oldEl.querySelector('.round-label');
      if (label) label.innerHTML = roundLabelHtml(oldRound, oldIdx, false);
    }
  }

  if (newRound) {
    const newEl = document.getElementById("round-" + rid);
    if (newEl) {
      const badge = newEl.querySelector('.round-badge');
      if (badge) badge.classList.add('active');
      const label = newEl.querySelector('.round-label');
      if (label) label.innerHTML = roundLabelHtml(newRound, newIdx, true);

      if (!state.expandedRounds.has(rid)) {
        state.expandedRounds.add(rid);
        const body = newEl.querySelector('.round-body');
        const chev = newEl.querySelector('.round-chev');
        if (body) body.classList.add('open');
        if (chev) chev.classList.add('open');
      }
    }
  }

  refreshBottomBar(proj);

  const slideText = document.getElementById('task-slide-text');
  if (slideText) {
    slideText.classList.add('fading');
    setTimeout(() => {
      const slide = document.getElementById('task-slide');
      if (slide) slide.outerHTML = renderTaskSlide(proj);
      requestAnimationFrame(() => {
        const el = document.getElementById('task-slide-text');
        if (el) el.classList.remove('fading');
      });
    }, 250);
  } else {
    const slide = document.getElementById('task-slide');
    if (slide) slide.outerHTML = renderTaskSlide(proj);
  }

}

// ── 简约模式原文保留 ──

export function showOriginalInstruction(roundId) {
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  if (!r || r.originalInstruction == null) return;
  const original = r.originalInstruction;

  showSheet(`
    <div class="sheet-handle"></div>
    <div class="sheet-title">${t('original_instruction_title')}</div>
    <div class="simple-original-content">${escapeHtml(original)}</div>
    <div style="padding: 0 16px 8px;">
      <button class="sheet-item" style="color:var(--accent)"
              onclick="restoreOriginalInstruction('${roundId}')">
        ${t('original_instruction_restore')}
      </button>
      <button class="sheet-cancel" onclick="closeSheet()">
        ${t('cancel')}
      </button>
    </div>
  `);
}

export function restoreOriginalInstruction(roundId) {
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  if (!r || r.originalInstruction == null) return;

  r.instruction = r.originalInstruction;
  r.originalInstruction = null;
  closeSheet();
  saveData();
  window.renderProject?.();
}

// ═════════════════════════════════════
//  Long-press context menu on round cards
// ═════════════════════════════════════

function _getRoundAndPart(roundId) {
  const proj = getProj(state.curProjId);
  if (!proj) return { proj: null, part: null, round: null };
  for (const p of proj.parts) {
    const r = p.rounds.find(r => r.id === roundId);
    if (r) return { proj, part: p, round: r };
  }
  return { proj, part: null, round: null };
}

export function showRoundContextMenu(roundId) {
  const { proj, round } = _getRoundAndPart(roundId);
  if (!proj || !round) return;

  const isSimple = proj.mode === 'simple';

  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">${t('round_label').replace('{n}', round.roundNum != null ? round.roundNum : '?').replace('{unit}', getUnitLabel(proj))}</div>
  <div class="sheet-item" onclick="openRoundNotes('${roundId}');closeSheet()">
    <span class="sheet-item-icon">📝</span>
    <span class="sheet-item-label">${t('round_context_notes')}</span>
  </div>
  <div class="sheet-item" onclick="insertRoundAfter('${roundId}');closeSheet()">
    <span class="sheet-item-icon">＋</span>
    <span class="sheet-item-label">${t('round_context_insert')}</span>
  </div>`;

  if (isSimple) {
    html += `
  <div class="sheet-divider"></div>
  <div class="sheet-item sheet-del" onclick="deleteRound('${roundId}');closeSheet()">
    <span class="sheet-item-icon" style="background:var(--danger-bg);color:var(--danger)">✕</span>
    <span class="sheet-item-label">${t('round_context_delete')}</span>
  </div>`;
  }

  html += `
  <div class="sheet-divider"></div>
  <button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>`;

  showSheet(html);
}

export function openRoundNotes(roundId) {
  const { proj, round } = _getRoundAndPart(roundId);
  if (!proj || !round) return;

  // Initialize notes field if missing
  if (round.notes == null) round.notes = '';

  const escapedNotes = escapeHtml(round.notes);
  const placeholder = escapeHtml(t('round_notes_placeholder'));

  const html = `<div class="sheet-handle"></div>
  <div class="sheet-title">${t('round_notes_title')}</div>
  <div style="padding:0 16px 12px">
    <textarea id="round-notes-textarea" class="instr-editor-textarea" style="display:block;min-height:120px;resize:vertical" placeholder="${placeholder}" inputmode="text" autocapitalize="sentences">${escapedNotes}</textarea>
  </div>
  <div style="display:flex;gap:8px;padding:0 16px 10px">
    <button class="dialog-btn" onclick="closeSheet()" style="flex:1">${t('cancel')}</button>
    <button class="dialog-btn ok" onclick="saveRoundNotes('${roundId}')" style="flex:1">${t('confirm')}</button>
  </div>`;

  showSheet(html);

  setTimeout(() => {
    const ta = document.getElementById('round-notes-textarea');
    if (ta) { ta.focus(); ta.click(); }
  }, 200);
}

export function saveRoundNotes(roundId) {
  const { proj, round } = _getRoundAndPart(roundId);
  if (!proj || !round) return;

  const textarea = document.getElementById('round-notes-textarea');
  if (textarea) {
    round.notes = textarea.value.trim();
    proj.lastModified = Date.now();
    saveData();
    closeSheet();
    window.renderProject?.();
  }
}

export function insertRoundAfter(roundId) {
  const { proj, part } = _getRoundAndPart(roundId);
  if (!proj || !part) return;

  const idx = part.rounds.findIndex(r => r.id === roundId);
  if (idx === -1) return;

  const r = { id: uid(), seq: [], instruction: '', isTextCard: false, completed: false, notes: '' };
  part.rounds.splice(idx + 1, 0, r);
  normalizeRoundNums(part.rounds);
  state.expandedRounds.add(r.id);
  proj.lastModified = Date.now();
  saveData();

  const unit = getUnitLabel(proj);
  showToast(t('round_inserted'), null, 2000);
  window.renderProject?.();

  setTimeout(() => {
    const el = document.getElementById('round-' + r.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}
