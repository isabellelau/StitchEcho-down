import { state, getProj } from './state.js';
import { showToast, showSheet, closeSheet } from './ui.js';
import { renderHome } from './render.js';
import { openDB, saveData, storageAdapter } from './storage.js';
import { t } from './i18n.js';

// ── Blob 内存缓存：避免重复 URL.createObjectURL ──
const _coverCache = new Map(); // projId → { url, revoke }

function cacheCover(projId, blob) {
  // 先清理旧缓存
  const old = _coverCache.get(projId);
  if (old) URL.revokeObjectURL(old.url);
  const url = URL.createObjectURL(blob);
  _coverCache.set(projId, { url });
  return url;
}

export function compressImage(file, maxSize = 200, quality = 0.72) {
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
      canvas.toBlob(blob => {
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

// ── 封面存储（IndexedDB covers store）──

async function getCoverBlob(projId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readonly');
    const req = tx.objectStore('covers').get(projId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function setCoverBlob(projId, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readwrite');
    const req = tx.objectStore('covers').put(blob, projId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeCoverBlob(projId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readwrite');
    const req = tx.objectStore('covers').delete(projId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── 公开 API ──

/**
 * 获取封面图片 URL（异步，优先走内存缓存）
 */
export async function getProjImage(projId) {
  try {
    const cached = _coverCache.get(projId);
    if (cached) return cached.url;
    const blob = await getCoverBlob(projId);
    if (blob) return cacheCover(projId, blob);
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * 设置项目封面（压缩 → Blob → IndexedDB）
 */
export async function setProjectCover(projectId, input) {
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  try {
    const blob = await compressImage(file);
    try {
      await setCoverBlob(projectId, blob);
      cacheCover(projectId, blob);
      const proj = getProj(projectId);
      if (proj) { proj.lastModified = Date.now(); saveData(); }
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        showToast('存储空间不足，封面保存失败 · 建议导出备份后清理旧项目');
      } else {
        showToast('封面保存失败，请重试');
      }
      return;
    }
    window.renderHome();
    showToast('封面已更新');
  } catch {
    showToast('图片处理失败，请重试');
  }
}

/**
 * 移除项目封面
 */
export async function removeProjectCover(projectId) {
  try {
    const cached = _coverCache.get(projectId);
    if (cached) {
      URL.revokeObjectURL(cached.url);
      _coverCache.delete(projectId);
    }
    await removeCoverBlob(projectId);
    const proj = getProj(projectId);
    if (proj) { proj.lastModified = Date.now(); saveData(); }
  } catch (e) {
    console.warn('removeProjectCover failed:', e);
  }
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

// ── 本地头像（storageAdapter key: profile_avatar）──

export async function getProfileAvatar() {
  try {
    return await storageAdapter.get('profile_avatar');
  } catch {
    return null;
  }
}

export async function setProfileAvatar(base64) {
  try {
    await storageAdapter.set('profile_avatar', base64);
  } catch (err) {
    console.error('[image/setProfileAvatar]', err);
    throw err;
  }
}

export async function removeProfileAvatar() {
  try {
    await storageAdapter.remove('profile_avatar');
  } catch (err) {
    console.error('[image/removeProfileAvatar]', err);
    throw err;
  }
}

// ── 参考图（复用 IndexedDB covers store，key: ref_{projId}_{ts}）──

async function _getRefBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readonly');
    const req = tx.objectStore('covers').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function _setRefBlob(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readwrite');
    const req = tx.objectStore('covers').put(blob, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function _removeRefBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('covers', 'readwrite');
    const req = tx.objectStore('covers').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function setRefImage(projId, key, base64) {
  try {
    const res = await fetch(base64);
    const blob = await res.blob();
    await _setRefBlob(key, blob);
  } catch (e) {
    console.warn('setRefImage failed:', e);
    throw e;
  }
}

export async function getRefImage(key) {
  try {
    const blob = await _getRefBlob(key);
    if (!blob) return null;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function addRefImage(projId, file) {
  if (!file) return;
  const MAX_REF_SIZE = 20 * 1024 * 1024; // 20MB
  if (file.size > MAX_REF_SIZE) {
    showToast('参考图过大，请选择小于20MB的图片');
    return;
  }
  try {
    const blob = await compressImage(file, 1200, 0.80);
    const key = `ref_${projId}_${Date.now()}`;
    await _setRefBlob(key, blob);
    const proj = getProj(projId);
    if (proj) {
      if (!Array.isArray(proj.refImages)) proj.refImages = [];
      proj.refImages.push(key);
      proj.lastModified = Date.now();
      saveData();
    }
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      showToast('存储空间不足，参考图保存失败');
    } else {
      showToast('参考图保存失败，请重试');
    }
  }
}

export async function removeRefImage(projId, key) {
  try {
    await _removeRefBlob(key);
    const proj = getProj(projId);
    if (proj && Array.isArray(proj.refImages)) {
      proj.refImages = proj.refImages.filter(k => k !== key);
      proj.lastModified = Date.now();
      saveData();
    }
  } catch (e) {
    console.warn('removeRefImage failed:', e);
  }
}

// ── 参考图管理 Sheet ──

export async function showRefImagesSheet(projId) {
  const proj = getProj(projId);
  if (!proj) return;
  if (!Array.isArray(proj.refImages)) proj.refImages = [];

  const keys = [...proj.refImages];

  let thumbsHTML = '';
  for (const key of keys) {
    const src = await getRefImage(key);
    thumbsHTML += `
      <div class="ref-img-thumb" onclick="openRefImageViewer('${projId}','${key}')">
        <img src="${src || ''}" alt="">
        <button class="ref-img-delete" onclick="event.stopPropagation();removeRefImage('${projId}','${key}');closeSheet();showRefImagesSheet('${projId}')">×</button>
      </div>`;
  }

  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${t('ref_images_title').replace('{n}', keys.length)}</div>
    <div style="padding:12px 16px;display:flex;gap:10px;overflow-x:auto;flex-wrap:wrap">
      ${thumbsHTML}
      <div class="ref-img-add" onclick="pickRefImages('${projId}')">＋</div>
    </div>
    <button class="sheet-cancel" onclick="closeSheet()">${t('cancel')}</button>`;

  showSheet(html);
}

// ── 全屏预览 ──

let _refViewerState = null;

export function openRefImageViewer(projId, currentKey) {
  const proj = getProj(projId);
  if (!proj || !Array.isArray(proj.refImages) || proj.refImages.length === 0) return;

  const keys = [...proj.refImages];
  let index = keys.indexOf(currentKey);
  if (index < 0) index = 0;

  // 清理旧 viewer
  _closeRefViewer();

  const overlay = document.createElement('div');
  overlay.className = 'ref-viewer-overlay';
  overlay.id = 'ref-viewer-overlay';

  const img = document.createElement('img');
  img.className = 'ref-viewer-img';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ref-viewer-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = _closeRefViewer;

  const annotateBtn = document.createElement('button');
  annotateBtn.className = 'ref-viewer-annotate';
  annotateBtn.textContent = '✏️';
  annotateBtn.onclick = (e) => {
    e.stopPropagation();
    _closeRefViewer();
    setTimeout(() => window.openAnnotator(projId, keys[index]), 250);
  };

  const dots = document.createElement('div');
  dots.className = 'ref-viewer-dots';

  function updateDots() {
    if (keys.length <= 1) { dots.innerHTML = ''; return; }
    dots.innerHTML = keys.map((_, i) =>
      `<span class="ref-viewer-dot${i === index ? ' active' : ''}"></span>`
    ).join('');
  }

  async function loadImage(i) {
    index = i;
    img.style.opacity = '0';
    const src = await getRefImage(keys[index]);
    if (src) img.src = src;
    updateDots();
    requestAnimationFrame(() => { img.style.opacity = '1'; });
  }

  // touch swipe
  let startX = 0;
  overlay.addEventListener('touchstart', e => {
    if (e.touches.length === 1) startX = e.touches[0].clientX;
  }, { passive: true });
  overlay.addEventListener('touchend', e => {
    const dx = (e.changedTouches[0]?.clientX || startX) - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && index < keys.length - 1) loadImage(index + 1);
      else if (dx > 0 && index > 0) loadImage(index - 1);
    }
  });

  overlay.appendChild(img);
  overlay.appendChild(closeBtn);
  overlay.appendChild(annotateBtn);
  overlay.appendChild(dots);
  document.body.appendChild(overlay);

  _refViewerState = { overlay, img, keys, index, projId };

  loadImage(index);

  // 点击图片关闭
  img.addEventListener('click', e => {
    e.stopPropagation();
    _closeRefViewer();
  });
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    _closeRefViewer();
  });
}

export function _closeRefViewer() {
  if (!_refViewerState) return;
  const { overlay } = _refViewerState;
  overlay.style.opacity = '0';
  setTimeout(() => {
    if (overlay.parentNode) overlay.remove();
    _refViewerState = null;
  }, 200);
}

// ── 从项目菜单/管理 Sheet 触发文件选择 ──

export function pickRefImages(projId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = async () => {
    const files = Array.from(input.files || []);
    for (const file of files) {
      await addRefImage(projId, file);
    }
    if (files.length > 0) {
      window.renderProject();
      showRefImagesSheet(projId);
    }
  };
  input.click();
}
