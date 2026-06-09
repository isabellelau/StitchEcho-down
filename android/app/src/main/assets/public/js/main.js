import { STITCH_LIB, COLOR_THEMES, OLD_ID_MAP, ALIAS_TO_ID, STITCHES, SM, parsePattern, extractStitches, normalizeStitch, resolveColor } from '../stitches.js';
import { state, NUMBER_MAP, uid, getProj, getActivePart, isPartEmpty, getEditingPartId } from './state.js';
import { saveData, loadData, migrateData, exportPDF, exportData, exportSingleProject, checkStorageQuota } from './storage.js';
import { escapeHtml, showToast, showSheet, closeSheet, showEntryChoiceSheet, showConfirmDialog, confirmDialog, closeDialog } from './ui.js';
import { playSound, initRecognition, toggleVoiceMode, setVoicePulse, updateVoiceButton, openVoiceTutorial } from './voice.js';
import { parseIntentL1 } from './voice-intent.js';
import { openSettings, renderSettings, changeTheme, changeStitchTheme, toggleVoiceDefault, toggleVoiceSound, toggleVoiceSpeakFeedback, setVoiceWaitTimeout, setVoiceRepeatDefault, clearAllData, navigateToSubPage, goBackFromSubPage, editProfileName, pickProfileAvatar, showAvatarSheet, openGlobalStitchLibrary, openGlobalStitchCustomize, saveGlobalStitchCustomize, resetGlobalStitchCustomize, deleteGlobalCustomStitch, openGlobalNewStitchForm, saveGlobalNewStitch, removeProfileAvatar, switchLang, toggleShowSymbol, switchNotation } from './settings.js';
import {
  startImportFlow, startManualFlow, dismissEntryChoice,
  toggleSelectAllInSetup, startImportFromSetup,
  openPatternPasteSheet, cancelPasteSheet, handleParsePattern,
  showLoading, hideLoading, loadTesseract, handleOCR,
  openParseConfirmSheet, removeParsedItem, undoRemoveParsedItem, addConfirmRound, confirmImport,
  updateCurrentPart, addNewPart, updatePendingInstruction, normalizeRoundNums,
  startStitchOnlyFlow,
} from './pattern.js';
import {
  getUnitLabel, toggleRowTerms, getProjColor, renderSpillHTML, renderTaskSlide,
  editExpectedCount, renderDynamicPalette, toggleFilterByRound, renderFilterToggle,
  renderBarRow, pushStitch, undoStitch, stitchTap, changeStitch, deleteStitch,
  startInsert, doInsert, openStitchSetup, toggleSetupStitch, openStitchCustomize,
  saveStitchCustomize, resetStitchCustomize, backToSetupGrid, openNewStitchForm,
  saveNewStitch, deleteCustomStitch, saveProjectStitches, closeSetupSheet,
  triggerEdgeGlow, openInstructionEdit, saveRoundInstruction,
  updateImmersiveButton,
  toggleImmersiveMode, renderImmersive, renderToggleRow,
  goNextRound, refreshBottomBar,
  instrEditorInsert, instrEditorInsertNum, instrEditorInsertSymbol,
  instrEditorBackspace, instrEditorClear, instrEditorConfirm, instrEditorToggleKB,
  openMultiRoundEditor, _pickRefForMultiEditor, instrEditorPrevRound, instrEditorNextRound, instrEditorConfirmMulti,
  openMarkerSheet, openMarkersReviewSheet, saveMarker, removeMarker, markerSelectColor,
  copyRoundStructure, openProjectSettings, setNotationAndRefresh
} from './stitch.js';
import {
  addRound, addRoundBlank, toggleRound, deleteRound, undoDeleteRound, setActiveRound,
  toggleRoundComplete,
  showOriginalInstruction, restoreOriginalInstruction,
  showRoundContextMenu, openRoundNotes, saveRoundNotes, insertRoundAfter
} from './round.js';
import {
  addPart, switchPart, renamePart, deletePart, undoDeletePart, startEditPartName,
  partNameBlur, handleEditBtnClick, handleDeleteBtnClick
} from './part.js';
import {
  showNewProjectDialog, openProject, renameProject, deleteProject, toggleProjMenu,
  archiveProject, showArchiveSuccessSheet, unarchiveProject, importData,
  startFocusSession, tickFocusSession, flushFocusSession,
  getTotalFocusTime, formatFocusTime, getTodayFocusTime, getTodayStitchCount,
  bumpDailyCount,
  chooseNormalMode, chooseSimpleMode, switchProjectMode
} from './project.js';
import { pickCover, setProjectCover, removeProjectCover, addRefImage, removeRefImage, getRefImage, showRefImagesSheet, openRefImageViewer, pickRefImages, _closeRefViewer } from './image.js';
import { handleGenerateShare, showShareSheet, downloadShareImage, shareImageNative, _toggleShareIncludeName, _shareDownloadCurrent, _shareNativeCurrent } from './share.js';
import { openShareSheet, _copyTextPattern } from './share-pattern.js';
import { openAnnotator, saveAnnotation, closeAnnotator, _exitAnnotator, _isAnnotatorOpen } from './annotator.js';
import { renderHome, renderProject, _renderSplitLeft } from './render.js';
import { t, term, setLang, getLang, setNotation, getNotationKey, SUPPORTED_LANGS, getShowSymbol, setShowSymbol } from './i18n.js';

