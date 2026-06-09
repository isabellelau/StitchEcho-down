import { state, uid, getProj, getActivePart, isPartEmpty } from './state.js';
import { showSheet, closeSheet, showToast, esc, showConfirmDialog } from './ui.js';
import { saveData } from './storage.js';
import { parsePattern, extractStitches } from '../stitches.js';

export function startImportFlow() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  state.flowState.importMode = 'create';
  openPatternPasteSheet();
}

export function startManualFlow() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  window.openStitchSetup('create');
}

export function dismissEntryChoice() {
  state.flowState.newProjectFlow = false;
  closeSheet();
  window.renderProject();
}

export function toggleSelectAllInSetup() {
  const buttons = document.querySelectorAll('[id^="setup-btn-"]');
  if (buttons.length === 0) return;
  const allChecked = Array.from(buttons).every(b => b.dataset.checked === 'true');
  buttons.forEach(b => {
    if (allChecked) {
      b.dataset.checked = 'false';
      b.style.background = 'var(--bg)';
      b.style.color = 'var(--text)';
      b.style.borderColor = 'var(--border)';
    } else {
      b.dataset.checked = 'true';
      const color = b.dataset.color;
      b.style.background = color;
      b.style.color = '#fff';
      b.style.borderColor = color;
    }
  });
  const allBtn = document.getElementById('select-all-btn');
  if (allBtn) allBtn.textContent = allChecked ? '全选' : '清空';
}

export function startImportFromSetup() {
  document.getElementById("sheet").classList.remove("show");
  document.getElementById("overlay").classList.remove("show");
  state.flowState.importMode = 'create';
  state.flowState.setupMode = null;
  openPatternPasteSheet();
}

