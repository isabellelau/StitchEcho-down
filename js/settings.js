import { state, getProj } from './state.js';
import { showConfirmDialog, showToast, closeSheet } from './ui.js';
import { saveData } from './storage.js';

export function openSettings() {
  const theme = state.data.settings.theme || "macaron";
  const voiceOn = state.data.settings.voiceEnabled;
  const totalProjs = state.data.projects.length;
  const totalNeedles = state.data.projects.reduce((sum, p) =>
    sum + (p.parts || []).reduce((s, pt) =>
      s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0), 0);

  const themes = [
    { key: "macaron", name: "马卡龙", dots: ["#7DD3FC", "#F9A8D4", "#2bf14f", "#f3da77"] },
    { key: "ocean",   name: "深海",   dots: ["#5BC0DE", "#48DBFB", "#FF9FF3", "#6C5CE7"] },
    { key: "forest",  name: "森林",   dots: ["#55E6C1", "#26DE81", "#FD79A8", "#A3CB38"] },
    { key: "minimal", name: "简约",   dots: ["#636E72", "#95A5A6", "#2ED573", "#FF6B81"] }
  ];

  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">⚙️ 设置</div>

  <div class="sheet-section">外观</div>
  <div class="settings-theme-grid">`;
  themes.forEach(t => {
    const active = theme === t.key ? " active" : "";
    const dotHtml = t.dots.map(c => `<span class="settings-theme-dot" style="background:${c}"></span>`).join("");
    html += `<div class="settings-theme-item${active}" onclick="changeTheme('${t.key}')">
    <div class="settings-theme-dots">${dotHtml}</div>
    <div class="settings-theme-name">${t.name}</div>
  </div>`;
  });
  html += `</div>`;

  html += `
  <div class="sheet-section">语音</div>
  <div class="settings-item" onclick="toggleVoiceDefault()">
    <div>
      <div class="settings-item-label">进入项目默认开启语音</div>
    </div>
    <span class="settings-toggle${voiceOn ? ' on' : ''}" id="settings-voice-toggle"><span class="settings-toggle-knob"></span></span>
  </div>`;

  html += `
  <div class="sheet-section">数据管理</div>
  <div class="settings-stat">当前 ${totalProjs} 个项目 · 累计 ${totalNeedles} 针</div>
  <div class="settings-btn-row">
    <button class="settings-btn settings-btn-secondary" onclick="exportData()">📤 导出备份</button>
    <label class="settings-btn settings-btn-secondary" style="display:block;text-align:center">
      📥 导入备份
      <input type="file" accept="application/json,.json" style="display:none" onchange="importData(this)">
    </label>
    <button class="settings-btn settings-btn-danger" onclick="clearAllData()">🗑 清空所有数据</button>
  </div>`;

  html += `
  <div class="sheet-section">安装</div>
  <div class="settings-btn-row">
    <button class="settings-btn settings-btn-primary" onclick="showPwaTutorial()">📲 安装到主屏幕</button>
  </div>`;

  html += `<button class="sheet-cancel" onclick="closeSheet()">关闭</button>`;

  document.getElementById("sheet").innerHTML = html;
  document.getElementById("sheet").classList.add("show");
  document.getElementById("overlay").classList.add("show");
}

export function renderSettings() {
  document.getElementById("hdr-back").style.display = "none";
  document.getElementById("hdr-title").innerHTML = "<span>⚙️ 设置</span>";
  document.getElementById("hdr-sub").textContent = "";
  document.getElementById("hdr-pdf").style.display = "none";
  document.getElementById("hdr-settings").style.display = "none";
  document.getElementById("bottom-bar").style.display = "none";

  const theme = state.data.settings.theme || "macaron";
  const voiceOn = state.data.settings.voiceEnabled;
  const totalProjs = state.data.projects.length;
  const totalNeedles = state.data.projects.reduce((sum, p) =>
    sum + (p.parts || []).reduce((s, pt) =>
      s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0), 0);

  const themes = [
    { key: "macaron", name: "马卡龙", dots: ["#7DD3FC", "#F9A8D4", "#2bf14f", "#f3da77"] },
    { key: "ocean",   name: "深海",   dots: ["#5BC0DE", "#48DBFB", "#FF9FF3", "#6C5CE7"] },
    { key: "forest",  name: "森林",   dots: ["#55E6C1", "#26DE81", "#FD79A8", "#A3CB38"] },
    { key: "minimal", name: "简约",   dots: ["#636E72", "#95A5A6", "#2ED573", "#FF6B81"] }
  ];

  let html = `<div style="padding:12px 0">`;

  // 外观
  html += `<div class="sheet-section">外观</div>`;
  html += `<div class="settings-theme-grid">`;
  themes.forEach(t => {
    const active = theme === t.key ? " active" : "";
    const dotHtml = t.dots.map(c => `<span class="settings-theme-dot" style="background:${c}"></span>`).join("");
    html += `<div class="settings-theme-item${active}" onclick="changeTheme('${t.key}')">
    <div class="settings-theme-dots">${dotHtml}</div>
    <div class="settings-theme-name">${t.name}</div>
  </div>`;
  });
  html += `</div>`;

  // 语音
  html += `<div class="sheet-section">语音</div>`;
  html += `<div class="settings-item" onclick="toggleVoiceDefault()">
    <div>
      <div class="settings-item-label">进入项目默认开启语音</div>
    </div>
    <span class="settings-toggle${voiceOn ? ' on' : ''}" id="settings-voice-toggle"><span class="settings-toggle-knob"></span></span>
  </div>`;
  const soundOn = state.data.settings.voiceSoundEnabled;
  html += `<div class="settings-item" onclick="toggleVoiceSound()">
    <div>
      <div class="settings-item-label">语音模式音效</div>
    </div>
    <span class="settings-toggle${soundOn ? ' on' : ''}" id="settings-voice-sound-toggle"><span class="settings-toggle-knob"></span></span>
  </div>`;
  html += `<div class="sheet-item" onclick="openVoiceTutorial()">
    <div class="sheet-item-icon" style="background:#FEF3C7;font-size:16px">🎙</div>
    <div>
      <div class="sheet-item-label">语音模式使用说明</div>
      <div class="sheet-item-sub">了解如何用语音解放双手</div>
    </div>
    <span style="color:var(--muted);font-size:16px;flex-shrink:0">›</span>
  </div>`;

  // 数据管理
  html += `<div class="sheet-section">数据管理</div>`;
  html += `<div class="settings-stat">${totalProjs} 个项目 · 累计 ${totalNeedles} 针</div>`;
  html += `<div class="settings-btn-row">
    <button class="settings-btn settings-btn-secondary" onclick="exportData()">📤 导出备份</button>
    <label class="settings-btn settings-btn-secondary" style="display:block;text-align:center">
      📥 导入备份
      <input type="file" accept="application/json,.json" style="display:none" onchange="importData(this)">
    </label>
    <button class="settings-btn settings-btn-danger" onclick="clearAllData()">🗑 清空所有数据</button>
  </div>`;

  // 安装
  html += `<div class="sheet-section">安装</div>`;
  html += `<div class="settings-btn-row">
    <button class="settings-btn settings-btn-primary" onclick="showPwaTutorial()">📲 安装到主屏幕</button>
  </div>`;

  // 关于
  html += `<div class="sheet-section">关于</div>`;
  html += `<div class="settings-btn-row">
    <div style="text-align:center;padding:12px;color:var(--muted);font-size:13px">钩织计数本 v0.1</div>
  </div>`;

  html += `</div>`;

  document.getElementById("screen").innerHTML = html;
}

export function changeTheme(themeKey) {
  state.data.settings.theme = themeKey;
  saveData();
  // 更新 sheet 中的选中态
  document.querySelectorAll('.settings-theme-item').forEach(el => el.classList.remove('active'));
  const idx = { macaron: 0, ocean: 1, forest: 2, minimal: 3 }[themeKey];
  const items = document.querySelectorAll('.settings-theme-item');
  if (items[idx]) items[idx].classList.add('active');
  // 如果在项目页，只刷新底部调色板
  if (state.curProjId) {
    const proj = getProj(state.curProjId);
    if (proj) {
      const bar = document.getElementById("bottom-bar");
      if (bar) {
        let bhtml = window.renderDynamicPalette(proj);
        bhtml += window.renderFilterToggle();
        bhtml += window.renderBarRow();
        bar.innerHTML = bhtml;
        window.updateVoiceButton();
      }
    }
  }
}

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

export function clearAllData() {
  showConfirmDialog("确定要清空所有数据吗？此操作不可恢复。", (ok) => {
    if (!ok) return;
    state.data.projects = [];
    saveData();
    if (state.curProjId) {
      window.goHome();
    } else {
      window.renderHome();
    }
    showToast("所有数据已清空");
  });
}