let _onboardStep = 0;
const ONBOARD_KEY = 'knit_onboarded_v1';

window.state = state;

// ═══════════════════════════════════════════
//  全局异步错误兜底
// ═══════════════════════════════════════════

const _toastedErrors = new Set();

const SILENT_PATTERNS = ['ResizeObserver', 'Script error', 'Load failed'];

function _shouldSuppressToast(message) {
  return SILENT_PATTERNS.some(p => message && message.includes(p));
}

window.addEventListener('unhandledrejection', event => {
  const reason = event.reason;
  const message = reason?.message || String(reason);
  const stack = reason?.stack || '';
  const prefix = stack.includes('html2canvas') ? 'html2canvas' :
                 stack.includes('Tesseract') ? 'Tesseract' :
                 stack.includes('fetch') ? 'fetch' :
                 stack.includes('IndexedDB') ? 'IndexedDB' : 'Promise';
  console.error(`[Unhandled] ${prefix} | ${message} | ${stack.slice(0, 100)}`);
  if (!_shouldSuppressToast(message) && !_toastedErrors.has(message)) {
    _toastedErrors.add(message);
    showToast('操作遇到问题，如持续出现请导出备份', null, 5000);
  }
  event.preventDefault();
});

window.addEventListener('error', event => {
  const { message, filename, lineno, colno, error } = event;
  const stack = error?.stack || `${filename}:${lineno}:${colno}`;
  console.error(`[Unhandled] error | ${message} | ${stack.slice(0, 100)}`);
  if (!_shouldSuppressToast(message) && !_toastedErrors.has(message)) {
    _toastedErrors.add(message);
    showToast('操作遇到问题，如持续出现请导出备份', null, 5000);
  }
});

export function setPageView(view) {
  document.documentElement.classList.remove('home-view', 'settings-view');
  if (view) document.documentElement.classList.add(view);
}

// ── navigation ──
function goHome() {
  if (_isAnnotatorOpen && _isAnnotatorOpen()) {
    _exitAnnotator(() => _doGoHome());
    return;
  }
  _doGoHome();
}

function _doGoHome() {
  document.documentElement.classList.remove('in-project');
  document.documentElement.classList.remove('simple-mode');
  document.documentElement.classList.remove('ipad-split');
  const splitLeft = document.getElementById('ipad-split-left');
  if (splitLeft) splitLeft.remove();

  if (state.voiceMode) {
    state.flowState.voiceState = 'off';
    if (state.recognition) {
      state.recognition.onresult = null;
      state.recognition.onerror = null;
      state.recognition.onend = null;
      state.recognition.onspeechend = null;
      try { state.recognition.abort(); } catch (_) {}
      state.recognition = null;
    }
    state.voiceMode = false;
    setVoicePulse(false);
    updateVoiceButton();
  }
  if (state.immersiveMode) {
    state.immersiveMode = false;
  }
  const navBar = document.getElementById('nav-bar');
  if (navBar) navBar.style.display = '';
  document.documentElement.classList.remove('immersive-mode');
  flushFocusSession();
  setPageView('home-view');
  state.curProjId = null; state.expandedRounds.clear(); state.selectedStitch = null;
  state.flowState.projMenuId = null;
  document.getElementById("bottom-bar")?.style.setProperty("display", "none");
  document.getElementById("tab-nav")?.style.setProperty("display", "");
  state.currentTab = 'projects';
  updateTabNav();
  const screen = document.getElementById("screen");
  screen.classList.add("enter-back");
  screen.addEventListener("animationend", () => screen.classList.remove("enter-back"), { once: true });
  renderHome();
}

