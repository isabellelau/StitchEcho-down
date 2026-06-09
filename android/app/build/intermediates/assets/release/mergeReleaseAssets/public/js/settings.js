import { state, getProj, clearDailyLog } from './state.js';
import { showSheet, showConfirmDialog, showToast, closeSheet } from './ui.js';
import { saveData, checkStorageQuota } from './storage.js';
import { getProjColor, getCustomStitchesGlobal, getStitchInfo, ALL_THEMES, refreshBottomBar, saveStitchCustomize, resetStitchCustomize, deleteCustomStitch, saveNewStitch } from './stitch.js';
import { t, setLang, getLang, setNotation, getNotationKey, SUPPORTED_LANGS, NOTATION_OPTIONS, getShowSymbol, setShowSymbol } from './i18n.js';
import { STITCH_LIB, COLOR_THEMES } from '../stitches.js';
import { setPageView } from './main.js';
import { removeProjectCover, getProfileAvatar, setProfileAvatar, removeProfileAvatar as _removeProfileAvatar } from './image.js';

let _settingsStack = [];
let _settingsMode = 'page'; // 'page' | 'sheet'

function _getSubPageTitle(key) {
  const titles = {
    color: t('settings_color'),
    permissions: t('settings_permissions'),
    data: t('settings_data'),
    voice: t('settings_voice'),
    about: t('settings_about'),
    lang: t('settings_language')
  };
  return titles[key] || '';
}

// ── Sheet 版（从项目页头部按钮调用，保留兼容）──
export function openSettings() {
  _settingsMode = 'sheet';
  _settingsStack = [];
  const html = `<div class="settings-page" id="settings-page">${_buildSettingsListInnerHTML()}</div>`;
  document.getElementById("sheet").innerHTML = html;
  document.getElementById("sheet").classList.add("show");
  document.getElementById("overlay").classList.add("show");
  _loadProfileAvatar();
}

// ── 全页版（从 Tab Bar 切换调用）──
export function renderSettings() {
  setPageView('settings-view');
  _settingsMode = 'page';
  document.getElementById("bottom-bar")?.style.setProperty("display", "none");

  const fab = document.getElementById('home-fab');
  const tabNav = document.getElementById('tab-nav');
  if (fab) fab.style.display = 'none';
  if (tabNav) { tabNav.style.display = ''; tabNav.classList.remove('has-notch'); }

  _resetNavBarToSettingsRoot();
  _injectProfileHeader();

  _settingsStack = [];
  _renderSettingsList();
  _loadProfileAvatar();
}

async function _loadProfileAvatar() {
  const wrap = document.querySelector('.profile-header-avatar-wrap');
  if (!wrap) return;
  try {
    const base64 = await getProfileAvatar();
    if (base64) {
      wrap.innerHTML = `<img class="profile-header-avatar-img" src="${base64}" alt="">`;
    }
  } catch { /* 静默失败 */ }
}

function _resetNavBarToSettingsRoot() {
  const navBar    = document.getElementById('nav-bar');
  const navBack   = document.getElementById('nav-back');
  const navSmall  = document.getElementById('nav-small-title');
  const navActions = document.getElementById('nav-actions');
  const largeTitleEl = document.getElementById('large-title-text');
  const largeSubEl   = document.getElementById('large-title-sub');
  const largeTitleWrap = document.getElementById('large-title-wrap');

  if (navBack)    { navBack.classList.remove('visible'); navBack.onclick = () => window.goHome && window.goHome(); }
  if (navBar)     navBar.classList.remove('hidden');
  if (navSmall)   { navSmall.textContent = t('settings'); navSmall.classList.remove('visible'); navSmall.onclick = null; navSmall.style.cursor = ''; }
  if (navActions) navActions.innerHTML = '';

  if (largeTitleEl)  largeTitleEl.textContent = t('settings');
  if (largeTitleEl)  largeTitleEl.contentEditable = 'false';
  if (largeSubEl)    largeSubEl.textContent = '';
  if (largeTitleWrap) largeTitleWrap.style.display = '';
}

function _buildProfileHeaderHTML() {
  const profileName = state.data.settings.profile?.name || t('profile_default_name');
  const totalProjs = state.data.projects.length;
  const totalNeedles = state.data.projects.reduce((sum, p) =>
    sum + (p.parts || []).reduce((s, pt) =>
      s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0), 0);
  return `
    <div class="profile-header">
      <div class="profile-header-avatar-wrap" id="profile-header-avatar-wrap" onclick="pickProfileAvatar()" oncontextmenu="showAvatarSheet(event)">
        <span class="profile-header-avatar-emoji">🧶</span>
      </div>
      <div class="profile-header-name" onclick="editProfileName()">${escapeHtml(profileName)}</div>
      <div class="profile-header-stats">${t('home_total_projects').replace('{count}', totalProjs)} · ${t('home_total_stitches').replace('{count}', totalNeedles.toLocaleString())}</div>
    </div>
  `;
}

