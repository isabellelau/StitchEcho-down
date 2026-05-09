import { state, uid, getProj, getActivePart } from './state.js';
import { showSheet, closeSheet, showToast, esc, showConfirmDialog } from './ui.js';
import { saveData } from './storage.js';
import { STITCH_LIB, STITCHES, SM, extractStitches, resolveColor } from '../stitches.js';
import { updateVoiceButton } from './voice.js';

export function getUnitLabel(proj) {
  const p = proj || getProj(state.curProjId);
  return p && p.useRowTerms ? '行' : '圈';
}

export function toggleRowTerms() {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  proj.useRowTerms = !proj.useRowTerms;
  saveData();
  window.renderProject();
}

function resolveLabel(sid, proj) {
  if (proj?.customSettings?.names?.[sid]) return proj.customSettings.names[sid];
  const s = STITCH_LIB[sid];
  return s ? s.label : sid;
}

const ALL_THEMES = {
  macaron: null,
  ocean: {
    X: "#5BC0DE", T: "#7ED6DF", F: "#2980B9", E: "#6C5CE7",
    V: "#48DBFB", W: "#0ABDE3", TV: "#54A0FF", TW: "#2E86DE",
    FV: "#0984E3", FW: "#0652DD", EV: "#4834D4",
    A: "#FF9FF3", M: "#F368E0", TA: "#FF6B6B", TM: "#EE5A24",
    FA: "#FDA7DF", FM: "#D980FA", EA: "#B53471",
    CH: "#C23616", SL: "#95A5A6", SK: "#BDC3C7", G: "#E84393", Q: "#A29BFE"
  },
  forest: {
    X: "#55E6C1", T: "#A3CB38", F: "#218C74", E: "#6A89CC",
    V: "#58B19F", W: "#1B9A59", TV: "#82CCDD", TW: "#B8E994",
    FV: "#26DE81", FW: "#20BF6B", EV: "#3B3B98",
    A: "#FD79A8", M: "#E84393", TA: "#E66767", TM: "#F97F51",
    FA: "#F8A5C2", FM: "#C4E538", EA: "#B33771",
    CH: "#C44569", SL: "#A4B0BE", SK: "#CED6E0", G: "#FF6B81", Q: "#778BEB"
  },
  minimal: {
    X: "#636E72", T: "#95A5A6", F: "#7F8C8D", E: "#57606F",
    V: "#2ED573", W: "#1E90FF", TV: "#26DE81", TW: "#10AC84",
    FV: "#45AAF2", FW: "#2E86DE", EV: "#5F27CD",
    A: "#FF6B81", M: "#FF4757", TA: "#FFA502", TM: "#Eccc68",
    FA: "#FF6348", FM: "#FF9F43", EA: "#EE5A24",
    CH: "#C44569", SL: "#A4B0BE", SK: "#CED6E0", G: "#FD79A8", Q: "#778BEB"
  }
};

export function getProjColor(sid, proj) {
  const themeKey = state.data?.settings?.theme || "macaron";
  const ext = ALL_THEMES[themeKey];
  if (ext && ext[sid]) return ext[sid];
  const color = resolveColor(sid, state.data.settings, proj?.customSettings);
  if (color !== '#ccc') return color;
  const cs = proj?.customSettings?.customStitches?.[sid];
  return cs?.color || color;
}

export function getStitchInfo(sid, proj) {
  const cs = proj?.customSettings?.customStitches?.[sid];
  const lib = STITCH_LIB[sid];
  if (!cs && !lib) return null;
  return {
    id: sid,
    label: resolveLabel(sid, proj),
    abbr: cs ? cs.id : (lib?.abbr || sid),
    color: getProjColor(sid, proj),
    category: cs?.category || lib?.category || 'basic',
    isCustom: !!cs
  };
}

function getAllStitchesForProject(proj) {
  const list = STITCHES.map(s => ({
    ...s,
    label: resolveLabel(s.id, proj),
    color: getProjColor(s.id, proj)
  }));
  if (proj?.customSettings?.customStitches) {
    Object.values(proj.customSettings.customStitches).forEach(cs => {
      list.push({
        id: cs.id,
        label: resolveLabel(cs.id, proj),
        abbr: cs.id,
        color: getProjColor(cs.id, proj),
        category: cs.category || 'basic'
      });
    });
  }
  return list;
}

export function findRound(proj, roundId) {
  if (!proj || !proj.parts) return null;
  for (const part of proj.parts) {
    const r = part.rounds.find(r => r.id === roundId);
    if (r) return r;
  }
  return null;
}

export function getRoundStitches(round) {
  if (!round || !round.instruction || !round.instruction.trim()) return [];
  return [...new Set(extractStitches(round.instruction))];
}

