import { state, uid, getProj, getActivePart } from './state.js';
import { showConfirmDialog } from './ui.js';
import { saveData } from './storage.js';
import { saveLastPosition, checkResumePosition } from './stitch.js';
import { t } from './i18n.js';

export function addPart() {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const prevPart = getActivePart(proj);
  const r = { id: uid(), roundNum: 0, instruction: '', seq: [], isTextCard: false, completed: false, notes: "" };
  const part = {
    id: uid(),
    title: t('part_default_name').replace('{n}', (proj.parts || []).length + 1),
    rawPattern: '',
    rounds: [r],
    activeRoundId: r.id,
    customPalette: prevPart?.customPalette ? [...prevPart.customPalette] : null,
    lastPosition: null
  };
  proj.parts = proj.parts || [];
  proj.parts.push(part);
  proj.activePartId = part.id;
  proj.lastModified = Date.now();
  saveData();
  window.renderProject();
}

export function switchPart(partId) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  if (window.editingPartId !== null && window.editingPartId !== partId) {
    window.editingPartId = null;
  }
  // 切换前保存当前部件位置
  const prevPart = getActivePart(proj);
  if (prevPart && prevPart.id !== partId) {
    saveLastPosition(proj, prevPart);
  }
  proj.activePartId = partId;
  saveData();
  window.renderProject();
  // 渲染完成后检查新部件是否有可恢复位置
  const newPart = proj.parts.find(p => p.id === partId);
  if (newPart && newPart.lastPosition) {
    setTimeout(() => checkResumePosition(proj, newPart), 100);
  }
}

export function handleEditBtnClick(event, partId, el) {
  event.preventDefault();
  event.stopPropagation();
  if (window.editingPartId === partId) {
    el.previousElementSibling.blur();
  } else {
    startEditPartName(el, partId);
  }
}

export function handleDeleteBtnClick(event, partId) {
  event.preventDefault();
  event.stopPropagation();
  deletePart(partId);
}

export function startEditPartName(icon, partId) {
  window.editingPartId = partId;
  const input = icon.previousElementSibling;
  const span = input.previousElementSibling;
  span.style.display = 'none';
  input.style.display = '';
  input.focus();
}

export function partNameBlur(input, partId) {
  renamePart(partId, input.value.trim());
  window.editingPartId = null;
  window.renderProject();
}

export function renamePart(partId, name) {
  if (!name || !state.curProjId) return;
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const pt = (proj.parts || []).find(p => p.id === partId);
  if (pt) { pt.title = name; proj.lastModified = Date.now(); saveData(); }
}

export function deletePart(partId) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  if (!proj.parts || proj.parts.length <= 1) return;
  showConfirmDialog(t('delete_part_confirm'), (ok) => {
    if (!ok) return;

    const idx = proj.parts.findIndex(pt => pt.id === partId);
    if (idx === -1) return;

    state._lastDeletedPart = {
      part: JSON.parse(JSON.stringify(proj.parts[idx])),
      index: idx,
      prevActivePartId: proj.activePartId
    };

    proj.parts.splice(idx, 1);
    if (proj.activePartId === partId) proj.activePartId = proj.parts[0].id;
    proj.lastModified = Date.now();
    saveData();
    window.renderProject();

    showToast(t('deleted_part'), {
      label: t('undo'),
      onClick: undoDeletePart
    }, 5000);
  });
}

export function undoDeletePart() {
  if (!state._lastDeletedPart) return;
  const { part, index, prevActivePartId } = state._lastDeletedPart;
  state._lastDeletedPart = null;

  const proj = getProj(state.curProjId);
  if (!proj) return;

  proj.parts.splice(index, 0, part);
  proj.activePartId = prevActivePartId;
  proj.lastModified = Date.now();
  saveData();
  window.renderProject();

  showToast(t('restored'));
}
