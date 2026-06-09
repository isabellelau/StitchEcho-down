import { state, uid, getProj, getActivePart } from './state.js';
import { showSheet, showToast, esc, showConfirmDialog, showEntryChoiceSheet } from './ui.js';
import { saveData, migrateData, exportSingleProject } from './storage.js';
import { getUnitLabel } from './stitch.js';

export function openProject(id) {
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
  document.getElementById("hdr-pdf").style.display = "block";
  document.getElementById("hdr-stitch").style.display = "block";
  document.getElementById("hdr-settings").style.display = "none";
  document.getElementById("tab-nav").style.display = "none";
  document.getElementById("bottom-bar").style.display = "block";
  const screen = document.getElementById("screen");
  screen.classList.add("enter-forward");
  screen.addEventListener("animationend", () => screen.classList.remove("enter-forward"), { once: true });
  window.renderProject();
}

export function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported || typeof imported !== 'object') throw new Error('文件格式错误');
      if (!Array.isArray(imported.projects)) throw new Error('缺少 projects 数组');

      imported.projects.forEach((p, i) => {
        if (!p.id || !p.name) throw new Error(`第 ${i + 1} 个项目缺少必要字段`);
      });

      showConfirmDialog(`确定导入备份？\n共有 ${imported.projects.length} 个项目\n当前 ${state.data.projects.length} 个项目将被覆盖`, (ok) => {
        if (!ok) return;
        Object.keys(state.data).forEach(k => delete state.data[k]);
        Object.assign(state.data, imported);
        migrateData(state.data);
        saveData();
        window.renderHome();
        alert('✅ 数据恢复成功');
      });
    } catch (err) {
      alert('❌ 导入失败：' + err.message);
    } finally {
      input.value = '';
    }
  };
  reader.onerror = () => {
    alert('❌ 文件读取失败');
    input.value = '';
  };
  reader.readAsText(file);
}

export function showNewProjectDialog() {
  state.dlgCallback = (name) => {
    if (!name.trim()) return;
    const r = { id: uid(), seq: [], instruction: "", isTextCard: false };
    const partId = uid();
    const proj = {
      id: uid(), name: name.trim(),
      parts: [{ id: partId, title: '主图解', rawPattern: '', rounds: [r], activeRoundId: r.id, customPalette: null }],
      activePartId: partId,
      customSettings: { names: {}, colors: {}, customStitches: {} },
      useRowTerms: false
    };
    state.data.projects.push(proj);
    saveData();
    state.curProjId = String(proj.id);
    state.expandedRounds.clear();
    state.selectedStitch = null;
    document.getElementById("hdr-pdf").style.display = "block";
    document.getElementById("hdr-stitch").style.display = "block";
    document.getElementById("hdr-settings").style.display = "none";
    state.flowState.newProjectFlow = true;
    showEntryChoiceSheet();
  };
  document.getElementById("dlg-title").textContent = "新建项目";
  document.getElementById("dlg-msg").style.display = "none";
  document.getElementById("dlg-input").style.display = "";
  document.getElementById("dlg-input").value = "";
  state.confirmCallback = null;
  document.getElementById("dialog").classList.add("show");
  setTimeout(() => document.getElementById("dlg-input").focus(), 100);
}

export function toggleProjMenu(id, e) {
  e.stopPropagation();
  if (state.flowState.projMenuId === id) {
    state.flowState.projMenuId = null;
  } else {
    state.flowState.projMenuId = id;
  }
  window.renderHome();
}

export function archiveProject(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (!proj) return;

  showConfirmDialog(`确定归档「${proj.name}」？归档后可在下方列表找到，仍可继续编辑。`, (ok) => {
    if (!ok) return;
    proj.archived = true;
    state.flowState.projMenuId = null;
    saveData();
    window.renderHome();
    showArchiveSuccessSheet(proj);
  });
}