function switchTab(tab) {
  if (state.currentTab === tab) return;
  if (tab === 'settings') flushFocusSession();
  state.currentTab = tab;
  updateTabNav();

  const content = document.getElementById('screen-content');
  if (content) {
    content.style.opacity = '0';
    content.style.transition = 'opacity 0.18s';
  }

  requestAnimationFrame(() => {
    if (tab === 'projects') {
      renderHome();
    } else if (tab === 'settings') {
      renderSettings();
    }
    if (content) {
      requestAnimationFrame(() => {
        content.style.opacity = '1';
      });
    }
  });
}

function updateTabNav() {
  const projBtn = document.getElementById('tab-projects');
  const setBtn = document.getElementById('tab-settings');
  if (projBtn) projBtn.classList.toggle('active', state.currentTab === 'projects');
  if (setBtn) setBtn.classList.toggle('active', state.currentTab === 'settings');
}

function initScrollBehavior() {
  const screen   = document.getElementById('screen');
  const navBar   = document.getElementById('nav-bar');
  const navSmall = document.getElementById('nav-small-title');
  const largeTitleWrap = document.getElementById('large-title-wrap');

  // 大标题消失时显示小标题（首页用）
  if (largeTitleWrap && navSmall) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          navSmall.classList.remove('visible');
        } else {
          navSmall.classList.add('visible');
        }
      },
      { root: screen, threshold: 0 }
    );
    observer.observe(largeTitleWrap);
  }

  // 项目页：向下滚隐藏 nav-bar，向上滚显示
  let lastY = 0;
  if (screen) {
    screen.addEventListener('scroll', () => {
      // 只在项目页生效（nav-back visible 说明在项目页）
      const navBack = document.getElementById('nav-back');
      if (!navBack || !navBack.classList.contains('visible')) {
        lastY = screen.scrollTop;
        return;
      }
      const scrollTop = screen.scrollTop;

      // 滚到顶部强制显示
      if (scrollTop <= 0) {
        navBar.classList.remove('hidden');
        lastY = 0;
        return;
      }

      const delta = scrollTop - lastY;
      if (delta < -8) {
        navBar.classList.remove('hidden');
      } else if (delta > 4) {
        navBar.classList.add('hidden');
      }
      lastY = scrollTop;
    }, { passive: true });
  }
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
  // === HTML onclick/onchange/onblur 必须保留 ===
  goHome, openProject, exportData, exportSingleProject,
  showNewProjectDialog, confirmDialog, closeDialog, deleteProject,
  renderProject, renderHome,
  addRound, addRoundBlank, toggleRound, deleteRound, setActiveRound,
  toggleRoundComplete,
  showOriginalInstruction, restoreOriginalInstruction,
  showRoundContextMenu, openRoundNotes, saveRoundNotes, insertRoundAfter,
  pushStitch, undoStitch, stitchTap,
  changeStitch, deleteStitch, startInsert, doInsert,
  closeSheet, openPatternPasteSheet,
  handleParsePattern, handleOCR, removeParsedItem, undoRemoveParsedItem, addConfirmRound, updateCurrentPart, addNewPart, updatePendingInstruction,
  startImportFlow, startManualFlow, startStitchOnlyFlow,
  toggleSelectAllInSetup, startImportFromSetup, cancelPasteSheet,
  openStitchSetup, toggleSetupStitch, saveProjectStitches, closeSetupSheet,
  toggleFilterByRound, toggleRowTerms,
  openStitchCustomize, saveStitchCustomize, resetStitchCustomize, backToSetupGrid,
  openNewStitchForm, saveNewStitch, deleteCustomStitch,
  addPart, switchPart, handleDeleteBtnClick, undoDeletePart,
  partNameBlur, handleEditBtnClick, getEditingPartId,
  toggleProjMenu, archiveProject, unarchiveProject,
  chooseNormalMode, chooseSimpleMode, switchProjectMode,
  toggleVoiceMode,
  openVoiceTutorial, toggleImmersiveMode, goNextRound,
  openInstructionEdit,
  instrEditorInsert, instrEditorInsertNum, instrEditorInsertSymbol, instrEditorBackspace, instrEditorClear, instrEditorConfirm, instrEditorToggleKB,
  instrEditorPrevRound, instrEditorNextRound, instrEditorConfirmMulti,
  changeTheme, changeStitchTheme, setVoiceWaitTimeout, setVoiceRepeatDefault, clearAllData,
  switchTab,
  navigateToSubPage, goBackFromSubPage,
  editProfileName, pickProfileAvatar, showAvatarSheet,
  openGlobalStitchLibrary, openGlobalStitchCustomize, saveGlobalStitchCustomize, resetGlobalStitchCustomize, deleteGlobalCustomStitch, openGlobalNewStitchForm, saveGlobalNewStitch,
  editExpectedCount,
  pickCover, removeProjectCover, removeRefImage, showRefImagesSheet, openRefImageViewer, pickRefImages,
  handleGenerateShare,
  openShareSheet,
  onboardNext,
  openMarkerSheet, openMarkersReviewSheet, saveMarker, removeMarker, markerSelectColor,
  copyRoundStructure,
  openProjectSettings, setNotationAndRefresh,
  escapeHtml,

  // === onchange 必须保留（非 onclick 的 HTML 事件属性）===
  importData,
  toggleVoiceDefault, toggleVoiceSound, toggleVoiceSpeakFeedback,

  // === window.xxx 动态调用 ===
  initStaticText,
  openAnnotator,
  closeAnnotator,
  _exitAnnotator, _isAnnotatorOpen,
  _closeRefViewer,
  _renderSplitLeft,
  removeProfileAvatar, switchLang, toggleShowSymbol, switchNotation,
  _toggleShareIncludeName, _shareDownloadCurrent, _shareNativeCurrent,
  _copyTextPattern,
  _pickRefForMultiEditor,
  openMultiRoundEditor, instrEditorPrevRound, instrEditorNextRound, instrEditorConfirmMulti,
  getUnitLabel, showEntryChoiceSheet, normalizeRoundNums, bumpDailyCount, tickFocusSession,
};
Object.entries(_globals).forEach(([k, v]) => { window[k] = v; });

