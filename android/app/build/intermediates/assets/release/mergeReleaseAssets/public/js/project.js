import { state, uid, getProj, getActivePart } from './state.js';
import { showSheet, showToast, escapeHtml, showConfirmDialog, showEntryChoiceSheet, closeSheet } from './ui.js';
import { pickCover, setProjectCover, removeProjectCover, getProjImage } from './image.js';
import { saveData, migrateData, exportSingleProject } from './storage.js';
import { getUnitLabel, checkResumePosition } from './stitch.js';
import { setPageView } from './main.js';
import { t, term } from './i18n.js';
import { openShareSheet } from './share-pattern.js';

let _pendingProjectName = null;

function _createProjectWithMode(mode) {
  const name = _pendingProjectName;
  _pendingProjectName = null;
  if (!name) return null;
  const r = { id: uid(), seq: [], instruction: "", isTextCard: false, completed: false, notes: "" };
  const partId = uid();
  const proj = {
    id: uid(), name,
    parts: [{ id: partId, title: t('default_part_title'), rawPattern: '', rounds: [r], activeRoundId: r.id, customPalette: null }],
    activePartId: partId,
    mode,
    useRowTerms: false,
    lastModified: Date.now(),
    refImages: [],
    focusSessions: [],
    dailyCount: {},
    markers: []
  };
  state.data.projects.push(proj);
  saveData();
  state.curProjId = String(proj.id);
  setPageView(null);
  state.expandedRounds.clear();
  state.selectedStitch = null;
  return proj;
}

export function chooseNormalMode() {
  closeSheet();
  const proj = _createProjectWithMode('normal');
  if (!proj) return;
  state.flowState.newProjectFlow = true;
  showEntryChoiceSheet();
}

export function chooseSimpleMode() {
  closeSheet();
  const proj = _createProjectWithMode('simple');
  if (!proj) return;
  openProject(proj.id);
}

export function switchProjectMode(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (!proj) return;
  showConfirmDialog(
    t('switch_mode_msg'),
    (ok) => {
      if (!ok) return;
      proj.mode = proj.mode === 'normal' ? 'simple' : 'normal';
      saveData();
      if (proj.mode === 'simple') {
        document.documentElement.classList.add('simple-mode');
      } else {
        document.documentElement.classList.remove('simple-mode');
      }
      window.renderProject?.();
    },
    { title: t('switch_mode_title') }
  );
}

export function openProject(id) {
  setPageView(null);
  state.curProjId = String(id); state.selectedStitch = null;
  const proj = getProj(id);
  if (proj) {
    const part = getActivePart(proj);
    if (part && part.rounds.length) {
      state.expandedRounds.add(part.rounds[part.rounds.length - 1].id);
      if (!part.activeRoundId || !part.rounds.find(r => r.id === part.activeRoundId)) {
        part.activeRoundId = part.rounds[part.rounds.length - 1].id;
      }
    }
  }
  document.getElementById("tab-nav")?.style.setProperty("display", "none");
  document.getElementById("bottom-bar")?.style.setProperty("display", "block");
  flushFocusSession();   // 结束上一个项目的会话（如果有）
  startFocusSession();
  const navBar = document.getElementById("nav-bar");
  if (navBar) navBar.classList.remove("hidden");
  const screen = document.getElementById("screen");
  if (screen) screen.scrollTop = 0;
  screen.classList.add("enter-forward");
  screen.addEventListener("animationend", () => screen.classList.remove("enter-forward"), { once: true });
  window.renderProject();
  // 检查是否有可恢复的钩织进度
  if (proj) {
    const activePart = getActivePart(proj);
    if (activePart && activePart.lastPosition) {
      setTimeout(() => checkResumePosition(proj, activePart), 150);
    }
  }
}

export function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== 'object') throw new Error(t('import_file_error'));
      if (!Array.isArray(imported.projects)) throw new Error(t('import_missing_projects'));

      imported.projects.forEach((p, i) => {
        if (!p.id || !p.name) throw new Error(t('import_item_missing_fields').replace('{n}', i + 1));
      });

      showConfirmDialog(t('import_confirm').replace('{count}', imported.projects.length).replace('{current}', state.data.projects.length), (ok) => {
        if (!ok) return;
        const result = migrateData(imported);
        if (result !== imported) {
          showToast('导入数据格式异常，无法完成迁移，请先升级应用');
          return;
        }
        Object.keys(state.data).forEach(k => delete state.data[k]);
        Object.assign(state.data, imported);
        saveData();
        window.renderHome();
        alert(t('import_success'));
      });
    } catch (err) {
      alert(t('import_failed') + err.message);
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    alert(t('import_read_failed'));
    input.value = '';
  };
  reader.readAsText(file);
}