export function showArchiveSuccessSheet(proj) {
  const isHintHidden = localStorage.getItem('hide_pwa_hint') === 'true';
  const allNeedles = (proj.parts || []).reduce((s, pt) =>
    s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
  const allRounds = (proj.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
  const unit = getUnitLabel(proj);

  let pwaHint = '';
  if (!isHintHidden) {
    pwaHint = `
      <div style="margin:0 16px 12px;padding:14px;background:#FEF3C7;border-radius:12px;font-size:12px;color:#92400E;line-height:1.6">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-weight:bold">💡 技巧提示</div>
          <div onclick="event.stopPropagation();showPwaTutorial()" style="color:#C07A45;font-weight:bold;cursor:pointer;text-decoration:underline;white-space:nowrap">详细教程 ></div>
        </div>
        您可以将本页面"添加到主屏幕"，下次即可像 App 一样从桌面直接打开，体验更沉浸。
        <div style="margin-top:8px;display:flex;align-items:center;gap:6px;opacity:0.8;cursor:pointer" onclick="handlePwaHintOptOut(event)">
          <input type="checkbox" id="stop-pwa-hint" style="width:14px;height:14px;accent-color:#C07A45">
          <label for="stop-pwa-hint" style="cursor:pointer">后续不再提示</label>
        </div>
      </div>`;
  }

  const html = `<div class="sheet-handle"></div>
    <div style="text-align:center;padding:20px 16px 12px">
      <div style="font-size:36px;margin-bottom:8px">📦</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">「${esc(proj.name)}」已归档</div>
      <div style="font-size:12px;color:var(--muted)">${allRounds} ${unit} · ${allNeedles} 针</div>
    </div>
    ${pwaHint}
    <div style="margin:0 16px 8px;padding:14px;background:var(--bg);border-radius:12px">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">💾 下载备份文件</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:10px">如果你需要<strong>换手机</strong>或<strong>多设备使用</strong>，建议保存一份备份。平时只用一台手机的话，无需操作。</div>
      <button class="bar-btn primary" style="width:100%" onclick="exportSingleProject('${proj.id}')">下载「${esc(proj.name)}」的备份</button>
    </div>
    <div id="backup-guide" style="display:none;margin:0 16px 8px;padding:12px 14px;background:var(--bg);border-radius:10px;font-size:12px;color:var(--muted);line-height:1.8">
      📁 <strong>在哪里找到备份文件？</strong><br>
      iPhone：文件 App → 我的iPhone → 下载<br>
      安卓：文件管理器 → 下载文件夹<br><br>
      📲 <strong>防丢小技巧：</strong>把文件发送到<strong>微信收藏</strong>，换手机后也能找回
    </div>
    <button class="sheet-cancel" onclick="closeSheet()">完成</button>`;

  showSheet(html);
}

export function handlePwaHintOptOut(e) {
  const checkbox = document.getElementById('stop-pwa-hint');
  if (e.target !== checkbox) {
    checkbox.checked = !checkbox.checked;
  }
  if (checkbox.checked) {
    localStorage.setItem('hide_pwa_hint', 'true');
  } else {
    localStorage.removeItem('hide_pwa_hint');
  }
}

export function showPwaTutorial() {
  const content = `
    <div class="sheet-handle"></div>
    <div style="padding:16px 16px 8px;max-height:70vh;overflow-y:auto">
      <h3 style="font-size:18px;margin-bottom:16px;text-align:center">如何安装为 App</h3>

      <div style="display:flex;flex-direction:column;gap:20px;color:var(--text);line-height:1.6">
        <section>
          <h4 style="color:var(--accent);margin-bottom:8px"> iOS (Safari 浏览器)</h4>
          <p style="font-size:13px">1. 点击浏览器底部的<strong>分享按钮</strong>（方框带向上箭头）。</p>
          <p style="font-size:13px">2. 向上滑动菜单，找到并点击<strong>"添加到主屏幕"</strong>。</p>
          <p style="font-size:13px">3. 点击右上角的"添加"即可完成。</p>
        </section>

        <section>
          <h4 style="color:var(--accent);margin-bottom:8px">🤖 Android (Chrome/自带浏览器)</h4>
          <p style="font-size:13px">1. 点击右上角或右下角的<strong>"三个点"</strong>或"菜单"图标。</p>
          <p style="font-size:13px">2. 找到并点击<strong>"安装应用"</strong>或<strong>"添加到主屏幕"</strong>。</p>
          <p style="font-size:13px">3. 根据系统提示完成添加。</p>
        </section>

        <section style="background:var(--bg);padding:12px;border-radius:10px">
          <h4 style="font-size:14px;margin-bottom:4px">为什么推荐安装？</h4>
          <ul style="font-size:12px;color:var(--muted);padding-left:16px">
            <li><strong>离线可用</strong>：在没有网络的情况下也能打开和使用。</li>
            <li><strong>纯净体验</strong>：隐藏浏览器地址栏，操作空间更大。</li>
            <li><strong>快速启动</strong>：直接从桌面点击图标，无需在浏览器标签页寻找。</li>
          </ul>
        </section>
      </div>

      <button class="sheet-cancel" onclick="closeSheet()" style="width:100%;margin-top:24px">我知道了</button>
    </div>`;

  showSheet(content);
}

export function unarchiveProject(id) {
  const proj = state.data.projects.find(p => String(p.id) === String(id));
  if (proj) { proj.archived = false; state.flowState.projMenuId = null; saveData(); window.renderHome(); }
}

export function deleteProject(id, e) {
  e.stopPropagation();
  state.flowState.projMenuId = null;
  showConfirmDialog("确定要删除这个项目吗？此操作不可恢复。", (ok) => {
    if (!ok) return;
    state.data.projects = state.data.projects.filter(p => String(p.id) !== String(id));
    saveData(); window.renderHome();
  });
}

export function renameProject(name) {
  if (!name || !state.curProjId) return;
  const proj = getProj(state.curProjId);
  if (proj) { proj.name = name; saveData(); }
}

export function compressImage(file, maxSize = 300) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(maxSize / width, maxSize / height, 1);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

export function setProjectCover(projectId, input) {
  const file = input.files?.[0];
  if (!file) return;
  compressImage(file).then(dataUrl => {
    const proj = getProj(projectId);
    if (!proj) return;
    proj.coverImage = dataUrl;
    saveData();
    window.renderHome();
    showToast('封面已更新');
  }).catch(() => showToast('图片处理失败'));
  input.value = '';
}

export function removeProjectCover(projectId) {
  const proj = getProj(projectId);
  if (!proj) return;
  proj.coverImage = null;
  saveData();
  window.renderHome();
  showToast('封面已移除');
}

export function pickCover(projectId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => setProjectCover(projectId, input);
  input.click();
}