function _injectProfileHeader() {
  const wrap = document.getElementById('large-title-wrap');
  if (wrap) {
    wrap.innerHTML = _buildProfileHeaderHTML();
  }
}

// ═════════════════════════════════════
//  一级列表
// ═════════════════════════════════════

function _buildSettingsListInnerHTML() {
  const theme = state.data.settings.theme || 'morandi';
  const themeName = theme === 'morandi' ? t('theme_morandi') : theme === 'night' ? t('theme_night') : t('theme_system');
  return `
    <div class="settings-list">
      <div class="settings-row" onclick="navigateToSubPage('color')">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">🎨</div>
        <span class="settings-row-label">${t('settings_color')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-value">${themeName}</span>
          <span class="settings-row-chevron">›</span>
        </div>
      </div>

      <div class="settings-row" onclick="openGlobalStitchLibrary()">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">🧶</div>
        <span class="settings-row-label">${t('settings_stitch_library')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-chevron">›</span>
        </div>
      </div>

      <div class="settings-row" onclick="navigateToSubPage('lang')">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">🌐</div>
        <span class="settings-row-label">${t('settings_language')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-chevron">›</span>
        </div>
      </div>

      <div class="settings-row" onclick="navigateToSubPage('data')">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">🗂</div>
        <span class="settings-row-label">${t('settings_data')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-value">${t('settings_n_projects').replace('{n}', state.data.projects.length)}</span>
          <span class="settings-row-chevron">›</span>
        </div>
      </div>

      <div class="settings-row" onclick="navigateToSubPage('voice')">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">🎤</div>
        <span class="settings-row-label">${t('settings_voice')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-value">${t('settings_voice_sub')}</span>
          <span class="settings-row-chevron">›</span>
        </div>
      </div>

      <div class="settings-row" onclick="navigateToSubPage('about')">
        <div class="settings-row-icon" style="background:var(--accent-bg);color:var(--accent)">ℹ️</div>
        <span class="settings-row-label">${t('settings_about')}</span>
        <div class="settings-row-extra">
          <span class="settings-row-chevron">›</span>
        </div>
      </div>
    </div>
  `;
}

function _buildSettingsListHTML() {
  return `<div class="settings-page" id="settings-page">${_buildSettingsListInnerHTML()}</div>`;
}

function _getContentRoot() {
  if (_settingsMode === 'sheet') {
    return document.getElementById('sheet');
  }
  return document.getElementById('screen-content');
}

function _renderSubPageIntoRoot(html, animClass) {
  const root = _getContentRoot();
  const key = _settingsStack[_settingsStack.length - 1];
  let subhead = '';
  if (key) {
    const title = _getSubPageTitle(key);
    subhead = `
    <div class="settings-subhead">
      <button class="settings-subhead-back" onclick="goBackFromSubPage()">
        <span style="font-size:18px;line-height:1">‹</span>
        <span>${t('settings')}</span>
      </button>
      <div class="settings-subhead-title">${title}</div>
    </div>`;
  }

  if (_settingsMode === 'sheet') {
    root.innerHTML = `<div class="settings-page ${animClass}" id="settings-page">${subhead}${html}</div>`;
    const page = document.getElementById('settings-page');
    if (page) {
      page.addEventListener('animationend', () => page.classList.remove(animClass), { once: true });
    }
  } else {
    const wrapper = document.createElement('div');
    wrapper.className = `settings-page ${animClass}`;
    wrapper.innerHTML = subhead + html;
    root.innerHTML = '';
    root.appendChild(wrapper);
    wrapper.addEventListener('animationend', () => wrapper.classList.remove(animClass), { once: true });
  }
}

function _renderSettingsList(animDir) {
  const html = _buildSettingsListHTML();
  const content = document.getElementById('screen-content');
  content.innerHTML = html;

  if (animDir) {
    const page = document.getElementById('settings-page');
    if (page) {
      page.classList.add(animDir);
      page.addEventListener('animationend', () => page.classList.remove(animDir), { once: true });
    }
  }
}

// ═════════════════════════════════════
//  二级子页导航
// ═════════════════════════════════════