export function showNewProjectDialog() {
  _pendingProjectName = null;
  state.dlgCallback = (name) => {
    if (!name.trim()) return;
    _pendingProjectName = name.trim();
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">${t('mode_select_title')}</div>
      <div class="mode-select-card" onclick="chooseNormalMode()">
        <div class="mode-select-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="5"  cy="5"  r="2" fill="currentColor"/>
            <circle cx="12" cy="5"  r="2" fill="currentColor"/>
            <circle cx="19" cy="5"  r="2" fill="currentColor"/>
            <circle cx="5"  cy="12" r="2" fill="currentColor"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <circle cx="19" cy="12" r="2" fill="currentColor"/>
            <circle cx="5"  cy="19" r="2" fill="currentColor"/>
            <circle cx="12" cy="19" r="2" fill="currentColor"/>
            <circle cx="19" cy="19" r="2" fill="currentColor"/>
          </svg>
        </div>
        <div class="mode-select-info">
          <div class="mode-select-title">${t('mode_normal')}</div>
          <div class="mode-select-desc">${t('mode_normal_desc')}</div>
        </div>
      </div>
      <div class="mode-select-card" onclick="chooseSimpleMode()">
        <div class="mode-select-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4"  width="13" height="2.5" rx="1.25" fill="currentColor" opacity="0.35"/>
            <rect x="2" y="11" width="13" height="2.5" rx="1.25" fill="currentColor"/>
            <path d="M17 10.5l2 2 3-3" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="2" y="18" width="13" height="2.5" rx="1.25" fill="currentColor"/>
            <path d="M17 17.5l2 2 3-3" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="mode-select-info">
          <div class="mode-select-title">${t('mode_simple')}</div>
          <div class="mode-select-desc">${t('mode_simple_desc')}</div>
        </div>
      </div>
      <button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>
    `);
  };
  document.getElementById("dlg-title").textContent = t('new_project');
  document.getElementById("dlg-msg").style.display = "none";
  document.getElementById("dlg-input").style.display = "";
  document.getElementById("dlg-input").value = "";
  document.getElementById("dlg-input").placeholder = t('project_name_placeholder');
  state.confirmCallback = null;
  document.getElementById("dialog").classList.add("show");
  window._pushPopupState?.();
  setTimeout(() => document.getElementById("dlg-input").focus(), 100);
}

export async function toggleProjMenu(id, e) {
  e.stopPropagation();
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (!proj) return;

  const coverImg = await getProjImage(id);
  const isArchived = proj.archived;

  const hasRefImages = Array.isArray(proj.refImages) && proj.refImages.length > 0;

  const coverActions = `
    <button class="sheet-item" onclick="pickCover('${id}');closeSheet()">
      <span class="sheet-item-icon">🖼️</span> ${t('set_cover')}
    </button>
    ${coverImg ? `
    <button class="sheet-item" onclick="removeProjectCover('${id}');closeSheet()">
      <span class="sheet-item-icon">🗑️</span> ${t('remove_cover')}
    </button>` : ''}
    <button class="sheet-item" onclick="pickRefImages('${id}')">
      <span class="sheet-item-icon">🖼</span> ${t('add_ref_image')}
    </button>
    ${hasRefImages ? `
    <button class="sheet-item" onclick="showRefImagesSheet('${id}')">
      <span class="sheet-item-icon">📋</span> ${t('manage_ref_images')}
    </button>` : ''}
  `;

  const shareAction = `
    <button class="sheet-item" onclick="handleGenerateShare('${id}');closeSheet()">
      <span class="sheet-item-icon">✨</span> ${t('share_generate')}
    </button>
    <button class="sheet-item" onclick="openShareSheet('${id}')">
      <span class="sheet-item-icon">📤</span> ${t('share_pattern_title')}
    </button>
  `;

  const switchModeAction = `
    <button class="sheet-item" onclick="switchProjectMode('${id}');closeSheet()">
      <span class="sheet-item-icon">🔄</span> ${t('switch_mode_title')}
    </button>
  `;

  const archiveAction = isArchived
    ? `<button class="sheet-item" onclick="unarchiveProject('${id}');closeSheet()">
         <span class="sheet-item-icon">📤</span> ${t('unarchive')}
       </button>`
    : `<button class="sheet-item" onclick="archiveProject('${id}');closeSheet()">
         <span class="sheet-item-icon">📦</span> ${t('archive')}
       </button>`;

  const deleteAction = `
    <button class="sheet-item sheet-item--danger"
            onclick="deleteProject('${id}', event);closeSheet()">
      <span class="sheet-item-icon">🗑️</span> ${t('delete_project')}
    </button>
  `;

  showSheet(`
    <div class="sheet-title">${escapeHtml(proj.name)}</div>
    ${coverActions}
    ${shareAction}
    ${switchModeAction}
    ${archiveAction}
    <div class="sheet-divider"></div>
    ${deleteAction}
    <button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>
  `);
}

export function archiveProject(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (!proj) return;

  showConfirmDialog(t('archive_confirm').replace('{name}', proj.name), (ok) => {
    if (!ok) return;
    proj.archived = true;
    proj.lastModified = Date.now();
    state.flowState.projMenuId = null;
    saveData();
    window.renderHome();
    showArchiveSuccessSheet(proj);
  });
}

export function showArchiveSuccessSheet(proj) {
  const allNeedles = (proj.parts || []).reduce((s, pt) =>
    s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
  const allRounds = (proj.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
  const unit = getUnitLabel(proj);

  const html = `<div class="sheet-handle"></div>
    <div style="text-align:center;padding:20px 16px 12px">
      <div style="font-size:36px;margin-bottom:8px">📦</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">${t('archived_title').replace('{name}', escapeHtml(proj.name))}</div>
      <div style="font-size:12px;color:var(--muted)">${allRounds} ${unit} · ${t('round_count_label').replace('{total}', allNeedles)}</div>
    </div>
    <div style="margin:0 16px 8px;padding:14px;background:var(--bg);border-radius:12px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${t('archive_backup_title')}</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:10px">${t('archive_backup_desc')}</div>
      <button class="bar-btn primary" style="width:100%" onclick="exportSingleProject('${proj.id}')">${t('archive_download_btn').replace('{name}', escapeHtml(proj.name))}</button>
    </div>
    <div id="backup-guide" style="display:none;margin:0 16px 8px;padding:12px 14px;background:var(--bg);border-radius:10px;font-size:12px;color:var(--muted);line-height:1.8">
      📁 <strong>${t('archive_where_backup')}</strong><br>
      ${t('archive_ios_path')}<br>
      ${t('archive_android_path')}<br><br>
      ${t('archive_backup_tip')}
    </div>
    <button class="sheet-cancel" onclick="closeSheet()">${t('done')}</button>`;

  showSheet(html);
}

export function unarchiveProject(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (proj) { proj.archived = false; proj.lastModified = Date.now(); state.flowState.projMenuId = null; saveData(); window.renderHome(); }
}

export function deleteProject(id, e) {
  e.stopPropagation();
  state.flowState.projMenuId = null;
  showConfirmDialog(t('delete_project_confirm'), (ok) => {
    if (!ok) return;
    removeProjectCover(id);
    state.data.projects = state.data.projects.filter(p => String(p.id) !== String(id));
    saveData(); window.renderHome();
  });
}

export function renameProject(name) {
  if (!name || !state.curProjId) return;
  const proj = getProj(state.curProjId);
  if (proj) { proj.name = name; proj.lastModified = Date.now(); saveData(); }
}

// ── 专注时长 ──

const FOCUS_MIN_DURATION = 60 * 1000;       // 1 分钟
const FOCUS_IDLE_GAP = 10 * 60 * 1000;       // 10 分钟无操作断开
const DAILY_COUNT_MAX_DAYS = 90;

export function startFocusSession() {
  state._sessionStart = Date.now();
  state._sessionLastActive = Date.now();
}

export function tickFocusSession() {
  const now = Date.now();
  if (state._sessionLastActive && now - state._sessionLastActive > FOCUS_IDLE_GAP) {
    flushFocusSession();
    startFocusSession();
  } else {
    state._sessionLastActive = now;
  }
}

export function flushFocusSession() {
  if (!state._sessionStart || !state._sessionLastActive) return;
  const start = state._sessionStart;
  const end = state._sessionLastActive;
  const duration = end - start;
  state._sessionStart = null;
  state._sessionLastActive = null;

  if (duration < FOCUS_MIN_DURATION) return;

  const proj = getProj(state.curProjId);
  if (!proj) return;
  if (!Array.isArray(proj.focusSessions)) proj.focusSessions = [];
  proj.focusSessions.push({ start, end });
  proj.lastModified = Date.now();
  saveData();
}

export function getTotalFocusTime(proj) {
  if (!proj || !Array.isArray(proj.focusSessions)) return 0;
  return proj.focusSessions.reduce((sum, s) => sum + (s.end - s.start), 0);
}

export function formatFocusTime(ms) {
  if (!ms || ms < 60 * 1000) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'h ' + m + 'm';
}

export function getTodayFocusTime(proj) {
  if (!proj || !Array.isArray(proj.focusSessions)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const tomorrowStart = todayStart + 24 * 3600000;
  return proj.focusSessions
    .filter(s => s.end >= todayStart && s.start < tomorrowStart)
    .reduce((sum, s) => {
      const start = Math.max(s.start, todayStart);
      const end = Math.min(s.end, tomorrowStart);
      return sum + Math.max(0, end - start);
    }, 0);
}

export function getTodayStitchCount(proj) {
  if (!proj || !proj.dailyCount) return 0;
  const key = getTodayKey();
  return proj.dailyCount[key] || 0;
}

function getTodayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function bumpDailyCount(proj, n) {
  if (!proj) return;
  if (!proj.dailyCount || typeof proj.dailyCount !== 'object') proj.dailyCount = {};
  const key = getTodayKey();
  proj.dailyCount[key] = Math.max(0, (proj.dailyCount[key] || 0) + n);
  // 清理超过 90 天的 key
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAILY_COUNT_MAX_DAYS);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
  Object.keys(proj.dailyCount).forEach(k => {
    if (k < cutoffKey && proj.dailyCount[k] === 0) delete proj.dailyCount[k];
  });
}
