import { state, uid, getProj, getActivePart } from './state.js';
import { showConfirmDialog, showToast } from './ui.js';
import { saveData } from './storage.js';
import { normalizeRoundNums } from './pattern.js';
import { getUnitLabel, renderDynamicPalette, renderFilterToggle, renderBarRow, renderTaskSlide } from './stitch.js';
import { updateVoiceButton } from './voice.js';

export function addRound() {
  const proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const r = { id: uid(), seq: [], instruction: "", isTextCard: false };
  part.rounds.push(r);
  normalizeRoundNums(part.rounds);
  state.expandedRounds.add(r.id);
  saveData();
  setActiveRound(proj, r.id);
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
  showConfirmDialog(`确定要删除这一${unit}吗？`, (ok) => {
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
      const r = { id: uid(), seq: [], instruction: "", isTextCard: false };
      ownerPart.rounds.push(r);
      ownerPart.activeRoundId = r.id;
      state._lastDeletedRound = null;
    }

    normalizeRoundNums(ownerPart.rounds);
    saveData();
    window.renderProject();

    if (state._lastDeletedRound) {
      showToast(`已删除一${unit}`, {
        label: '撤销',
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
  saveData();
  window.renderProject();

  showToast('已恢复');
}

export function setActiveRound(proj, rid) {
  if (!proj) proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const oldRid = part.activeRoundId;
  if (oldRid === rid) return;

  part.activeRoundId = rid;
  saveData();

  const oldIdx = part.rounds.findIndex(r => r.id === oldRid);
  const newIdx = part.rounds.findIndex(r => r.id === rid);
  const oldRound = oldIdx >= 0 ? part.rounds[oldIdx] : null;
  const newRound = newIdx >= 0 ? part.rounds[newIdx] : null;

  function roundLabelHtml(r, idx, isActive) {
    const unit = getUnitLabel(proj);
    const base = r.isTextCard
      ? (r.instruction || "备注")
      : (r.roundNum === 0 ? "起针" : `第 ${r.roundNum != null ? r.roundNum : idx + 1} ${unit}`);
    return isActive
      ? base + " <span style='font-size:10px;background:var(--accent);color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px'>编辑中</span>"
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

  const bar = document.getElementById("bottom-bar");
  if (bar) {
    let bhtml = renderDynamicPalette(proj);
    bhtml += renderFilterToggle();
    bhtml += renderBarRow();
    bar.innerHTML = bhtml;
    updateVoiceButton();
  }

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
