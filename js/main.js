import { STITCH_LIB, COLOR_THEMES, OLD_ID_MAP, ALIAS_TO_ID, STITCHES, SM, parsePattern, extractStitches, normalizeStitch, resolveColor } from '../stitches.js';
import { state, NUMBER_MAP, uid, getProj, getActivePart, isPartEmpty, getEditingPartId } from './state.js';
import { saveData, loadData, migrateData, exportPDF, exportData, exportSingleProject } from './storage.js';
import { esc, showToast, showSheet, closeSheet, showEntryChoiceSheet, showConfirmDialog, confirmDialog, closeDialog } from './ui.js';
import { playSound, initRecognition, toggleVoiceMode, setVoicePulse, updateVoiceButton, openVoiceTutorial, dismissVoiceHint } from './voice.js';
import { openSettings, renderSettings, changeTheme, toggleVoiceDefault, toggleVoiceSound, clearAllData } from './settings.js';
import {
  startImportFlow, startManualFlow, dismissEntryChoice,
  toggleSelectAllInSetup, startImportFromSetup,
  openPatternPasteSheet, cancelPasteSheet, handleParsePattern,
  showLoading, hideLoading, loadTesseract, handleOCR,
  openParseConfirmSheet, removeParsedItem, confirmImport,
  updateCurrentPart, addNewPart, normalizeRoundNums
} from './pattern.js';
import {
  getUnitLabel, toggleRowTerms, getProjColor, renderSpillHTML, renderTaskSlide,
  editExpectedCount, renderDynamicPalette, toggleFilterByRound, renderFilterToggle,
  renderBarRow, pushStitch, undoStitch, stitchTap, changeStitch, deleteStitch,
  startInsert, doInsert, openStitchSetup, toggleSetupStitch, openStitchCustomize,
  saveStitchCustomize, resetStitchCustomize, backToSetupGrid, openNewStitchForm,
  saveNewStitch, deleteCustomStitch, saveProjectStitches, closeSetupSheet,
  triggerEdgeGlow
} from './stitch.js';
import {
  addRound, toggleRound, deleteRound, undoDeleteRound, setActiveRound
} from './round.js';
import {
  addPart, switchPart, renamePart, deletePart, startEditPartName,
  partNameBlur, handleEditBtnClick, handleDeleteBtnClick
} from './part.js';
import {
  showNewProjectDialog, openProject, renameProject, deleteProject, toggleProjMenu,
  archiveProject, showArchiveSuccessSheet, unarchiveProject, importData,
  handlePwaHintOptOut, showPwaTutorial, pickCover, setProjectCover, removeProjectCover
} from './project.js';
import { renderHome, renderProject } from './render.js';

window.state = state;
// ── navigation ──
function goHome() {
  state.curProjId = null; state.expandedRounds.clear(); state.selectedStitch = null;
  state.flowState.projMenuId = null;
  document.getElementById("bottom-bar").style.display = "none";
  document.getElementById("hdr-pdf").style.display = "none";
  document.getElementById("hdr-settings").style.display = "none";
  document.getElementById("tab-nav").style.display = "flex";
  state.currentTab = 'projects';
  updateTabNav();
  const screen = document.getElementById("screen");
  screen.classList.add("enter-back");
  screen.addEventListener("animationend", () => screen.classList.remove("enter-back"), { once: true });
  renderHome();
}

function switchTab(tab) {
  state.currentTab = tab;
  updateTabNav();
  if (tab === 'projects') {
    renderHome();
  } else if (tab === 'settings') {
    renderSettings();
  }
}

function updateTabNav() {
  const projBtn = document.getElementById('tab-projects');
  const setBtn = document.getElementById('tab-settings');
  if (projBtn) projBtn.classList.toggle('active', state.currentTab === 'projects');
  if (setBtn) setBtn.classList.toggle('active', state.currentTab === 'settings');
}

document.getElementById("dlg-input").addEventListener("keydown", e => {
  if (e.key === "Enter") confirmDialog();
});
document.getElementById("dialog").addEventListener("keydown", e => {
  if (e.key === "Escape") closeDialog();
});

// ═══════════════════════════════════════════
//  暴露全局函数（供 HTML onclick 使用）
// ═══════════════════════════════════════════
const _globals = {
  goHome, openProject, exportPDF, exportData, exportSingleProject, importData,
  showNewProjectDialog, showConfirmDialog, confirmDialog, closeDialog, deleteProject,
  renderProject, renderHome,
  addRound, toggleRound, deleteRound, undoDeleteRound, setActiveRound,
  pushStitch, undoStitch, stitchTap,
  changeStitch, deleteStitch, startInsert, doInsert,
  showSheet, closeSheet, openPatternPasteSheet,
  handleParsePattern, handleOCR, removeParsedItem, confirmImport, updateCurrentPart, addNewPart,
  showLoading, hideLoading, loadTesseract,
  startImportFlow, startManualFlow, dismissEntryChoice,
  toggleSelectAllInSetup, startImportFromSetup, cancelPasteSheet,
  normalizeRoundNums,
  renameProject,
  openStitchSetup, toggleSetupStitch, saveProjectStitches, closeSetupSheet,
  showEntryChoiceSheet,
  toggleFilterByRound, toggleRowTerms, getUnitLabel,
  openStitchCustomize, saveStitchCustomize, resetStitchCustomize, backToSetupGrid,
  openNewStitchForm, saveNewStitch, deleteCustomStitch,
  addPart, switchPart, renamePart, deletePart,
  startEditPartName, partNameBlur, getEditingPartId, handleEditBtnClick, handleDeleteBtnClick,
  toggleProjMenu, archiveProject, showArchiveSuccessSheet, handlePwaHintOptOut, showPwaTutorial, unarchiveProject,
  toggleVoiceMode, updateVoiceButton, setVoicePulse, playSound,
  openVoiceTutorial, dismissVoiceHint,
  renderDynamicPalette, renderFilterToggle, renderBarRow, triggerEdgeGlow,
  openSettings, changeTheme, toggleVoiceDefault, toggleVoiceSound, clearAllData,
  switchTab, renderSettings, updateTabNav,
  editExpectedCount,
  pickCover, setProjectCover, removeProjectCover
};
Object.entries(_globals).forEach(([k, v]) => { window[k] = v; });

// 点击空白处关闭项目菜单
document.addEventListener('click', (e) => {
  if (state.flowState.projMenuId === null) return;
  const menu = document.getElementById(`proj-menu-${state.flowState.projMenuId}`);
  if (menu && menu.contains(e.target)) return;
  if (e.target.closest('.proj-del')) return;
  state.flowState.projMenuId = null;
  if (menu) menu.classList.remove('show');
});

document.getElementById("tab-nav").style.display = "flex";
loadData();
renderHome();