function initStaticText() {
  // Page title
  document.title = t('app_name');
  // Nav bar
  const navBack = document.querySelector('.nav-back-label');
  if (navBack) navBack.textContent = t('nav_back');
  // Tab nav
  const tabProj = document.querySelector('#tab-projects .tab-label');
  if (tabProj) tabProj.textContent = t('tab_projects');
  const tabSet = document.querySelector('#tab-settings .tab-label');
  if (tabSet) tabSet.textContent = t('tab_settings');
  // Loading
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = t('loading');
  // Dialog
  const dlgTitle = document.getElementById('dlg-title');
  if (dlgTitle) dlgTitle.textContent = t('new_project');
  const dlgInput = document.getElementById('dlg-input');
  if (dlgInput) dlgInput.placeholder = t('project_name_placeholder');
  const dlgBtns = document.querySelectorAll('#dialog .dialog-btn');
  if (dlgBtns[0]) dlgBtns[0].textContent = t('cancel');
  if (dlgBtns[1]) dlgBtns[1].textContent = t('confirm');
  // Onboarding
  const obTitle1 = document.querySelector('.onboard-slide:nth-child(1) .onboard-title');
  if (obTitle1) obTitle1.textContent = t('onboard_step1_title');
  const obDesc1 = document.querySelector('.onboard-slide:nth-child(1) .onboard-desc');
  if (obDesc1) obDesc1.textContent = t('onboard_step1_desc');
  const obMockCount = document.querySelector('.onboard-mock-count');
  if (obMockCount) obMockCount.textContent = t('onboard_step2_label');
  const obTitle2 = document.querySelector('.onboard-slide:nth-child(2) .onboard-title');
  if (obTitle2) obTitle2.textContent = t('onboard_step2_title');
  const obDesc2 = document.querySelector('.onboard-slide:nth-child(2) .onboard-desc');
  if (obDesc2) obDesc2.textContent = t('onboard_step2_desc');
  const obAppName = document.querySelector('.onboard-app-name');
  if (obAppName) obAppName.textContent = t('app_name');
  const obTitle3 = document.querySelector('.onboard-slide:nth-child(3) .onboard-title');
  if (obTitle3) obTitle3.textContent = t('onboard_step3_title');
  const obDesc3 = document.querySelector('.onboard-slide:nth-child(3) .onboard-desc');
  if (obDesc3) obDesc3.textContent = t('onboard_step3_desc');
  const obBtn = document.getElementById('onboard-btn');
  if (obBtn) obBtn.textContent = t('onboard_next');
}
initStaticText();


// 恢复上次的主题设置
const savedTheme = state.data?.settings?.theme || 'morandi';
const html = document.documentElement;
html.classList.remove('theme-light', 'theme-dark');
if (savedTheme === 'morandi') {
  html.classList.add('theme-light');
} else if (savedTheme === 'night') {
  html.classList.add('theme-dark');
}
initOnboarding();

