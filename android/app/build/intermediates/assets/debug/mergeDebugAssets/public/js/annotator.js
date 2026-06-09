import { getProj } from './state.js';
import { getRefImage, setRefImage } from './image.js';
import { showToast, showConfirmDialog } from './ui.js';
import { t } from './i18n.js';

// ── 模块级状态 ──
let _state = null;
// _state = {
//   projId, key, img,       // 图片信息
//   overlay, viewport, canvas, ctx,
//   dpr,                    // devicePixelRatio
//   imgDrawX, imgDrawY, imgDrawW, imgDrawH,  // 图片在 canvas 上的绘制区域
//   strokeHistory: [],      // [{ tool, color, width, points: [{x,y},...] }]
//   currentStroke: null,    // 正在进行的笔
//   currentTool: 'pen',
//   currentColor: '#EF4444',
//   currentWidth: 4,
//   scale: 1, offsetX: 0, offsetY: 0,  // 缩放/平移
//   pinchStartDist: 0, pinchStartScale: 1,
//   isDrawing: false, isPinching: false,
//   dirty: false,           // 是否有未保存笔迹
//   exitGuardFired: false   // visibilitychange 防重复
// }

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
const MAX_HISTORY = 20;

// ── 公开入口 ──

export function openAnnotator(projId, key) {
  const proj = getProj(projId);
  if (!proj) return;

  // 清理旧实例
  if (_state) closeAnnotator(true);

  getRefImage(key).then(src => {
    if (!src) { showToast('图片加载失败'); return; }

    const img = new Image();
    img.onload = () => {
      _buildUI(projId, key, img);
    };
    img.src = src;
  });
}

// ── 构建 UI ──

function _buildUI(projId, key, img) {
  // 关闭旧的 ref viewer
  if (window._closeRefViewer) window._closeRefViewer();

  const dpr = window.devicePixelRatio || 1;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'annotator-overlay';
  overlay.id = 'annotator-overlay';

  // 顶部工具栏
  const topBar = document.createElement('div');
  topBar.className = 'annotator-toolbar-top';
  topBar.innerHTML = `
    <button class="annotator-back-btn">← ${t('nav_back')}</button>
    <span class="annotator-page-info"></span>
    <button class="annotator-save-btn">${t('save')}</button>
  `;
  topBar.querySelector('.annotator-back-btn').onclick = () => _exitAnnotator();
  topBar.querySelector('.annotator-save-btn').onclick = () => saveAnnotation();

  // 视口（可缩放）
  const viewport = document.createElement('div');
  viewport.className = 'annotator-viewport';

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'annotator-canvas';
  viewport.appendChild(canvas);

  // 底部工具栏
  const bottomBar = document.createElement('div');
  bottomBar.className = 'annotator-toolbar-bottom';
  _buildBottomBar(bottomBar);

  overlay.appendChild(topBar);
  overlay.appendChild(viewport);
  overlay.appendChild(bottomBar);
  document.body.appendChild(overlay);

  // 计算 canvas 尺寸（适配屏幕，保持图片宽高比）
  const maxW = window.innerWidth - 16;
  const maxH = window.innerHeight - 140; // 减去上下工具栏
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  const cw = Math.round(img.width * scale);
  const ch = Math.round(img.height * scale);

  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 图片在 canvas 上的绘制区域（居中）
  const imgDrawW = cw;
  const imgDrawH = ch;

  const touchController = new AbortController();

  _state = {
    projId, key, img,
    overlay, viewport, canvas, ctx,
    dpr,
    imgDrawX: 0, imgDrawY: 0, imgDrawW, imgDrawH,
    strokeHistory: [],
    currentStroke: null,
    currentTool: 'pen',
    currentColor: '#EF4444',
    currentWidth: 4,
    scale: 1, offsetX: 0, offsetY: 0,
    isDrawing: false, isPinching: false,
    dirty: false,
    exitGuardFired: false,
    touchController
  };

  document.addEventListener('visibilitychange', _onVisibilityChange, { signal: touchController.signal });

  _initTouchEvents();
  _renderCanvas();
  _updateToolUI();
}