export function navigateToSubPage(key) {
  _settingsStack.push(key);

  const title = _getSubPageTitle(key);

  if (_settingsMode === 'page') {
    const lt = document.getElementById('large-title-wrap');
    if (lt) lt.style.display = 'none';

    const tabNav = document.getElementById('tab-nav');
    if (tabNav) tabNav.style.display = 'none';

    const navBack  = document.getElementById('nav-back');
    const navSmall = document.getElementById('nav-small-title');
    const navActions = document.getElementById('nav-actions');
    if (navBack) {
      navBack.classList.add('visible');
      navBack.onclick = () => goBackFromSubPage();
    }
    if (navSmall) {
      navSmall.textContent = title;
      navSmall.classList.add('visible');
      navSmall.onclick = null;
      navSmall.style.cursor = 'default';
    }
    if (navActions) navActions.innerHTML = '';
  }

  let subHTML;
  switch (key) {
    case 'color':
      subHTML = _buildColorSubPageHTML();
      break;
    case 'data':
      subHTML = _buildDataSubPageHTML();
      checkStorageQuota();
      break;
    case 'voice':
      subHTML = renderVoiceSettings();
      break;
    case 'about':
      subHTML = _buildAboutSubPageHTML();
      break;
    case 'lang':
      subHTML = _buildLangSubPageHTML();
      break;
    default:
      _settingsStack.pop();
      return;
  }

  _renderSubPageIntoRoot(subHTML, 'forward');
}

export function goBackFromSubPage() {
  if (_settingsStack.length === 0) return;
  _settingsStack.pop();

  if (_settingsMode === 'page') {
    if (_settingsStack.length === 0) {
      const tabNav = document.getElementById('tab-nav');
      if (tabNav) tabNav.style.display = '';

      _resetNavBarToSettingsRoot();
      _injectProfileHeader();
      _renderSettingsList('back');
    } else {
      _renderSubPageIntoRoot(_buildSettingsListInnerHTML(), 'back');
    }
  } else {
    // sheet mode
    const listHTML = `<div class="settings-page back" id="settings-page">${_buildSettingsListInnerHTML()}</div>`;
    document.getElementById('sheet').innerHTML = listHTML;
    const page = document.getElementById('settings-page');
    if (page) {
      page.addEventListener('animationend', () => page.classList.remove('back'), { once: true });
    }
  }
  _loadProfileAvatar();
}

// ═════════════════════════════════════
//  子页：配色设置
// ═════════════════════════════════════

function _buildColorSubPageHTML() {
  const uiTheme = state.data.settings.theme || 'morandi';
  const stitchTheme = state.data.settings.stitchTheme || 'morandi';
  const dotIds = ['X', 'V', 'A', 'CH'];

  const UI_THEME_META = {
    morandi: { name: t('theme_morandi'),   sub: t('theme_morandi_sub'), dots: ['#C9969F', '#FFFFFF', '#F5E6E8', '#2D1E20'] },
    night:   { name: t('theme_night'),     sub: t('theme_night_sub'), dots: ['#C4909A', '#3D2D30', '#4A2D32', '#F2E8E9'] },
    system:  { name: t('theme_system'),    sub: t('theme_system_sub'), dots: ['#F5E6E8', '#FFFFFF', '#3D2D30', '#2A2123'] }
  };

  // 针法配色方案：从 COLOR_THEMES + ALL_THEMES 收集所有 key
  const stitchKeys = [...new Set([
    ...Object.keys(COLOR_THEMES || {}),
    ...Object.keys(ALL_THEMES || {})
  ])];

  const STITCH_META = {
    morandi: { name: t('stitch_theme_warm'), sub: t('stitch_theme_warm_sub') },
    night:   { name: t('stitch_theme_dark'), sub: t('stitch_theme_dark_sub') },
    float:   { name: t('stitch_theme_float'), sub: t('stitch_theme_float_sub') }
  };

  function resolveDotColor(tKey, sid) {
    if (ALL_THEMES[tKey] && ALL_THEMES[tKey][sid]) return ALL_THEMES[tKey][sid];
    if (COLOR_THEMES[tKey] && COLOR_THEMES[tKey][sid]) return COLOR_THEMES[tKey][sid];
    return (COLOR_THEMES.morandi && COLOR_THEMES.morandi[sid]) ? COLOR_THEMES.morandi[sid] : '#A8A29E';
  }

  function _renderCards(keys, metaMap, activeKey, onClickFn, dataAttr) {
    return keys.map(tKey => {
      const meta = metaMap[tKey] || { name: tKey, sub: '' };
      const isActive = activeKey === tKey;
      const dotColors = meta.dots || dotIds.map(sid => resolveDotColor(tKey, sid));
      const dots = dotColors.map(c => `<span class="settings-theme-card-dot" style="background:${c}"></span>`).join('');
      return `
        <div class="settings-theme-card${isActive ? ' active' : ''}" ${dataAttr}="${tKey}" onclick="${onClickFn}('${tKey}')">
          <div class="settings-theme-card-dots">${dots}</div>
          <div class="settings-theme-card-label">${meta.name}</div>
          <div class="settings-theme-card-sub">${meta.sub}</div>
        </div>`;
    }).join('');
  }

  return `
    <div class="settings-section-hd">${t('settings_ui_theme')}</div>
    <div class="settings-section-desc" style="padding:0 16px 8px;font-size:var(--text-caption1);color:var(--muted)">${t('settings_ui_theme_desc')}</div>
    <div class="settings-theme-card-grid col3">
      ${_renderCards(Object.keys(UI_THEME_META), UI_THEME_META, uiTheme, 'changeTheme', 'data-theme')}
    </div>

    <div class="settings-section-hd">${t('settings_stitch_theme')}</div>
    <div class="settings-section-desc" style="padding:0 16px 8px;font-size:var(--text-caption1);color:var(--muted)">${t('settings_stitch_theme_desc')}</div>
    <div class="settings-theme-card-grid col3">
      ${_renderCards(stitchKeys, STITCH_META, stitchTheme, 'changeStitchTheme', 'data-stitch-theme')}
    </div>

    <div class="settings-section-desc settings-section-desc--bottom">
      ${t('settings_stitch_theme_footer')}
    </div>
  `;
}