(async () => {
  await loadData();

  // 存储持久化检查：提示用户定期备份
  try {
    const persisted = await navigator.storage?.persist?.();
    if (persisted !== true) throw new Error('not persisted');
  } catch {
    if (!localStorage.getItem('storage_persist_prompted')) {
      showToast('建议定期导出备份，防止系统自动清除数据', null, 6000);
      localStorage.setItem('storage_persist_prompted', '1');
    }
  }

  initScrollBehavior();
  renderHome();
})();

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.curProjId) {
    flushFocusSession();
  }
});

window.addEventListener('beforeunload', () => {
  flushFocusSession();
  try {
    localStorage.setItem('knit_emergency_backup', JSON.stringify(state.data));
  } catch (e) { /* ignore */ }
});

// ===== Android / browser back button — close popups first =====
// Layer counter: tracks how many popup layers are open (dialog/sheet stack).
// Only pushes/pops history state when the layer count transitions between 0↔1,
// preventing the brief "close sheet → open dialog" transition from accidentally
// closing the newly-opened dialog on Android.
let _popupLayer = 0;
window._popstateClosing = false;

window.addEventListener('popstate', (e) => {
  if (window._popstateClosing) {
    // Triggered by our own history.back() after programmatic close
    window._popstateClosing = false;
    return;
  }

  const dialog = document.getElementById('dialog');
  const sheet = document.getElementById('sheet');

  if ((dialog && dialog.classList.contains('show')) || (sheet && sheet.classList.contains('show'))) {
    window._popstateClosing = true;
    if (dialog && dialog.classList.contains('show')) closeDialog();
    if (sheet && sheet.classList.contains('show')) closeSheet();
    // closeSheet() may reopen a sheet via flow branching (e.g., import mode).
    // If a popup is still open, _pushPopupState already handled layer counting.
    const stillOpen = (document.getElementById('dialog')?.classList.contains('show') ||
                       document.getElementById('sheet')?.classList.contains('show'));
    if (!stillOpen) {
      _popupLayer = 0;
      history.pushState({ popup: true }, '');
    }
    window._popstateClosing = false;
    return;
  }

  // No popup open — let the browser handle back navigation normally
});

// Helper: push a history state when the first popup opens
window._pushPopupState = function () {
  if (_popupLayer === 0) {
    history.pushState({ popup: true }, '');
  }
  _popupLayer++;
};

// Helper: pop the history state when the last popup closes
window._popPopupState = function () {
  if (_popupLayer > 0) {
    _popupLayer--;
  }
  if (_popupLayer === 0 && !window._popstateClosing) {
    history.back();
  }
};

// ===== Onboarding =====

function onboardNext() {
  console.log('[onboard] clicked, step before:', _onboardStep);
  const total = 3;
  _onboardStep++;
  console.log('[onboard] step after:', _onboardStep);

  if (_onboardStep >= total) {
    console.log('[onboard] finishing');
    localStorage.setItem(ONBOARD_KEY, '1');
    const el = document.getElementById('onboarding');
    if (el) el.classList.add('done');
    return;
  }

  const slides = document.getElementById('onboard-slides');
  console.log('[onboard] slides el:', !!slides);
  if (slides) {
    const offset = `-${_onboardStep * 33.333}%`;
    console.log('[onboard] offset:', offset);
    slides.style.transform = `translate3d(${offset}, 0, 0)`;
    slides.style.webkitTransform = `translate3d(${offset}, 0, 0)`;
    slides.style.left = offset;
    console.log('[onboard] styles set');
  }

  const dots = document.querySelectorAll('.onboard-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('onboard-dot--active', i === _onboardStep);
  });

  if (_onboardStep === total - 1) {
    const btn = document.getElementById('onboard-btn');
    if (btn) btn.textContent = t('onboard_start');
  }
}

function initOnboarding() {
  const el = document.getElementById('onboarding');
  if (!el) return;
  if (localStorage.getItem(ONBOARD_KEY)) {
    el.classList.add('done');
  }
  const btn = document.getElementById('onboard-btn');
  if (btn) {
    btn.addEventListener('click', onboardNext);
  }
  // onboarding 期间隐藏底部栏
  const bottomBar = document.getElementById('bottom-bar');
  if (bottomBar) bottomBar.style.display = 'none';
  const tabNav = document.getElementById('tab-nav');
  if (tabNav) tabNav.style.display = 'none';
  const homeFab = document.getElementById('home-fab');
  if (homeFab) homeFab.style.display = 'none';
}