export function renderSpillHTML(sid, idx, r, proj) {
  const info = getStitchInfo(sid, proj);
  if (!info) return '';
  const sel = state.selectedStitch && state.selectedStitch.roundId === r.id && state.selectedStitch.idx === idx;
  const bg = info.color + "28";
  return `<span class="spill${sel ? " selected" : ""}"
    style="background:${bg};border-color:${info.color};color:${info.color}"
    onclick="stitchTap('${r.id}',${idx})">
    <span class="spill-idx">${idx + 1}</span>
    <span class="spill-abbr">${esc(info.abbr)}</span>
  </span>`;
}

export function updateRoundHeader(r, proj) {
  const roundEl = document.getElementById("round-" + r.id);
  if (!roundEl) return;
  const countEl = roundEl.querySelector('.round-count');
  if (countEl) {
    const total = r.seq.length;
    const dots = r.seq.slice(-8).map(sid => {
      const c = getProjColor(sid, proj);
      return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};margin-right:2px"></span>`;
    }).join("");
    countEl.innerHTML = `${total} 针 ${dots}`;
  }
}

export function updateHeaderStats(proj) {
  const allRounds = (proj.parts || []).reduce((s, pt) => s + (pt.rounds?.length || 0), 0);
  const allNeedles = (proj.parts || []).reduce((s, pt) => s + (pt.rounds || []).reduce((ss, r) => ss + (r.seq?.length || 0), 0), 0);
  const hdrSub = document.getElementById("hdr-sub");
  const unit = getUnitLabel(proj);
  if (hdrSub) hdrSub.textContent = `${(proj.parts||[]).length} 部件 · ${allRounds} ${unit} · ${allNeedles} 针`;
}

function updateTaskSlideProgress(r) {
  const proj = getProj(state.curProjId);
  const slide = document.getElementById('task-slide');
  if (!slide) return;
  slide.outerHTML = renderTaskSlide(proj);
}

export function reindexSpills(seqWrap, roundId) {
  const spills = seqWrap.querySelectorAll('.spill');
  spills.forEach((spill, i) => {
    const idxEl = spill.querySelector('.spill-idx');
    if (idxEl) idxEl.textContent = i + 1;
    spill.setAttribute('onclick', `stitchTap('${roundId}',${i})`);
    if (state.selectedStitch && state.selectedStitch.roundId === roundId && state.selectedStitch.idx === i) {
      spill.classList.add('selected');
    } else {
      spill.classList.remove('selected');
    }
  });
}