// ═════════════════════════════════════
//  针法配色切换（独立于 UI 主题）
// ═════════════════════════════════════

export function changeStitchTheme(themeKey) {
  state.data.settings.stitchTheme = themeKey;
  saveData();

  // 更新针法配色卡片选中态
  const cards = document.querySelectorAll('.settings-theme-card[data-stitch-theme]');
  cards.forEach(c => c.classList.remove('active'));
  const targets = document.querySelectorAll(`.settings-theme-card[data-stitch-theme="${themeKey}"]`);
  targets.forEach(c => c.classList.add('active'));

  // 如果在项目页，刷新底部调色板和针法颜色
  if (state.curProjId) {
    window.renderProject();
  }
}

// ═════════════════════════════════════
//  子页：系统权限（占位）
// ═════════════════════════════════════

function _buildPlaceholderSubPageHTML(title, icon, desc) {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--muted);gap:12px;padding:40px 16px;text-align:center">
      <div style="font-size:40px;opacity:.5">${icon}</div>
      <div style="font-size:var(--text-footnote);line-height:1.6">${desc}</div>
    </div>
  `;
}

// ═════════════════════════════════════
//  子页：数据管理
// ═════════════════════════════════════

function _buildDataSubPageHTML() {
  const totalProjs = state.data.projects.length;
  const totalNeedles = state.data.projects.reduce((sum, p) =>
    sum + (p.parts || []).reduce((s, pt) =>
      s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0), 0);

  return `
    <div class="settings-section-hd">${t('settings_stats')}</div>
    <div class="settings-stat" style="text-align:left;padding:4px 16px 12px">${t('settings_stats_text').replace('{projects}', totalProjs).replace('{stitches}', totalNeedles.toLocaleString())}</div>

    <div class="settings-section-hd">${t('settings_actions')}</div>
    <div class="settings-btn-row">
      <button class="settings-btn settings-btn-secondary" onclick="exportData()">${t('settings_export')}</button>
      <label class="settings-btn settings-btn-secondary" style="display:block;text-align:center">
        ${t('settings_import')}
        <input type="file" accept="application/json,.json" style="display:none" onchange="importData(this)">
      </label>
      <button class="settings-btn settings-btn-danger" onclick="clearAllData()">${t('settings_clear_all')}</button>
    </div>
  `;
}

// ═════════════════════════════════════
//  子页：语音模式
// ═════════════════════════════════════

function renderVoiceSettings() {
  const s = state.data.settings;

  return `
    <div class="settings-subpage">

      <div class="settings-section">
        <div class="settings-section-title">${t('voice_basic_settings')}</div>

        <div class="settings-item settings-item--row">
          <div>
            <div class="settings-item-title">${t('voice_auto_enable')}</div>
          </div>
          <div class="settings-toggle-wrap">
            <label class="settings-toggle">
              <input type="checkbox"
                ${s.voiceEnabled ? 'checked' : ''}
                onchange="toggleVoiceDefault()">
              <span class="settings-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-item settings-item--row">
          <div>
            <div class="settings-item-title">${t('voice_sound_effects')}</div>
            <div class="settings-item-sub">${t('voice_sound_effects_sub')}</div>
          </div>
          <div class="settings-toggle-wrap">
            <label class="settings-toggle">
              <input type="checkbox"
                ${s.voiceSoundEnabled ? 'checked' : ''}
                onchange="toggleVoiceSound()">
              <span class="settings-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ═════════════════════════════════════
//  子页：语言与针法显示
// ═════════════════════════════════════

