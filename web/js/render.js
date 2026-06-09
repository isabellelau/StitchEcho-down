import { state, getProj, getActivePart, getEditingPartId } from './state.js';
import { esc } from './ui.js';
import { renderTaskSlide, renderDynamicPalette,
         renderFilterToggle, renderBarRow,
         renderSpillHTML, getProjColor, getUnitLabel } from './stitch.js';
import { updateVoiceButton } from './voice.js';

export function renderHome() {
  try {
    document.getElementById("hdr-back").style.display = "none";
    document.getElementById("hdr-title").innerHTML = "<span>🧶 钩织计数本</span>";
    document.getElementById("hdr-sub").textContent = "";
    document.getElementById("hdr-pdf").style.display = "none";
    document.getElementById("hdr-stitch").style.display = "none";
    document.getElementById("hdr-settings").style.display = "none";

    const totalProjs = state.data.projects.length;
    const totalNeedles = state.data.projects.reduce((sum, p) =>
      sum + (p.parts || []).reduce((s, pt) =>
        s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0), 0);

    let html = `<div class="home-top">
    <div class="home-heading">我的项目</div>
    <div style="font-size:12px;color:var(--muted)">${totalProjs} 个项目 · 累计 ${totalNeedles} 针</div>
  </div>`;

    const activeProjs = state.data.projects.filter(p => !p.archived);
    const archivedProjs = state.data.projects.filter(p => p.archived);

    html += `<div class="proj-list">`;
    if (activeProjs.length === 0 && archivedProjs.length === 0) {
      html += `<div style="text-align:center;color:var(--muted);font-size:14px;padding:40px 16px">还没有项目，点击下方创建第一个 🌸</div>`;
    }
    activeProjs.forEach(p => {
      const allRounds = (p.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
      const allNeedles = (p.parts || []).reduce((s, pt) => s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
      const coverHtml = p.coverImage
        ? `<img class="proj-cover-img" src="${p.coverImage}" onclick="event.stopPropagation();pickCover('${p.id}')" title="点击更换封面">`
        : `<div class="proj-icon">🧶</div>`;
      const removeCoverBtn = p.coverImage
        ? `<button class="proj-menu-item" onclick="event.stopPropagation();removeProjectCover('${p.id}')">🗑 移除封面</button>`
        : '';
      const unit = getUnitLabel(p);
      html += `<div class="proj-card" onclick="openProject('${p.id}')">
    ${coverHtml}
    <div class="proj-info">
      <div class="proj-name">${esc(p.name)}</div>
      <div class="proj-meta">${(p.parts||[]).length} 部件 · ${allRounds} ${unit} · ${allNeedles} 针</div>
    </div>
    <button class="proj-del" onclick="toggleProjMenu('${p.id}',event)" style="position:relative">⋯</button>
    <div class="proj-menu${state.flowState.projMenuId === p.id ? ' show' : ''}" id="proj-menu-${p.id}">
      <button class="proj-menu-item" onclick="event.stopPropagation();pickCover('${p.id}')">🖼 设置封面</button>
      ${removeCoverBtn}
      <button class="proj-menu-item" onclick="event.stopPropagation();archiveProject('${p.id}')">📦 归档</button>
      <button class="proj-menu-item danger" onclick="event.stopPropagation();deleteProject('${p.id}',event)">🗑 删除</button>
    </div>
  </div>`;
    });
    html += `</div>`;

    // 已归档项目
    if (archivedProjs.length > 0) {
      html += `<div style="padding:16px 12px 4px">
      <div class="home-heading" style="margin-bottom:8px;opacity:.7">📦 已归档 (${archivedProjs.length})</div>
    </div>`;
      html += `<div class="proj-list">`;
      archivedProjs.forEach(p => {
        const allRounds = (p.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
        const allNeedles = (p.parts || []).reduce((s, pt) => s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
        const coverHtmlArc = p.coverImage
          ? `<img class="proj-cover-img" src="${p.coverImage}" onclick="event.stopPropagation();pickCover('${p.id}')" title="点击更换封面">`
          : `<div class="proj-icon">📦</div>`;
        const removeCoverBtnArc = p.coverImage
          ? `<button class="proj-menu-item" onclick="event.stopPropagation();removeProjectCover('${p.id}')">🗑 移除封面</button>`
          : '';
        const unitArc = getUnitLabel(p);
        html += `<div class="proj-card archived" onclick="openProject('${p.id}')">
      ${coverHtmlArc}
      <div class="proj-info">
        <div class="proj-name">${esc(p.name)}</div>
        <div class="proj-meta">${(p.parts||[]).length} 部件 · ${allRounds} ${unitArc} · ${allNeedles} 针</div>
      </div>
      <button class="proj-del" onclick="toggleProjMenu('${p.id}',event)">⋯</button>
      <div class="proj-menu${state.flowState.projMenuId === p.id ? ' show' : ''}" id="proj-menu-${p.id}">
        <button class="proj-menu-item" onclick="event.stopPropagation();pickCover('${p.id}')">🖼 设置封面</button>
        ${removeCoverBtnArc}
        <button class="proj-menu-item" onclick="event.stopPropagation();unarchiveProject('${p.id}')">📤 取消归档</button>
        <button class="proj-menu-item danger" onclick="event.stopPropagation();deleteProject('${p.id}',event)">🗑 删除</button>
      </div>
    </div>`;
      });
      html += `</div>`;
    }

    document.getElementById("screen").innerHTML = html;
    document.getElementById("bottom-bar").style.display = "none";
    document.getElementById("screen").innerHTML +=
      `<button class="fab" onclick="showNewProjectDialog()">＋ 新建项目</button>`;
  } catch (e) {
    alert('renderHome error: ' + e.message + '\n' + e.stack);
  }
}


export function renderProject() {
  // 编辑模式下禁止 DOM 重构，避免打断输入焦点
  if (window.editingPartId !== null) return;

  // 恢复在 blur 之前捕获的编辑状态
  window.editingPartId = state.flowState.captureEdit || window.editingPartId;
  state.flowState.captureEdit = null;

  const proj = getProj(state.curProjId);
  if (!proj) return window.goHome();
  const part = getActivePart(proj);

  document.getElementById("hdr-back").style.display = "flex";
  document.getElementById("hdr-settings").style.display = "none";
  document.getElementById("tab-nav").style.display = "none";
  document.getElementById("hdr-title").innerHTML =
    `<span id="proj-name-edit" contenteditable="true" onblur="renameProject(this.textContent.trim())"
    style="outline:none;min-width:40px;display:inline-block" title="点击编辑名称">${esc(proj.name)}</span>
    <span onclick="document.getElementById('proj-name-edit').focus()" style="font-size:12px;color:var(--accent);cursor:pointer;margin-left:3px;opacity:.7" title="点击编辑项目名">✎</span>`;

  // 全项目统计
  const allRounds = (proj.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
  const allNeedles = (proj.parts || []).reduce((s, pt) => s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
  const unit = getUnitLabel(proj);
  document.getElementById("hdr-sub").textContent = `${(proj.parts||[]).length} 部件 · ${allRounds} ${unit} · ${allNeedles} 针`;

  // 活跃圈 id：以 activeRoundId 为准，找不到则 fallback 到最后一圈
  const activeRid = part && part.rounds.length ? (part.rounds.find(r => r.id === part.activeRoundId)?.id || part.rounds[part.rounds.length - 1].id) : null;

  let html = "";

  // 圈/行切换
  html += `<div style="display:flex;justify-content:flex-end;padding:4px 16px 0">
        <span style="font-size:10px;color:var(--muted);cursor:pointer;border:1px solid var(--border);border-radius:10px;padding:2px 8px;background:var(--card)" onclick="toggleRowTerms()">显示：${unit} ▾</span>
      </div>`;

  // ── 部件选项卡 ──
  html += `<div class="part-tabs-wrap" id="part-tabs-wrap">
      <div class="part-tabs-scroll" onmousedown="state.flowState.captureEdit=getEditingPartId()">`;
  (proj.parts || []).forEach(pt => {
    const isActive = pt.id === (part?.id || proj.activePartId);
    const isEditing = pt.id === window.editingPartId;
    html += `<button class="part-tab${isActive ? " active" : ""}"
      onclick="switchPart('${pt.id}')"
      title="${esc(pt.title)}">
      <span class="part-name-text" style="${isEditing ? 'display:none' : ''}">${esc(pt.title)}</span>
      <input class="part-name-input" value="${esc(pt.title)}"
        style="${isEditing ? '' : 'display:none'}"
        onclick="event.stopPropagation()"
        onfocus="this.setSelectionRange(this.value.length, this.value.length)"
        onblur="partNameBlur(this, '${pt.id}')"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">
      <span class="part-tab-edit-icon" onclick="handleEditBtnClick(event, '${pt.id}', this)" style="font-size:11px;cursor:pointer;opacity:.6;margin-left:2px" title="${isEditing ? '完成编辑' : '编辑名称'}">${isEditing ? '✔' : '✎'}</span>
      ${(proj.parts||[]).length > 1 ? `<span class="part-tab-del" onclick="handleDeleteBtnClick(event, '${pt.id}')" title="删除部件">×</span>` : ''}
    </button>`;
  });
  html += `<button class="part-tab part-tab-add" onclick="addPart()" title="新增部件">＋</button>
      </div></div>`;

  html += renderTaskSlide(proj);

  html += `<div class="rounds-wrap">`;
  if (part) part.rounds.forEach((r, i) => {
    const isActive = r.id === activeRid;
    const exp = state.expandedRounds.has(r.id) || isActive;
    const total = r.seq.length;
    const dots = r.seq.slice(-8).map(sid => `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${getProjColor(sid, proj)};margin-right:2px"></span>`).join("");

    html += `<div class="round-card" id="round-${r.id}">
    <div class="round-hdr" onclick="toggleRound('${r.id}')">
      <div class="round-badge${isActive ? " active" : ""}" onclick="event.stopPropagation();setActiveRound(null,'${r.id}')" style="cursor:pointer" title="点击设为当前${unit}">${r.isTextCard ? "文" : (r.roundNum === 0 ? "起" : (r.roundNum != null ? r.roundNum : i + 1))}</div>
      <div class="round-info">
        <div class="round-label">${r.isTextCard ? (r.instruction || "备注") : (r.roundNum === 0 ? "起针" : `第 ${r.roundNum != null ? r.roundNum : i + 1} ${unit}`)}${isActive ? " <span style='font-size:10px;background:var(--accent);color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px'>编辑中</span>" : ""}</div>
        <div class="round-count">${total} 针 ${dots}</div>
      </div>
      <button class="round-del" onclick="event.stopPropagation();deleteRound('${r.id}')" title="删除这一${unit}">×</button>
      <span class="round-chev${exp ? " open" : ""}">›</span>
    </div>
    <div class="round-body${exp ? " open" : ""}">`;

    html += `<div class="seq-wrap">`;
    if (r.seq.length === 0) {
      html += `<span class="seq-empty">暂无记录，点击下方针法按钮添加</span>`;
    } else {
      r.seq.forEach((sid, idx) => {
        html += renderSpillHTML(sid, idx, r, proj);
      });
    }
    html += `</div>`;
    html += `</div></div>`;
  });

  html += `</div>`;
  document.getElementById("screen").innerHTML = html;

  const bar = document.getElementById("bottom-bar");
  bar.style.display = "block";
  let bhtml = renderDynamicPalette(proj);
  bhtml += renderFilterToggle();
  bhtml += renderBarRow();

  if (localStorage.getItem('voice_hint_shown') === null) {
    bhtml += `<div id="voice-hint-banner" style="
      background:#FEF3C7;border-top:1px solid #FDE68A;
      padding:10px 14px;display:flex;
      align-items:center;gap:8px;
      font-size:13px;color:#92400E;">
      <span style="flex:1">🎙 试试语音模式，解放双手钩织</span>
      <button onclick="openVoiceTutorial()"
        style="background:none;border:none;color:var(--accent);
        font-weight:700;font-size:13px;cursor:pointer;
        font-family:inherit;padding:0">了解 ›</button>
      <button onclick="dismissVoiceHint()"
        style="background:none;border:none;color:#92400E;
        font-size:18px;cursor:pointer;line-height:1;
        padding:0 0 0 4px;opacity:.6">×</button>
    </div>`;
  }

  bar.innerHTML = bhtml;
  const barH = document.getElementById('bottom-bar').offsetHeight;
  document.documentElement.style.setProperty('--bottom-bar-h', barH + 'px');
  updateVoiceButton();
}