function _buildBottomBar(bar) {
  // 颜色预设
  const colorRow = document.createElement('div');
  colorRow.className = 'annotator-color-row';
  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'annotator-color-btn';
    btn.style.background = c;
    btn.setAttribute('data-color', c);
    btn.onclick = () => { if (_state) { _state.currentColor = c; _updateToolUI(); } };
    colorRow.appendChild(btn);
  });
  // 自定义颜色
  const customInput = document.createElement('input');
  customInput.type = 'color';
  customInput.className = 'annotator-custom-color';
  customInput.value = '#EF4444';
  customInput.oninput = () => { if (_state) { _state.currentColor = customInput.value; _updateToolUI(); } };
  colorRow.appendChild(customInput);

  // 画笔粗细滑块
  const widthRow = document.createElement('div');
  widthRow.className = 'annotator-width-row';
  const widthLabel = document.createElement('span');
  widthLabel.className = 'annotator-width-label';
  widthLabel.textContent = '4px';
  const widthSlider = document.createElement('input');
  widthSlider.type = 'range';
  widthSlider.className = 'annotator-width-slider';
  widthSlider.min = '2';
  widthSlider.max = '20';
  widthSlider.value = '4';
  widthSlider.oninput = () => {
    if (_state) {
      _state.currentWidth = parseInt(widthSlider.value);
      widthLabel.textContent = _state.currentWidth + 'px';
    }
  };
  widthRow.appendChild(widthSlider);
  widthRow.appendChild(widthLabel);

  // 工具切换
  const toolRow = document.createElement('div');
  toolRow.className = 'annotator-tool-row';
  const penBtn = document.createElement('button');
  penBtn.className = 'annotator-tool-btn';
  penBtn.setAttribute('data-tool', 'pen');
  penBtn.textContent = '✏️';
  penBtn.onclick = () => { if (_state) { _state.currentTool = 'pen'; _updateToolUI(); } };
  const eraserBtn = document.createElement('button');
  eraserBtn.className = 'annotator-tool-btn';
  eraserBtn.setAttribute('data-tool', 'eraser');
  eraserBtn.textContent = '◯';
  eraserBtn.onclick = () => { if (_state) { _state.currentTool = 'eraser'; _updateToolUI(); } };
  toolRow.appendChild(penBtn);
  toolRow.appendChild(eraserBtn);

  // 撤销
  const undoBtn = document.createElement('button');
  undoBtn.className = 'annotator-undo-btn';
  undoBtn.textContent = '↩ ' + t('immersive_undo');
  undoBtn.onclick = () => _undoStroke();

  bar.appendChild(colorRow);
  bar.appendChild(widthRow);
  bar.appendChild(toolRow);
  bar.appendChild(undoBtn);
}

function _updateToolUI() {
  if (!_state) return;
  const bar = _state.overlay.querySelector('.annotator-toolbar-bottom');
  if (!bar) return;

  // 颜色选中态
  bar.querySelectorAll('.annotator-color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-color') === _state.currentColor);
  });
  // 工具选中态
  bar.querySelectorAll('.annotator-tool-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tool') === _state.currentTool);
  });
  // 粗细标签
  const label = bar.querySelector('.annotator-width-label');
  if (label) label.textContent = _state.currentWidth + 'px';
  const slider = bar.querySelector('.annotator-width-slider');
  if (slider) slider.value = _state.currentWidth;
}

// ── 触摸事件 ──

function _initTouchEvents() {
  if (!_state) return;
  const { canvas, touchController } = _state;
  const opts = { signal: touchController.signal };

  canvas.addEventListener('touchstart', _onTouchStart, { ...opts, passive: false });
  canvas.addEventListener('touchmove', _onTouchMove, { ...opts, passive: false });
  canvas.addEventListener('touchend', _onTouchEnd, opts);
  canvas.addEventListener('touchcancel', _onTouchEnd, opts);
}

function _getCanvasPos(e) {
  if (!_state) return null;
  const rect = _state.canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / _state.scale - _state.offsetX,
    y: (e.clientY - rect.top) / _state.scale - _state.offsetY
  };
}

function _distance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function _onTouchStart(e) {
  if (!_state) return;
  e.preventDefault();

  if (e.touches.length === 2) {
    // 双指缩放
    _state.isPinching = true;
    _state.isDrawing = false;
    _state.pinchStartDist = _distance(e.touches[0], e.touches[1]);
    _state.pinchStartScale = _state.scale;
    return;
  }

  if (e.touches.length === 1 && !_state.isPinching) {
    // 单指绘制
    _state.isDrawing = true;
    const pos = _getCanvasPos(e.touches[0]);
    if (!pos) return;
    _state.currentStroke = {
      tool: _state.currentTool,
      color: _state.currentColor,
      width: _state.currentTool === 'eraser' ? 20 : _state.currentWidth,
      points: [pos]
    };
    _state.dirty = true;
    _renderCanvas();
  }
}