function _buildLangSubPageHTML() {
  const curLang = getLang();
  const langPills = SUPPORTED_LANGS.map(l => {
    const active = l.code === curLang;
    return `<button class="settings-theme-card${active ? ' active' : ''}"
      style="flex:1;padding:10px 8px;font-size:14px;font-weight:600"
      onclick="switchLang('${l.code}')"
      data-lang="${l.code}">${l.label}</button>`;
  }).join('');

  const curNotation = getNotationKey();

  const showSymbol = getShowSymbol();
  const isSymbolMode = curNotation === 'symbol';
  const symbolToggleHTML = isSymbolMode ? '' : `
    <div class="settings-divider"></div>
    <div class="settings-row" onclick="toggleShowSymbol()" style="cursor:pointer">
      <div style="flex:1;min-width:0">
      <div style="font-size:var(--text-body);color:var(--text)">${t('settings_show_symbol')}</div>
      <div style="font-size:var(--text-caption1);color:var(--muted);margin-top:2px">${t('settings_show_symbol_desc')}</div>
      </div>
      <span class="settings-toggle${showSymbol ? ' on' : ''}" id="settings-show-symbol-toggle">
      <i class="settings-toggle-knob"></i>
      </span>
    </div>
  `;

  const notationPills = NOTATION_OPTIONS.map(o => {
    const active = o.code === curNotation;
    return `<button class="settings-theme-card${active ? ' active' : ''}"
      style="flex:1;padding:10px 8px;font-size:14px;font-weight:600"
      onclick="switchNotation('${o.code}')"
      data-notation="${o.code}">${o.label}</button>`;
  }).join('');

  return `
    <div class="settings-section-hd" style="text-align:center">${t('settings_language')}</div>
    <div style="display:flex;gap:8px;padding:0 16px 16px">
      ${langPills}
    </div>

    <div class="settings-divider"></div>

    <div class="settings-section-hd" style="text-align:center">${t('settings_notation')}</div>
    <div style="display:flex;gap:8px;padding:0 16px 8px">
      ${notationPills}
    </div>
    <div class="settings-notation-desc">${t('settings_notation_desc')}</div>
    ${symbolToggleHTML}
  `;
}

// ═════════════════════════════════════
//  子页：关于
// ═════════════════════════════════════

