import { state, uid, getProj, getActivePart } from './state.js';
import { showConfirmDialog } from './ui.js';
import { saveData } from './storage.js';

export function addPart() {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const prevPart = getActivePart(proj);
  const r = { id: uid(), roundNum: 0, instruction: '', seq: [], isTextCard: false };
  const part = {
    id: uid(),
    title: `部件 ${(proj.parts || []).length + 1}`,
    rawPattern: '',
    rounds: [r],
    activeRoundId: r.id,
    customPalette: prevPart?.customPalette ? [...prevPart.customPalette] : null
  };
  proj.parts = proj.parts || [];
  proj.parts.push(part);
  proj.activePartId = part.id;
  saveData();
  window.renderProject();
}

export function switchPart(partId) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  if (window.editingPartId !== null && window.editingPartId !== partId) {
    window.editingPartId = null;
  }
  proj.activePartId = partId;
  saveData();
  window.renderProject();
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
  console.log('Action Triggered: startEditPartName', partId);
  window.editingPartId = partId;
  const input = icon.previousElementSibling;
  const span = input.previousElementSibling;
  span.style.display = 'none';
  input.style.display = '';
  input.focus();
}

export function partNameBlur(input, partId) {
  console.log('Action Triggered: partNameBlur', partId, input.value.trim());
  renamePart(partId, input.value.trim());
  window.editingPartId = null;
  window.renderProject();
}

export function renamePart(partId, name) {
  if (!name || !state.curProjId) return;
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const pt = (proj.parts || []).find(p => p.id === partId);
  if (pt) { pt.title = name; saveData(); }
}

export function deletePart(partId) {
  console.log('Action Triggered: deletePart', partId);
  const proj = getProj(state.curProjId);
  if (!proj) return;
  if (!proj.parts || proj.parts.length <= 1) return;
  showConfirmDialog("确定删除这个部件及其中所有记录？此操作不可撤销。", (ok) => {
    if (!ok) return;
    proj.parts = proj.parts.filter(pt => pt.id !== partId);
    if (proj.activePartId === partId) proj.activePartId = proj.parts[0].id;
    saveData();
    window.renderProject();
  });
}