function _onTouchMove(e) {
  if (!_state) return;
  e.preventDefault();

  if (_state.isPinching && e.touches.length === 2) {
    const dist = _distance(e.touches[0], e.touches[1]);
    const newScale = _state.pinchStartScale * (dist / _state.pinchStartDist);
    _state.scale = Math.max(0.5, Math.min(3, newScale));
    _updateViewport();
    return;
  }

  if (_state.isDrawing && e.touches.length === 1) {
    const pos = _getCanvasPos(e.touches[0]);
    if (!pos || !_state.currentStroke) return;
    _state.currentStroke.points.push(pos);
    _renderCanvas();
  }
}

function _onTouchEnd(e) {
  if (!_state) return;

  if (_state.isPinching && e.touches.length < 2) {
    _state.isPinching = false;
  }

  if (_state.isDrawing && e.touches.length === 0) {
    _state.isDrawing = false;
    if (_state.currentStroke && _state.currentStroke.points.length > 0) {
      _state.strokeHistory.push(_state.currentStroke);
      // FIFO 上限
      if (_state.strokeHistory.length > MAX_HISTORY) {
        _state.strokeHistory.shift();
      }
    }
    _state.currentStroke = null;
    _renderCanvas();
  }
}

function _updateViewport() {
  if (!_state) return;
  _state.viewport.style.transform = `scale(${_state.scale})`;
}

// ── Canvas 渲染 ──

function _renderCanvas() {
  if (!_state) return;
  const { canvas, ctx, dpr, img, imgDrawX, imgDrawY, imgDrawW, imgDrawH, strokeHistory, currentStroke } = _state;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 背景图片
  ctx.drawImage(img, imgDrawX, imgDrawY, imgDrawW, imgDrawH);

  // 历史笔迹
  strokeHistory.forEach(stroke => _drawStroke(ctx, stroke));

  // 当前笔迹
  if (currentStroke && currentStroke.points.length > 0) {
    _drawStroke(ctx, currentStroke);
  }
}

function _drawStroke(ctx, stroke) {
  if (stroke.points.length === 0) return;

  ctx.save();
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.quadraticCurveTo(
      stroke.points[i - 1].x, stroke.points[i - 1].y,
      (stroke.points[i - 1].x + stroke.points[i].x) / 2,
      (stroke.points[i - 1].y + stroke.points[i].y) / 2
    );
  }
  ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
  ctx.stroke();
  ctx.restore();
}

// ── 撤销 ──

function _undoStroke() {
  if (!_state) return;
  if (_state.strokeHistory.length === 0) return;
  _state.strokeHistory.pop();
  _state.dirty = _state.strokeHistory.length > 0 || (_state.currentStroke && _state.currentStroke.points.length > 0);
  _renderCanvas();
}

// ── 保存 ──

export function saveAnnotation() {
  if (!_state) return;

  showConfirmDialog(t('annotator_save_confirm'), (ok) => {
    if (!ok || !_state) return;

    const dataURL = _state.canvas.toDataURL('image/jpeg', 0.85);
    setRefImage(_state.projId, _state.key, dataURL).then(() => {
      showToast(t('annotator_saved'));
      _state.dirty = false;
      closeAnnotator(true);
    }).catch(() => {
      showToast('保存失败，请重试');
    });
  });
}

// ── 退出 ──

export function _exitAnnotator(onDone) {
  if (!_state) { if (onDone) onDone(); return; }

  if (_state.dirty && (_state.strokeHistory.length > 0 || _state.currentStroke)) {
    showConfirmDialog(t('annotator_exit_confirm'), (ok) => {
      if (ok === undefined) return; // 取消
      if (ok) {
        saveAnnotation();
      } else {
        closeAnnotator(true);
      }
      if (onDone) onDone();
    }, {
      title: t('annotator_exit_title'),
      confirmLabel: t('save'),
      cancelLabel: t('annotator_discard')
    });
  } else {
    closeAnnotator(true);
    if (onDone) onDone();
  }
}

export function closeAnnotator(silent) {
  if (!_state) return;
  const { overlay, canvas, ctx, touchController } = _state;

  // 移除所有触摸事件监听
  touchController.abort();

  // 释放 Canvas GPU 纹理
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;

  _state = null;

  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s';
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
  }, 200);
}

// ── visibilitychange 防丢 ──

function _onVisibilityChange() {
  if (!_state) return;
  if (document.hidden && _state.dirty && !_state.exitGuardFired) {
    _state.exitGuardFired = true;
    // 暂存当前笔迹
    if (_state.currentStroke && _state.currentStroke.points.length > 0) {
      _state.strokeHistory.push(_state.currentStroke);
      if (_state.strokeHistory.length > MAX_HISTORY) _state.strokeHistory.shift();
      _state.currentStroke = null;
    }
  }
  if (!document.hidden) {
    _state.exitGuardFired = false;
  }
}

export function _isAnnotatorOpen() { return !!_state; }