export function openPatternPasteSheet() {
  state.flowState.pendingParsed = null;
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">📥 导入图解</div>
  <div style="padding:12px 16px">
    <textarea id="pattern-input" placeholder="在此粘贴图解文字，或上传图片自动识别...\n例如：\nR1: 6X\nR2: 6V\nR3: [1X, 1V]*6"
    style="width:100%;height:120px;border:1px solid var(--border);border-radius:10px;padding:12px;font-size:14px;font-family:inherit;resize:none;outline:none;background:var(--bg);color:var(--text)"></textarea>
  </div>
  <div style="padding:0 16px 10px;display:flex;gap:8px;align-items:center">
    <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:1.5px dashed var(--border);border-radius:10px;background:var(--bg);cursor:pointer;color:var(--muted);font-size:13px;font-weight:600">
      <input type="file" id="ocr-file" accept="image/*" style="display:none" onchange="handleOCR(this)">
      📷 识别图片
    </label>
    <button class="bar-btn primary" style="flex:2" onclick="handleParsePattern()">🔍 解析预览</button>
  </div>
  <div id="ocr-status" style="padding:0 16px 10px;font-size:12px;color:var(--muted);display:none"></div>
  <button class="sheet-cancel" onclick="cancelPasteSheet()">取消</button>`;
  showSheet(html);
  setTimeout(() => document.getElementById('pattern-input').focus(), 100);
}

export function cancelPasteSheet() {
  const wasImport = state.flowState.importMode === 'create';
  state.flowState.importMode = null;
  closeSheet();
  if (wasImport) window.showEntryChoiceSheet();
}

export function handleParsePattern() {
  const text = document.getElementById('pattern-input').value;
  if (!text.trim()) {
    alert("请输入图解内容");
    return;
  }
  const parsed = parsePattern(text);
  if (parsed.length === 0) {
    alert("未能解析出任何内容，请检查格式");
    return;
  }
  state.flowState.pendingParsed = parsed;
  openParseConfirmSheet(parsed);
}

// ── Tesseract.js 懒加载 ──
let _tesseractLoaded = false;
let _tesseractLoading = false;

export function showLoading(text) {
  const mask = document.getElementById('loading-mask');
  const txt = document.getElementById('loading-text');
  if (txt) txt.textContent = text || '正在加载...';
  if (mask) mask.classList.add('show');
}

export function hideLoading() {
  const mask = document.getElementById('loading-mask');
  if (mask) mask.classList.remove('show');
}

export function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (_tesseractLoaded) return resolve();
    if (_tesseractLoading) {
      const check = () => {
        if (_tesseractLoaded) resolve();
        else if (!_tesseractLoading) reject(new Error('Tesseract 加载失败'));
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    _tesseractLoading = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => { _tesseractLoaded = true; _tesseractLoading = false; resolve(); };
    script.onerror = () => { _tesseractLoading = false; reject(new Error('Tesseract 脚本加载失败')); };
    document.head.appendChild(script);
  });
}

export async function handleOCR(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('ocr-status');
  const textarea = document.getElementById('pattern-input');
  if (status) {
    status.style.display = 'block';
    status.style.color = 'var(--muted)';
    status.textContent = '⏳ 正在初始化识别引擎...';
  }

  try {
    showLoading('正在加载识别引擎...');
    await loadTesseract();
    hideLoading();

    if (status) status.textContent = '⏳ 识别中... 0%';

    const result = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: m => {
        if (m.status === 'recognizing text' && status) {
          status.textContent = `⏳ 识别中... ${(m.progress * 100).toFixed(0)}%`;
        }
      }
    });
    const text = result.data.text;
    if (textarea) textarea.value = text;
    if (status) {
      status.textContent = '✅ 识别完成，请检查修正后点击解析';
      status.style.color = 'var(--accent)';
    }
  } catch (err) {
    hideLoading();
    console.error('OCR 失败:', err);
    if (status) {
      status.textContent = '❌ 识别失败，请手动输入';
      status.style.color = '#E07070';
    }
  }
}

export function openParseConfirmSheet(parsed) {
  const roundCount = parsed.filter(p => p.type === 'round').length;
  const textCount = parsed.filter(p => p.type === 'text').length;

  const proj = getProj(state.curProjId);
  const unit = window.getUnitLabel(proj);
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">✅ 校验图解（${roundCount} ${unit} · ${textCount} 条备注）</div>
  <div style="max-height:50vh;overflow-y:auto;padding:0 4px">`;

  parsed.forEach((item, idx) => {
    const badge = item.type === 'round'
      ? `<span style="display:inline-block;background:var(--accent);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;margin-right:6px;flex-shrink:0">第${item.roundNum}${unit}</span>`
      : `<span style="display:inline-block;background:var(--border);color:var(--muted);font-size:10px;padding:2px 6px;border-radius:4px;margin-right:6px;flex-shrink:0">备注</span>`;

    html += `<div class="sheet-item" style="padding:10px 16px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">${badge}</div>
        <input id="edit-${idx}" value="${esc(item.instruction)}"
          style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:13px;background:var(--bg);color:var(--text);outline:none;font-family:inherit"
          onchange="state.flowState.pendingParsed[${idx}].instruction=this.value.trim()">
        ${item.seq.length ? `<div style="font-size:11px;color:var(--muted);margin-top:3px">检测到针法：${item.seq.join(' · ')}</div>` : ''}
      </div>
      <button onclick="removeParsedItem(${idx})" style="background:none;border:none;color:#D0B0A0;font-size:20px;padding:4px 8px;cursor:pointer;line-height:1;margin-top:20px">×</button>
    </div>`;
  });

  html += `</div>`;
  const currentPart = proj ? getActivePart(proj) : null;
  const isEmpty = isPartEmpty(currentPart);

  if (isEmpty) {
    html += `<div style="padding:10px 16px">
    <button class="bar-btn primary" style="width:100%;animation:scale-in 0.25s ease-out" onclick="updateCurrentPart()">确认导入并开始</button>
    <div style="text-align:center;font-size:11px;color:var(--muted);margin-top:6px">内容将直接填入当前空白部件</div>
  </div>`;
  } else {
    html += `<div style="padding:10px 16px;display:flex;gap:8px">
    <div style="flex:1;display:flex;flex-direction:column;gap:4px">
      <button class="bar-btn" style="width:100%" onclick="updateCurrentPart()">覆盖当前部件</button>
      <span style="font-size:10px;color:var(--muted);text-align:center">原有进度将被清除</span>
    </div>
    <div style="flex:2;display:flex;flex-direction:column;gap:4px">
      <button class="bar-btn primary" style="width:100%;animation:scale-in 0.25s ease-out" onclick="addNewPart()">作为新部件导入</button>
      <span style="font-size:10px;color:var(--muted);text-align:center">保留当前进度，创建新分类</span>
    </div>
  </div>`;
  }
  html += `<button class="sheet-cancel" onclick="openPatternPasteSheet()">← 返回修改</button>`;

  showSheet(html);
}