export function pushStitch(sid) {
  const proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const r = part.rounds.find(x => x.id === part.activeRoundId);
  if (!r) return;

  r.seq.push(sid);

  saveData();

  const roundEl = document.getElementById("round-" + r.id);
  if (roundEl) {
    const seqWrap = roundEl.querySelector('.seq-wrap');
    if (seqWrap) {
      const emptySpan = seqWrap.querySelector('.seq-empty');
      if (emptySpan) emptySpan.remove();
      const idx = r.seq.length - 1;
      seqWrap.insertAdjacentHTML('beforeend', renderSpillHTML(sid, idx, r, proj));
    }
    updateRoundHeader(r, proj);
    updateHeaderStats(proj);
    updateTaskSlideProgress(r);
    roundEl.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    window.renderProject();
    const el = document.getElementById("round-" + r.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function undoStitch() {
  const proj = getProj(state.curProjId);
  const part = getActivePart(proj);
  if (!part) return;
  const r = part.rounds.find(x => x.id === part.activeRoundId);
  if (!r || !r.seq.length) return;
  r.seq.pop();
  saveData();

  const roundEl = document.getElementById("round-" + r.id);
  if (roundEl) {
    const seqWrap = roundEl.querySelector('.seq-wrap');
    if (seqWrap) {
      const lastSpill = seqWrap.querySelector('.spill:last-child');
      if (lastSpill) lastSpill.remove();
      if (r.seq.length === 0) {
        seqWrap.innerHTML = '<span class="seq-empty">暂无记录，点击下方针法按钮添加</span>';
      }
    }
    updateRoundHeader(r, proj);
    updateHeaderStats(proj);
    updateTaskSlideProgress(r);
  } else {
    window.renderProject();
  }
}

export function stitchTap(roundId, idx) {
  state.selectedStitch = { roundId, idx };
  openStitchSheet(roundId, idx);
}

function openStitchSheet(roundId, idx) {
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  const sid = r.seq[idx];
  const s = SM[sid];
  const projColor = getProjColor(sid, proj);
  const projLabel = resolveLabel(sid, proj);

  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">第 ${idx + 1} 针 · <span style="color:${projColor};font-weight:700">${esc(projLabel)}</span></div>`;

  html += `<div class="sheet-section">更改为</div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:8px 14px">`;
  getAllStitchesForProject(proj).forEach(st => {
    if (st.id === sid) return;
    html += `<button class="picker-btn" style="background:${st.color}" onclick="changeStitch('${roundId}',${idx},'${st.id}')">${esc(st.label)}</button>`;
  });
  html += `</div>`;

  html += `<div class="sheet-section" style="margin-top:4px">插入针法</div>`;
  html += `<div class="sheet-item" onclick="startInsert('${roundId}',${idx},'before')">
    <div class="sheet-item-icon" style="background:#EFF6FF;color:#3B82F6">↑</div>
    <div><div class="sheet-item-label">在此针前插入</div><div class="sheet-item-sub">第 ${idx + 1} 针之前</div></div>
  </div>`;
  html += `<div class="sheet-item" onclick="startInsert('${roundId}',${idx},'after')">
    <div class="sheet-item-icon" style="background:#F0FDF4;color:#22C55E">↓</div>
    <div><div class="sheet-item-label">在此针后插入</div><div class="sheet-item-sub">第 ${idx + 1} 针之后</div></div>
  </div>`;

  html += `<div class="sheet-item sheet-del" onclick="deleteStitch('${roundId}',${idx})">
    <div class="sheet-item-icon" style="background:#FEF2F2;color:#EF4444">×</div>
    <div><div class="sheet-item-label" style="color:#EF4444">删除此针</div></div>
  </div>`;

  html += `<button class="sheet-cancel" onclick="closeSheet()">取消</button>`;
  showSheet(html);
}

export function changeStitch(roundId, idx, sid) {
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  if (!r) return;
  r.seq[idx] = sid;
  saveData(); closeSheet();

  const roundEl = document.getElementById("round-" + r.id);
  if (roundEl) {
    const seqWrap = roundEl.querySelector('.seq-wrap');
    if (seqWrap) {
      const spills = seqWrap.querySelectorAll('.spill');
      if (spills[idx]) {
        const info = getStitchInfo(sid, proj);
        if (info) {
          const bg = info.color + "28";
          spills[idx].style.background = bg;
          spills[idx].style.borderColor = info.color;
          spills[idx].style.color = info.color;
          const abbrEl = spills[idx].querySelector('.spill-abbr');
          if (abbrEl) abbrEl.textContent = esc(info.abbr);
        }
      }
    }
    updateRoundHeader(r, proj);
  } else {
    window.renderProject();
  }
}

export function deleteStitch(roundId, idx) {
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  if (!r) return;
  r.seq.splice(idx, 1);
  saveData(); closeSheet();

  const roundEl = document.getElementById("round-" + r.id);
  if (roundEl) {
    const seqWrap = roundEl.querySelector('.seq-wrap');
    if (seqWrap) {
      const spills = seqWrap.querySelectorAll('.spill');
      if (spills[idx]) spills[idx].remove();
      if (r.seq.length === 0) {
        seqWrap.innerHTML = '<span class="seq-empty">暂无记录，点击下方针法按钮添加</span>';
      } else {
        reindexSpills(seqWrap, roundId);
      }
    }
    updateRoundHeader(r, proj);
    updateHeaderStats(proj);
    if (state.selectedStitch && state.selectedStitch.roundId === roundId) {
      if (state.selectedStitch.idx === idx) {
        state.selectedStitch = null;
      } else if (state.selectedStitch.idx > idx) {
        state.selectedStitch.idx--;
      }
    }
  } else {
    window.renderProject();
  }
}

export function startInsert(roundId, idx, dir) {
  state.pendingInsert = { roundId, idx, dir };
  const proj = getProj(state.curProjId);
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">选择要插入的针法</div>
  <div class="picker-grid">`;
  getAllStitchesForProject(proj).forEach(s => {
    html += `<button class="picker-btn" style="background:${s.color}" onclick="doInsert('${s.id}')">${esc(s.label)}</button>`;
  });
  html += `</div><button class="sheet-cancel" onclick="closeSheet()">取消</button>`;
  showSheet(html);
}

export function doInsert(sid) {
  if (!state.pendingInsert) return;
  const { roundId, idx, dir } = state.pendingInsert;
  const proj = getProj(state.curProjId);
  const r = findRound(proj, roundId);
  if (!r) return;
  const pos = dir === "before" ? idx : idx + 1;
  r.seq.splice(pos, 0, sid);
  state.pendingInsert = null;
  saveData(); closeSheet();

  const roundEl = document.getElementById("round-" + r.id);
  if (roundEl) {
    const seqWrap = roundEl.querySelector('.seq-wrap');
    if (seqWrap) {
      const emptySpan = seqWrap.querySelector('.seq-empty');
      if (emptySpan) emptySpan.remove();

      const spills = seqWrap.querySelectorAll('.spill');
      const spillHtml = renderSpillHTML(sid, pos, r, proj);

      if (spills[pos]) {
        spills[pos].insertAdjacentHTML('beforebegin', spillHtml);
      } else if (spills.length > 0) {
        spills[spills.length - 1].insertAdjacentHTML('afterend', spillHtml);
      } else {
        seqWrap.insertAdjacentHTML('beforeend', spillHtml);
      }
      reindexSpills(seqWrap, roundId);
    }
    updateRoundHeader(r, proj);
    updateHeaderStats(proj);
    if (state.selectedStitch && state.selectedStitch.roundId === roundId && state.selectedStitch.idx >= pos) {
      state.selectedStitch.idx++;
    }
  } else {
    window.renderProject();
  }
}

function calcExpectedCount(instruction) {
  if (!instruction) return null;

  let body = instruction
    .replace(/^第[一二三四五六七八九十百零\d]+[圈行环][:：]?\s*/i, '')
    .replace(/^[Rr]\d+[:：]?\s*/, '');

  if (!body.trim()) return null;

  let total = 0;
  let found = false;

  let remaining = body;

  const groupRe = /(\d+)\s*\([^)]+\)/gi;
  let groupMatch;
  while ((groupMatch = groupRe.exec(body)) !== null) {
    total += parseInt(groupMatch[1], 10);
    found = true;
    remaining = remaining.replace(groupMatch[0], ' ');
  }

  const repeatRes = [
    /\[([^\]]+)\]\s*[*×x]\s*(\d+)/gi,
    /\[([^\]]+)\]\s*(?:重复|钩|织|做|组|遍)\s*(\d+)(?:次|组|遍|个)?/gi,
  ];

  for (const repeatRe of repeatRes) {
    let match;
    while ((match = repeatRe.exec(body)) !== null) {
      const inner = match[1];
      const times = parseInt(match[2], 10);
      const innerCount = countTokens(inner);
      if (innerCount > 0) {
        total += innerCount * times;
        found = true;
      }
      remaining = remaining.replace(match[0], ' ');
    }
  }

  const rest = countTokens(remaining);
  if (rest > 0) { total += rest; found = true; }

  if (!found) {
    const hint = body.match(/(?:共|总计|合计|总)\s*[:：]?\s*(\d+)\s*针/);
    if (hint) return parseInt(hint[1], 10);
  }

  return found ? total : null;
}

function countTokens(text) {
  if (!text) return 0;

  const abbrs = 'BLO|FLO|TV|TA|TW|TM|FV|FA|FW|FM|EV|EA|SL|CH|SK|X|V|A|F|T|E|W|M|G|Q';
  const cnNames = '短针|长针|中长针|长长针|长长长针|加针|减针|枣形针|枣针|引拔针|锁针|辫子针|起立针|空针|跳针|内半针|外半针|爆米花针|狗牙针|短加针|长加针|中长加针';
  const allStitches = `(?:${abbrs}|${cnNames})`;

  let sum = 0;
  let found = false;

  text = text.replace(new RegExp(`(\\d+)(?:个|针)?\\s*${allStitches}`, 'gi'), (m, num) => {
    sum += parseInt(num, 10);
    found = true;
    return ' ';
  });

  text = text.replace(new RegExp(`${allStitches}\\s*(\\d+)(?:针|个)?`, 'gi'), (m, num) => {
    sum += parseInt(num, 10);
    found = true;
    return ' ';
  });

  text = text.replace(new RegExp(allStitches, 'gi'), () => {
    sum += 1;
    found = true;
    return ' ';
  });

  text = text.replace(/(\d+)\s*针/gi, (m, num) => {
    sum += parseInt(num, 10);
    found = true;
    return ' ';
  });

  return found ? sum : 0;
}

export function renderTaskSlide(proj) {
  const part = getActivePart(proj);
  const activeRound = part ? part.rounds.find(r => r.id === part.activeRoundId) : null;
  const instruction = activeRound?.instruction;

  if (!instruction) {
    return `<div class="task-slide" id="task-slide">
      <span class="task-slide-empty">暂无图解，点击导入或开始记录</span>
    </div>`;
  }

  const done = activeRound.seq?.length || 0;
  const autoExpected = calcExpectedCount(instruction);
  const expected = activeRound.expectedCount != null ? activeRound.expectedCount : autoExpected;
  const expectedDisplay = expected != null ? expected : '--';
  const hasProgress = expected !== null && expected > 0;

  let progressHtml = '';
  if (hasProgress) {
    const pct = Math.min(done / expected, 1);
    const isOver = done > expected;
    const progressColor = isOver ? '#EF4444' : 'var(--accent)';
    const countText = isOver
      ? `<span style="color:#EF4444;font-weight:700">${done}</span> / <span class="exp-count" onclick="editExpectedCount(this)">${expectedDisplay}</span> 针（超出 ${done - expected}）`
      : `<span style="color:var(--accent);font-weight:700">${done}</span> / <span class="exp-count" onclick="editExpectedCount(this)">${expectedDisplay}</span> 针`;

    progressHtml = `
      <div style="margin-top:6px;width:100%">
        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${(pct*100).toFixed(1)}%;background:${progressColor};border-radius:2px;transition:width .2s ease"></div>
        </div>
        <div style="margin-top:3px;font-size:12px;color:var(--muted);text-align:center">${countText}</div>
      </div>`;
  } else if (done > 0) {
    progressHtml = `<div style="margin-top:4px;font-size:12px;color:var(--muted);text-align:center">已钩 <span style="color:var(--accent);font-weight:700">${done}</span> 针</div>`;
  }

  return `<div class="task-slide" id="task-slide">
    <div style="width:100%">
      <div class="task-slide-text" id="task-slide-text">${esc(instruction)}</div>
      ${progressHtml}
    </div>
  </div>`;
}

export function editExpectedCount(el) {
  const currentVal = el.textContent === '--' ? '' : el.textContent;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = currentVal;
  input.className = 'exp-count-input';

  const save = () => {
    const val = input.value.trim();
    const num = val === '' ? null : parseInt(val, 10);
    const proj = getProj(state.curProjId);
    const part = getActivePart(proj);
    const round = part?.rounds.find(r => r.id === part.activeRoundId);
    if (round) {
      round.expectedCount = (num === null || isNaN(num) || num === 0) ? null : num;
      saveData();
    }
    const slide = document.getElementById('task-slide');
    if (slide) slide.outerHTML = renderTaskSlide(proj);
  };

  input.onblur = save;
  input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } };

  el.replaceWith(input);
  input.focus();
  input.select();
}

export function renderDynamicPalette(proj) {
  const part = getActivePart(proj);
  if (!part) return '<div class="palette"></div>';

  let displayIds;
  if (part.customPalette && part.customPalette.length > 0) {
    displayIds = part.customPalette.filter(sid => STITCH_LIB[sid] || proj.customSettings?.customStitches?.[sid]);
  } else {
    const hasPattern = part.rounds.some(r => r.instruction && r.instruction.trim());
    if (hasPattern) {
      const planned = new Set();
      part.rounds.forEach(r => {
        if (r.instruction) extractStitches(r.instruction).forEach(sid => planned.add(sid));
      });
      displayIds = Array.from(planned);
    } else {
      displayIds = ['CH', 'X', 'V', 'A', 'T', 'F', 'SL'];
    }
  }

  if (state.filterByRound) {
    const activeRound = part.rounds.find(r => r.id === part.activeRoundId);
    const roundStitches = getRoundStitches(activeRound);
    if (roundStitches.length > 0) {
      const roundSet = new Set(roundStitches);
      const filtered = displayIds.filter(sid => roundSet.has(sid));
      if (filtered.length > 0) displayIds = filtered;
    }
  }

  if (!part.customPalette || part.customPalette.length === 0) {
    const customIds = Object.keys(proj.customSettings?.customStitches || {});
    if (customIds.length > 0) {
      displayIds = [...displayIds, ...customIds];
    }
  }

  let html = `<div class="palette">`;
  displayIds.forEach((sid, idx) => {
    const info = getStitchInfo(sid, proj);
    if (!info) return;
    html += `<button class="pal-btn" data-sid="${sid}" style="background:${info.color}" onclick="pushStitch('${sid}')">
      ${state.voiceMode ? `<span style="font-size:22px;font-weight:900;line-height:1">${idx + 1}</span><br><small style="opacity:.8;font-size:11px">${esc(info.label)}(${sid})</small>` : `${esc(info.label)}<br><small style="opacity:.8">${sid}</small>`}
    </button>`;
  });
  html += `<button class="pal-btn" style="background:var(--bg);color:var(--accent);border:2px dashed var(--accent);font-size:18px" onclick="openStitchSetup('edit')" title="增减针法">
    ＋<br><small style="opacity:.7;font-size:11px">增减</small>
  </button>`;
  html += `</div>`;
  return html;
}

export function toggleFilterByRound() {
  state.filterByRound = !state.filterByRound;
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const bar = document.getElementById('bottom-bar');
  const paletteHtml = renderDynamicPalette(proj);
  const toggleHtml = renderFilterToggle();
  const barRowHtml = renderBarRow();
  bar.innerHTML = paletteHtml + toggleHtml + barRowHtml;
  updateVoiceButton();
}

export function renderFilterToggle() {
  const dotBg = state.filterByRound ? 'var(--accent)' : 'var(--border)';
  const dotPos = state.filterByRound ? '18px' : '2px';
  const unit = getUnitLabel();
  return `<div style="display:flex;align-items:center;justify-content:flex-end;padding:2px 4px 6px;gap:6px;cursor:pointer" onclick="toggleFilterByRound()">
    <span style="font-size:10px;color:var(--muted);user-select:none">仅显示本${unit}针法</span>
    <span style="display:inline-block;width:34px;height:20px;border-radius:10px;background:${dotBg};position:relative;transition:background .2s;flex-shrink:0">
      <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${dotPos};transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
    </span>
  </div>`;
}

export function renderBarRow() {
  const unit = getUnitLabel();
  const hint = state.voiceMode
    ? `<div style="text-align:center;font-size:11px;color:#EF4444;padding:2px 0 4px;opacity:.8">🎙 说数字 1-9 添加针法 · 说"撤销"删除上一针</div>`
    : '';
  return `${hint}<div class="bar-row">
    <button class="bar-btn" onclick="undoStitch()">↩ 撤销</button>
    <button class="bar-btn" onclick="openPatternPasteSheet()">📥 图解</button>
    <button class="bar-btn" id="voice-mode-btn" onclick="toggleVoiceMode()">🎙 语音</button>
    <button class="bar-btn primary" onclick="addRound()">＋ 新一${unit}</button>
  </div>`;
}

export function openStitchSetup(mode) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const part = getActivePart(proj);
  if (!part) return;

  let selected;
  if (state.flowState.setupSelections) {
    selected = new Set();
    Object.entries(state.flowState.setupSelections).forEach(([sid, checked]) => {
      if (checked) selected.add(sid);
    });
    state.flowState.setupSelections = null;
  } else {
    const initial = part.customPalette || [];
    selected = new Set(initial);

    if (initial.length === 0 && mode === 'create') {
      selected.add('CH');
    }

    if (initial.length === 0 && mode === 'edit') {
      const hasPattern = part.rounds.some(r => r.instruction && r.instruction.trim());
      if (hasPattern) {
        part.rounds.forEach(r => {
          if (r.instruction) extractStitches(r.instruction).forEach(sid => selected.add(sid));
        });
      } else {
        Object.keys(STITCH_LIB).forEach(sid => selected.add(sid));
        Object.keys(proj.customSettings?.customStitches || {}).forEach(sid => selected.add(sid));
      }
    }
  }

  const categories = {
    basic: '基础针法',
    increase: '加针类',
    decrease: '减针类',
    special: '特殊针法'
  };

  const customByCat = { basic: [], increase: [], decrease: [], special: [] };
  if (proj.customSettings?.customStitches) {
    Object.values(proj.customSettings.customStitches).forEach(cs => {
      const cat = cs.category || 'basic';
      if (customByCat[cat]) customByCat[cat].push(cs);
      else customByCat.basic.push(cs);
    });
  }

  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">选择常用针法</div>
  <div style="font-size:10px;color:var(--muted);text-align:center;padding:0 14px 6px">点击 ✎ 可自定义名称与颜色</div>
  <div style="max-height:55vh;overflow-y:auto;padding:0 14px">`;

  Object.entries(categories).forEach(([cat, catLabel]) => {
    const presetItems = Object.values(STITCH_LIB).filter(s => s.category === cat);
    const customItems = customByCat[cat] || [];
    const items = [...presetItems, ...customItems];
    if (items.length === 0) return;
    html += `<div class="sheet-section">${catLabel}</div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:6px 0 12px">`;
    items.forEach(s => {
      const isSel = selected.has(s.id);
      const color = getProjColor(s.id, proj);
      const label = resolveLabel(s.id, proj);
      const bg = isSel ? color : 'var(--bg)';
      const col = isSel ? '#fff' : 'var(--text)';
      const border = isSel ? color : 'var(--border)';
      const hasCustom = !!(proj.customSettings?.names?.[s.id]) || !!(proj.customSettings?.colors?.[s.id]);
      const isCustomStitch = !!proj.customSettings?.customStitches?.[s.id];
      const dotMark = (hasCustom || isCustomStitch) ? '<span style="position:absolute;top:3px;right:3px;width:7px;height:7px;border-radius:50%;background:#FACC15;display:inline-block"></span>' : '';
      const borderStyle = isCustomStitch ? 'border-style:dashed' : '';
      html += `<button id="setup-btn-${s.id}" class="picker-btn"
        style="position:relative;background:${bg};color:${col};border:2px solid ${border};${borderStyle}font-size:12px;padding:10px 4px"
        onclick="toggleSetupStitch('${s.id}')"
        data-checked="${isSel}"
        data-color="${color}"
      >${dotMark}${esc(label)}<br><small style="display:block;line-height:1.4">${s.id}</small><small style="display:block;color:var(--accent);font-size:10px;cursor:pointer;line-height:1.2" onclick="event.stopPropagation();openStitchCustomize('${s.id}')">✎ 自定义</small></button>`;
    });
    html += `</div>`;
  });

  html += `</div>`;
  html += `<div style="padding:10px 14px 6px;display:flex;gap:8px">
    <button class="bar-btn" style="flex:1" id="select-all-btn" onclick="toggleSelectAllInSetup()">全选</button>
    <button class="bar-btn" style="flex:1;color:var(--accent);border-color:var(--accent)" onclick="startImportFromSetup()">📋 导入图解</button>
  </div>`;
  html += `<div style="padding:2px 14px 6px">
    <button class="bar-btn" style="width:100%;border-style:dashed;color:var(--accent);border-color:var(--accent)" onclick="openNewStitchForm()">＋ 新建针法</button>
  </div>`;
  html += `<div style="padding:6px 14px 10px;display:flex;gap:8px">
    <button class="bar-btn" style="flex:1" onclick="closeSetupSheet()">取消</button>
    <button class="bar-btn primary" style="flex:2" onclick="saveProjectStitches('${mode}')">${mode === 'create' ? '开始钩织' : '更新配置'}</button>
  </div>`;

  state.flowState.setupMode = mode;
  showSheet(html);
}

export function toggleSetupStitch(sid) {
  const btn = document.getElementById(`setup-btn-${sid}`);
  if (!btn) return;
  const isChecked = btn.dataset.checked === 'true';
  const newChecked = !isChecked;
  btn.dataset.checked = String(newChecked);
  const color = btn.dataset.color;
  if (newChecked) {
    btn.style.background = color;
    btn.style.color = '#fff';
    btn.style.borderColor = color;
  } else {
    btn.style.background = 'var(--bg)';
    btn.style.color = 'var(--text)';
    btn.style.borderColor = 'var(--border)';
  }
}

export function openStitchCustomize(sid) {
  const proj = getProj(state.curProjId);
  if (!proj) return;

  const selections = {};
  document.querySelectorAll('[id^="setup-btn-"]').forEach(btn => {
    const id = btn.id.replace('setup-btn-', '');
    selections[id] = btn.dataset.checked === 'true';
  });
  state.flowState.setupSelections = selections;
  state.flowState.customizingSid = sid;

  const currentLabel = resolveLabel(sid, proj);
  const currentColor = getProjColor(sid, proj);
  const s = STITCH_LIB[sid];

  let html = `<div class="sheet-handle"></div>
      <div class="sheet-title">✎ 自定义 · <span style="font-weight:700">${esc(currentLabel)}</span> <small style="opacity:.5">(${sid})</small></div>
      <div style="padding:12px 16px">
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">名称</div>
          <input id="custom-name" value="${esc(currentLabel)}" maxlength="20"
            style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:inherit">
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">颜色</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <input type="color" id="custom-color" value="${currentColor}"
              style="width:38px;height:38px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
            <span style="font-size:12px;color:var(--muted);font-family:monospace" id="color-hex">${currentColor}</span>
            <button class="bar-btn" style="flex:0;padding:6px 10px;font-size:11px" onclick="resetStitchCustomize('${sid}')">恢复默认</button>
          </div>
        </div>
      </div>
      ${proj.customSettings?.customStitches?.[sid] ? `
      <div style="padding:0 16px 8px">
        <button class="bar-btn" style="width:100%;color:#E07070;border-color:#E07070" onclick="deleteCustomStitch('${sid}')">🗑 删除此针法</button>
      </div>` : ''}
      <div style="padding:10px 16px;display:flex;gap:8px">
        <button class="bar-btn" style="flex:1" onclick="backToSetupGrid()">← 返回</button>
        <button class="bar-btn primary" style="flex:2" onclick="saveStitchCustomize('${sid}')">✓ 保存</button>
      </div>`;

  showSheet(html);

  const colorInput = document.getElementById('custom-color');
  const hexDisplay = document.getElementById('color-hex');
  if (colorInput && hexDisplay) {
    colorInput.addEventListener('input', () => { hexDisplay.textContent = colorInput.value; });
  }
}

export function saveStitchCustomize(sid) {
  const proj = getProj(state.curProjId);
  if (!proj) return;

  const nameInput = document.getElementById('custom-name');
  const colorInput = document.getElementById('custom-color');
  const defaultLabel = STITCH_LIB[sid]?.label || sid;

  if (nameInput && nameInput.value.trim() && nameInput.value.trim() !== defaultLabel) {
    proj.customSettings.names[sid] = nameInput.value.trim();
  } else {
    delete proj.customSettings.names[sid];
  }

  if (colorInput) {
    proj.customSettings.colors[sid] = colorInput.value;
  }

  saveData();
  backToSetupGrid();
}

export function resetStitchCustomize(sid) {
  const proj = getProj(state.curProjId);
  if (!proj) return;

  delete proj.customSettings.names[sid];
  delete proj.customSettings.colors[sid];
  saveData();

  openStitchCustomize(sid);
}

export function backToSetupGrid() {
  const mode = state.flowState.setupMode || 'edit';
  state.flowState.customizingSid = null;
  openStitchSetup(mode);
}

export function openNewStitchForm() {
  const selections = {};
  document.querySelectorAll('[id^="setup-btn-"]').forEach(btn => {
    const id = btn.id.replace('setup-btn-', '');
    selections[id] = btn.dataset.checked === 'true';
  });
  state.flowState.setupSelections = selections;

  let html = `<div class="sheet-handle"></div>
      <div class="sheet-title">＋ 新建针法</div>
      <div style="padding:12px 16px">
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">缩写 ID（英文，如 DC3L）</div>
          <input id="new-stitch-id" placeholder="例如：DC3L" maxlength="10"
            style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:monospace;text-transform:uppercase"
            oninput="this.value=this.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase()">
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">名称（中文标签）</div>
          <input id="new-stitch-label" placeholder="例如：三卷长针" maxlength="16"
            style="width:100%;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;background:var(--bg);color:var(--text);outline:none;font-family:inherit">
        </div>
        <div style="margin-bottom:14px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">颜色</div>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="color" id="new-stitch-color" value="#7DD3FC"
              style="width:38px;height:38px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
            <span style="font-size:12px;color:var(--muted);font-family:monospace" id="new-color-hex">#7DD3FC</span>
          </div>
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:600">分类</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${[{v:'basic',l:'基础'},{v:'increase',l:'加针'},{v:'decrease',l:'减针'},{v:'special',l:'特殊'}].map(c =>
              `<label style="font-size:12px;color:var(--text);display:flex;align-items:center;gap:3px;cursor:pointer;padding:4px 8px;border:1px solid var(--border);border-radius:8px">
                <input type="radio" name="new-stitch-cat" value="${c.v}" ${c.v==='basic'?'checked':''}> ${c.l}
              </label>`
            ).join('')}
          </div>
        </div>
      </div>
      <div style="padding:10px 16px;display:flex;gap:8px">
        <button class="bar-btn" style="flex:1" onclick="backToSetupGrid()">← 返回</button>
        <button class="bar-btn primary" style="flex:2" onclick="saveNewStitch()">✓ 创建</button>
      </div>`;

  showSheet(html);

  const colorInput = document.getElementById('new-stitch-color');
  const hexDisplay = document.getElementById('new-color-hex');
  if (colorInput && hexDisplay) {
    colorInput.addEventListener('input', () => { hexDisplay.textContent = colorInput.value; });
  }
}

export function saveNewStitch() {
  const proj = getProj(state.curProjId);
  if (!proj) return;

  const idInput = document.getElementById('new-stitch-id');
  const labelInput = document.getElementById('new-stitch-label');
  const colorInput = document.getElementById('new-stitch-color');
  const catRadio = document.querySelector('input[name="new-stitch-cat"]:checked');

  const sid = idInput?.value?.trim().toUpperCase();
  if (!sid) { alert('请输入缩写 ID'); return; }
  if (STITCH_LIB[sid]) { alert('该 ID 与预设针法冲突，请换一个'); return; }
  if (proj.customSettings.customStitches[sid]) { alert('该 ID 已存在'); return; }

  const label = labelInput?.value?.trim() || sid;
  const color = colorInput?.value || '#7DD3FC';
  const category = catRadio?.value || 'basic';

  if (!proj.customSettings.customStitches) proj.customSettings.customStitches = {};
  proj.customSettings.customStitches[sid] = { id: sid, label, color, category };

  saveData();
  backToSetupGrid();
}

export function deleteCustomStitch(sid) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  showConfirmDialog(`确定要删除自定义针法「${resolveLabel(sid, proj)}」吗？`, (ok) => {
    if (!ok) return;

    delete proj.customSettings.customStitches[sid];
    delete proj.customSettings.names[sid];
    delete proj.customSettings.colors[sid];

    proj.parts.forEach(part => {
      if (part.customPalette) {
        part.customPalette = part.customPalette.filter(id => id !== sid);
      }
    });

    saveData();
    backToSetupGrid();
  });
}

export function saveProjectStitches(mode) {
  const proj = getProj(state.curProjId);
  if (!proj) return;
  const part = getActivePart(proj);
  if (!part) return;

  const allIds = [...Object.keys(STITCH_LIB), ...Object.keys(proj.customSettings?.customStitches || {})];
  const manualIds = allIds.filter(sid => {
    const btn = document.getElementById(`setup-btn-${sid}`);
    return btn && btn.dataset.checked === 'true';
  });

  const planned = new Set(manualIds);
  part.rounds.forEach(r => {
    if (r.instruction) extractStitches(r.instruction).forEach(sid => planned.add(sid));
  });

  part.customPalette = Array.from(planned);
  saveData();
  if (mode === 'create') state.flowState.newProjectFlow = false;
  state.flowState.setupMode = null;
  closeSheet();

  if (mode === 'create') {
    window.renderProject();
  } else {
    const bar = document.getElementById('bottom-bar');
    const paletteHtml = renderDynamicPalette(proj);
    const toggleHtml = renderFilterToggle();
    const barRowHtml = renderBarRow();
    bar.innerHTML = paletteHtml + toggleHtml + barRowHtml;
    updateVoiceButton();
  }
}

export function closeSetupSheet() {
  const mode = state.flowState.setupMode;
  state.flowState.newProjectFlow = false;
  state.flowState.setupMode = null;
  closeSheet();
  if (mode === 'create') {
    window.renderProject();
  }
}

export function triggerEdgeGlow(sid) {
  const color = sid ? getProjColor(sid, getProj(state.curProjId)) : '#9E8A74';
  const el = document.getElementById('edge-glow');
  if (!el) return;

  el.style.boxShadow = `inset 0 0 0 10px ${color}`;
  el.style.opacity = '1';

  clearTimeout(state.flowState.glowTimer);
  state.flowState.glowTimer = setTimeout(() => {
    el.style.transition = 'opacity 0.35s ease-out';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.transition = 'opacity 0.08s ease-in';
    }, 400);
  }, 120);
}