function _buildAboutSubPageHTML() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;gap:8px">
      <div style="font-size:48px">🧶</div>
      <div style="font-size:var(--text-title3);font-weight:var(--weight-semibold);color:var(--text)">${t('app_name')}</div>
      <div style="font-size:var(--text-footnote);color:var(--muted)">体验版</div>
    </div>

    <div style="padding:0 20px 24px;font-size:13px;line-height:1.8;color:var(--text-secondary)">
      <p style="margin-bottom:12px">为了感谢所有用户对APP的支持和关注，本版本为提供给安卓用户的免费体验版，功能以基础层为主，不包含任何iOS端内付费功能。后续更新以iOS端为主要维护方向。</p>
      <p style="margin-bottom:12px">因为本人学业精力有限的问题，目前版本除了重大bug修复外不做同步更新，敬请原谅。如果有iOS设备，欢迎在AppStore体验完整版本的织影。</p>
      <p>如果希望在安卓设备上体验完整版应用的用户，请在我的小红书的安卓下载页置顶帖内评论留言。上架安卓应用需要较长时间的准备材料和审核，非常感谢等待，你们的支持是我继续做下去的动力。</p>
    </div>
  `;
}

// ═════════════════════════════════════
//  本地身份卡操作
// ═════════════════════════════════════

function _refreshProfileHeader() {
  const nameEl = document.querySelector('.profile-header-name');
  if (nameEl) {
    nameEl.textContent = state.data.settings.profile?.name || t('profile_default_name');
  }
}

export function editProfileName() {
  const currentName = state.data.settings.profile?.name || '';
  document.getElementById('dlg-title').textContent = t('profile_edit_title');
  document.getElementById('dlg-input').value = currentName;
  document.getElementById('dlg-input').placeholder = t('profile_edit_placeholder');
  document.getElementById('dlg-input').style.display = '';
  document.getElementById('dlg-msg').style.display = 'none';
  const okBtn = document.querySelector('#dialog .dialog-btn.ok');
  if (okBtn) okBtn.textContent = t('profile_edit_save');
  state.dlgCallback = (newName) => {
    const trimmed = newName.trim();
    if (!state.data.settings.profile) state.data.settings.profile = {};
    state.data.settings.profile.name = trimmed;
    saveData();
    _refreshProfileHeader();
    if (window.initStaticText) window.initStaticText();
  };
  state.confirmCallback = null;
  document.getElementById('dialog').classList.add('show');
  window._pushPopupState?.();
  setTimeout(() => document.getElementById('dlg-input').focus(), 100);
}

export function pickProfileAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      // 读取为 base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await setProfileAvatar(reader.result);
          const wrap = document.querySelector('.profile-header-avatar-wrap');
          if (wrap) {
            wrap.innerHTML = `<img class="profile-header-avatar-img" src="${reader.result}" alt="">`;
          }
          showToast(t('cover_updated'));
        } catch {
          showToast(t('cover_process_failed'));
        }
      };
      reader.readAsDataURL(file);
    } catch {
      showToast(t('cover_process_failed'));
    }
  };
  input.click();
}

export function showAvatarSheet(event) {
  event.preventDefault();
  let html = `<div class="sheet-handle"></div>
    <div class="sheet-title">${t('profile_change_avatar')}</div>
    <div style="padding:8px 16px;display:flex;flex-direction:column;gap:8px">
      <button class="sheet-item" onclick="pickProfileAvatar();closeSheet()">${t('profile_change_avatar')}</button>`;
  // 只有已有头像时才显示移除
  if (document.querySelector('.profile-header-avatar-img')) {
    html += `<button class="sheet-item" style="color:var(--danger)" onclick="removeProfileAvatar();closeSheet()">${t('profile_remove_avatar')}</button>`;
  }
  html += `<button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>`;
  showSheet(html);
}

export async function removeProfileAvatar() {
  try {
    await _removeProfileAvatar();
  } catch (err) {
    console.error('[settings/removeProfileAvatar]', err);
    throw err;
  }
  const wrap = document.querySelector('.profile-header-avatar-wrap');
  if (wrap) {
    wrap.innerHTML = `<span class="profile-header-avatar-emoji">🧶</span>`;
  }
  showToast(t('cover_updated'));
}

export function switchLang(code) {
  if (getLang() === code) return;
  setLang(code);
  if (window.initStaticText) window.initStaticText();
  // Update language pill selection
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.classList.toggle('active', el.dataset.lang === code);
  });
  // Re-render current settings view
  if (_settingsStack.length > 0) {
    const currentKey = _settingsStack.pop();
    navigateToSubPage(currentKey);
  } else if (_settingsMode === 'sheet') {
    document.getElementById('sheet').innerHTML =
      `<div class="settings-page" id="settings-page">${_buildSettingsListInnerHTML()}</div>`;
  } else {
    _resetNavBarToSettingsRoot();
    _injectProfileHeader();
    _renderSettingsList();
  }
  _loadProfileAvatar();
};

export function toggleShowSymbol() {
  const current = getShowSymbol();
  setShowSymbol(!current);
  const el = document.getElementById('settings-show-symbol-toggle');
  if (el) el.classList.toggle('on', !current);
  const proj = getProj(state.curProjId);
  if (proj) renderDynamicPalette(proj);
};

export function switchNotation(code) {
  if (getNotationKey() === code) return;
  setNotation(code);
  // Update notation pill selection
  document.querySelectorAll('[data-notation]').forEach(el => {
    el.classList.toggle('active', el.dataset.notation === code);
  });
  // Refresh project view if on a project page
  if (state.curProjId) {
    window.renderProject();
  }
  // Re-render current settings view
  if (_settingsStack.length > 0) {
    const currentKey = _settingsStack.pop();
    navigateToSubPage(currentKey);
  } else if (_settingsMode === 'sheet') {
    document.getElementById('sheet').innerHTML =
      `<div class="settings-page" id="settings-page">${_buildSettingsListInnerHTML()}</div>`;
  } else {
    _resetNavBarToSettingsRoot();
    _injectProfileHeader();
    _renderSettingsList();
  }
  _loadProfileAvatar();
};

// ═════════════════════════════════════
//  主题切换
// ═════════════════════════════════════

export function changeTheme(themeKey) {
  state.data.settings.theme = themeKey;
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  if (themeKey === 'morandi') {
    html.classList.add('theme-light');
  } else if (themeKey === 'night') {
    html.classList.add('theme-dark');
  }
  saveData();

  // 如果是在配色子页中，更新卡片选中态
  const cards = document.querySelectorAll('.settings-theme-card');
  cards.forEach(c => c.classList.remove('active'));
  const targets = document.querySelectorAll(`.settings-theme-card[data-theme="${themeKey}"]`);
  targets.forEach(c => c.classList.add('active'));

  // 如果在项目页，刷新底部调色板
  if (state.curProjId) {
    refreshBottomBar();
  }
}

// ═════════════════════════════════════
//  语音设置（保留现有逻辑）
// ═════════════════════════════════════

export function toggleVoiceDefault() {
  state.data.settings.voiceEnabled = !state.data.settings.voiceEnabled;
  saveData();
  const el = document.getElementById('settings-voice-toggle');
  if (el) el.classList.toggle('on');
}

export function toggleVoiceSound() {
  state.data.settings.voiceSoundEnabled = !state.data.settings.voiceSoundEnabled;
  saveData();
  const el = document.getElementById('settings-voice-sound-toggle');
  if (el) el.classList.toggle('on');
}

export function toggleVoiceSpeakFeedback() {
  state.data.settings.voiceSpeakFeedback =
    !state.data.settings.voiceSpeakFeedback;
  saveData();
  navigateToSubPage('voice');
}

export function setVoiceWaitTimeout(ms) {
  state.data.settings.voiceWaitTimeout = ms;
  saveData();
  navigateToSubPage('voice');
}

export function setVoiceRepeatDefault(value) {
  state.data.settings.voiceRepeatDefault = value;
  saveData();
  navigateToSubPage('voice');
}


export function clearAllData() {
  showConfirmDialog(t('settings_clear_confirm'), async (ok) => {
    if (!ok) return;
    await Promise.all(state.data.projects.map(p => removeProjectCover(p.id)));
    state.data.projects = [];
    await saveData();
    clearDailyLog();
    if (state.curProjId) {
      window.goHome();
    } else {
      window.renderHome();
    }
    showToast(t('settings_cleared'));
  });
}

// ═════════════════════════════════════
//  全局针法库（设置页入口）
// ═════════════════════════════════════

export function openGlobalStitchLibrary() {
  const categories = {
    basic: t('category_basic'),
    increase: t('category_increase'),
    decrease: t('category_decrease'),
    special: t('category_special')
  };

  const customByCat = { basic: [], increase: [], decrease: [], special: [] };
  Object.values(getCustomStitchesGlobal()).forEach(cs => {
    const cat = cs.category || 'basic';
    if (customByCat[cat]) customByCat[cat].push(cs);
    else customByCat.basic.push(cs);
  });

  let html = `<div class="sheet-handle"></div>
    <div class="sheet-title">${t('settings_stitch_library')}</div>
    <div style="max-height:60vh;overflow-y:auto;padding:0 14px">`;

  Object.entries(categories).forEach(([cat, catLabel]) => {
    const presetItems = Object.values(STITCH_LIB).filter(s => s.category === cat);
    const customItems = customByCat[cat] || [];
    const items = [...presetItems, ...customItems];
    if (items.length === 0) return;

    html += `<div class="sheet-section">${catLabel}</div>`;
    items.forEach(s => {
      const info = getStitchInfo(s.id);
      if (!info) return;
      const isCustom = !!getCustomStitchesGlobal()[s.id];
      html += `<div class="sheet-item" onclick="openGlobalStitchCustomize('${s.id}')">
        <div class="sheet-item-icon" style="background:${info.color};color:#fff;font-weight:700;font-size:14px">${info.abbr}</div>
        <div><div class="sheet-item-label">${escapeHtml(info.label)}${isCustom ? ' <span style="color:#FACC15;font-size:9px">✦</span>' : ''}</div><div class="sheet-item-sub">${s.id}</div></div>
        <span style="margin-left:auto;color:var(--muted);font-size:20px">›</span>
      </div>`;
    });
  });

  html += `</div>
    <div style="padding:10px 14px">
      <button class="bar-btn" style="width:100%;border-style:dashed;color:var(--accent);border-color:var(--accent)" onclick="openGlobalNewStitchForm()">${t('new_stitch')}</button>
    </div>
    <button class="sheet-cancel" onclick="closeSheet()">${t('close')}</button>`;

  showSheet(html);
}

export function openGlobalStitchCustomize(sid) {
  const info = getStitchInfo(sid);
  if (!info) return;

  const isCustom = !!getCustomStitchesGlobal()[sid];
  let html = `<div class="sheet-handle"></div>
    <div class="sheet-title">${t('customize_btn')} · <span style="font-weight:700">${escapeHtml(info.label)}</span> <small style="opacity:.5">(${sid})</small></div>
    <div style="padding:12px 16px">
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('name_field')}</div>
        <input id="global-custom-name" value="${escapeHtml(info.label)}" maxlength="20"
          style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:inherit">
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('color_field')}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <input type="color" id="global-custom-color" value="${info.color}"
            style="width:38px;height:38px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
          <span style="font-size:12px;color:var(--muted);font-family:monospace" id="global-color-hex">${info.color}</span>
          <button class="bar-btn" style="flex:0;padding:6px 10px;font-size:11px" onclick="resetGlobalStitchCustomize('${sid}')">${t('reset_default')}</button>
        </div>
      </div>
    </div>
    ${isCustom ? `
    <div style="padding:0 16px 8px">
      <button class="bar-btn" style="width:100%;color:#E07070;border-color:#E07070" onclick="deleteGlobalCustomStitch('${sid}')">${t('delete_custom_stitch')}</button>
    </div>` : ''}
    <div style="padding:10px 16px;display:flex;gap:8px">
      <button class="bar-btn" style="flex:1" onclick="openGlobalStitchLibrary()">${t('back_btn')}</button>
      <button class="bar-btn primary" style="flex:2" onclick="saveGlobalStitchCustomize('${sid}')">${t('save_btn')}</button>
    </div>`;

  showSheet(html);

  const colorInput = document.getElementById('global-custom-color');
  const hexDisplay = document.getElementById('global-color-hex');
  if (colorInput && hexDisplay) {
    colorInput.addEventListener('input', () => { hexDisplay.textContent = colorInput.value; });
  }
}

export function saveGlobalStitchCustomize(sid) {
  const nameInput = document.getElementById('global-custom-name');
  const colorInput = document.getElementById('global-custom-color');
  const defaultLabel = STITCH_LIB[sid]?.label || sid;

  const g = state.data.settings.globalStitchCustomizations;
  if (!g.names) g.names = {};
  if (!g.colors) g.colors = {};

  if (nameInput && nameInput.value.trim() && nameInput.value.trim() !== defaultLabel) {
    g.names[sid] = nameInput.value.trim();
  } else {
    delete g.names[sid];
  }

  if (colorInput) {
    g.colors[sid] = colorInput.value;
  }

  saveData();
  openGlobalStitchLibrary();
}

export function resetGlobalStitchCustomize(sid) {
  const g = state.data.settings.globalStitchCustomizations;
  if (g?.names) delete g.names[sid];
  if (g?.colors) delete g.colors[sid];
  saveData();
  openGlobalStitchCustomize(sid);
}

export function deleteGlobalCustomStitch(sid) {
  showConfirmDialog(t('delete_custom_stitch_confirm').replace('{name}', getStitchInfo(sid)?.label || sid), (ok) => {
    if (!ok) return;
    if (state.data.settings.globalCustomStitches?.[sid]) {
      delete state.data.settings.globalCustomStitches[sid];
    }
    if (state.data.settings.globalStitchCustomizations?.names?.[sid]) {
      delete state.data.settings.globalStitchCustomizations.names[sid];
    }
    if (state.data.settings.globalStitchCustomizations?.colors?.[sid]) {
      delete state.data.settings.globalStitchCustomizations.colors[sid];
    }
    state.data.projects.forEach(p => {
      p.parts.forEach(part => {
        if (part.customPalette) {
          part.customPalette = part.customPalette.filter(id => id !== sid);
        }
      });
    });
    saveData();
    openGlobalStitchLibrary();
  });
}

export function openGlobalNewStitchForm() {
  let html = `<div class="sheet-handle"></div>
    <div class="sheet-title">${t('new_stitch')}</div>
    <div style="padding:12px 16px">
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('stitch_id_label')}</div>
        <input id="new-stitch-id" placeholder="${t('stitch_id_placeholder')}" maxlength="10"
          style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:monospace;text-transform:uppercase"
          oninput="this.value=this.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase()">
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('stitch_name_label')}</div>
        <input id="new-stitch-label" placeholder="${t('stitch_name_placeholder')}" maxlength="16"
          style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:inherit">
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('color_field')}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="color" id="new-stitch-color" value="#7DD3FC"
            style="width:38px;height:38px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
          <span style="font-size:12px;color:var(--muted);font-family:monospace" id="new-color-hex">#7DD3FC</span>
        </div>
      </div>
      <div style="margin-bottom:8px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">${t('category_field')}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${[{v:'basic',l:t('cat_basic_short')},{v:'increase',l:t('cat_increase_short')},{v:'decrease',l:t('cat_decrease_short')},{v:'special',l:t('cat_special_short')}].map(c =>
            `<label style="font-size:12px;color:var(--text);display:flex;align-items:center;gap:3px;cursor:pointer;padding:4px 8px;border:1px solid var(--border);border-radius:8px">
              <input type="radio" name="new-stitch-cat" value="${c.v}" ${c.v==='basic'?'checked':''}> ${c.l}
            </label>`
          ).join('')}
        </div>
      </div>
    </div>
    <div style="padding:10px 16px;display:flex;gap:8px">
      <button class="bar-btn" style="flex:1" onclick="openGlobalStitchLibrary()">${t('back_btn')}</button>
      <button class="bar-btn primary" style="flex:2" onclick="saveGlobalNewStitch()">${t('create_btn')}</button>
    </div>`;

  showSheet(html);

  const colorInput = document.getElementById('new-stitch-color');
  const hexDisplay = document.getElementById('new-color-hex');
  if (colorInput && hexDisplay) {
    colorInput.addEventListener('input', () => { hexDisplay.textContent = colorInput.value; });
  }
}

export function saveGlobalNewStitch() {
  const idInput = document.getElementById('new-stitch-id');
  const labelInput = document.getElementById('new-stitch-label');
  const colorInput = document.getElementById('new-stitch-color');
  const catRadio = document.querySelector('input[name="new-stitch-cat"]:checked');

  const sid = idInput?.value?.trim().toUpperCase();
  if (!sid) { alert(t('stitch_id_required')); return; }
  if (STITCH_LIB[sid]) { alert(t('stitch_id_conflict')); return; }
  if (state.data.settings.globalCustomStitches?.[sid]) { alert(t('stitch_id_exists')); return; }

  const label = labelInput?.value?.trim() || sid;
  const color = colorInput?.value || '#7DD3FC';
  const category = catRadio?.value || 'basic';

  if (!state.data.settings.globalCustomStitches) state.data.settings.globalCustomStitches = {};
  state.data.settings.globalCustomStitches[sid] = { id: sid, label, color, category };

  saveData();
  openGlobalStitchLibrary();
}