export function removeParsedItem(idx) {
  if (!state.flowState.pendingParsed) return;
  state.flowState.pendingParsed.splice(idx, 1);
  if (state.flowState.pendingParsed.length === 0) {
    closeSheet();
    state.flowState.pendingParsed = null;
    return;
  }
  openParseConfirmSheet(state.flowState.pendingParsed);
}

export function confirmImport(mode) {
  const parsed = state.flowState.pendingParsed;
  if (!parsed || parsed.length === 0) {
    closeSheet();
    return;
  }

  const proj = getProj(state.curProjId);
  if (!proj) return;

  let targetPart;
  if (mode === 'newPart') {
    // 创建新部件
    const partId = uid();
    targetPart = { id: partId, title: '部件 ' + (proj.parts.length + 1), rawPattern: '', rounds: [], activeRoundId: null, customPalette: null };
    proj.parts.push(targetPart);
    proj.activePartId = partId;
  } else {
    // 覆盖当前部件
    targetPart = getActivePart(proj);
    if (!targetPart) return;
    // 清理默认空圈
    if (targetPart.rounds.length === 1) {
      const only = targetPart.rounds[0];
      if (only.seq.length === 0 && !only.instruction && !only.isTextCard) {
        targetPart.rounds.pop();
      }
    }
  }

  // 追加解析结果到目标 part
  parsed.forEach((item, idx) => {
    const input = document.getElementById(`edit-${idx}`);
    const instruction = input ? input.value.trim() : item.instruction;
    targetPart.rounds.push({
      id: uid(),
      seq: [],
      instruction,
      isTextCard: item.type === 'text',
      roundNum: item.roundNum
    });
  });

  // 将第一圈设为活跃圈
  const firstRound = targetPart.rounds[0];
  const lastRound = targetPart.rounds[targetPart.rounds.length - 1];
  targetPart.activeRoundId = firstRound.id;
  state.expandedRounds.add(firstRound.id);

  // 自动配置 customPalette 为解析识别出的针法
  if (state.flowState.importMode === 'create' || mode === 'newPart' || !targetPart.customPalette || targetPart.customPalette.length === 0) {
    const detectedIds = new Set();
    parsed.forEach(item => {
      if (item.seq) item.seq.forEach(sid => detectedIds.add(sid));
    });
    if (detectedIds.size > 0) {
      targetPart.customPalette = Array.from(detectedIds);
    }
  }
  state.flowState.importMode = null;
  state.flowState.newProjectFlow = false;

  window.normalizeRoundNums(targetPart.rounds);

  state.flowState.pendingParsed = null;
  saveData();
  closeSheet();
  window.renderProject();
  showToast('图解已同步至 ' + targetPart.title);
  setTimeout(() => {
    const firstRound = targetPart.rounds[0];
    const el = document.getElementById('round-' + firstRound.id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

export function updateCurrentPart() {
  confirmImport('overwrite');
}

export function addNewPart() {
  confirmImport('newPart');
}

export function normalizeRoundNums(rounds) {
  let n = 1;
  for (const r of rounds) {
    if (r.isTextCard) {
      r.roundNum = null;
    } else if (r.roundNum === 0) {
      // 起针保持 0
    } else {
      r.roundNum = n++;
    }
  }
}
