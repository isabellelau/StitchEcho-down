import { state } from './state.js';
import { t } from './i18n.js';
import { escapeHtml } from './utils.js';

export { escapeHtml };

export function showToast(message, action, duration = 4000) {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: #2D1E10;
    color: #fff;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0,0,0,.25);
    max-width: 320px;
    animation: toast-in .2s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes toast-in { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`;
  document.head.appendChild(style);

  toast.textContent = message;

  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.style.cssText = `
      background: var(--accent);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
    `;
    btn.onclick = () => { toast.remove(); action.onClick(); };
    toast.appendChild(btn);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    if (document.getElementById('app-toast') === toast) {
      toast.style.transition = 'opacity .3s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

export function showSheet(html) {
  document.getElementById("sheet").innerHTML = html;
  document.getElementById("sheet").classList.add("show");
  document.getElementById("overlay").classList.add("show");
  window._pushPopupState?.();
}

export function closeSheet() {
  document.getElementById("sheet").classList.remove("show", "multi-editor-sheet");
  document.getElementById("overlay").classList.remove("show");
  state.pendingInsert = null; state.selectedStitch = null;
  window._popPopupState?.();

  // ── 流程分支（顺序敏感，不要调换）──
  if (state.flowState.importMode === 'create') {
    state.flowState.importMode = null;
    showEntryChoiceSheet();
    return;
  }
  if (state.flowState.newProjectFlow) {
    state.flowState.newProjectFlow = false;
    window.renderProject();
  }
}

export function showEntryChoiceSheet() {
  let html = `<div class="sheet-handle"></div>
  <div class="sheet-title">${t('entry_choice_title')}</div>
  <div style="padding:14px 16px;display:flex;flex-direction:column;gap:12px">
    <div onclick="startImportFlow()" style="background:var(--card);border:2px solid var(--accent);border-radius:14px;padding:18px 16px;cursor:pointer;display:flex;align-items:center;gap:14px">
      <div style="width:48px;height:48px;border-radius:12px;background:#FEF3C7;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📋</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:3px">${t('entry_paste_auto')}</div>
        <div style="font-size:12px;color:var(--muted)">${t('entry_paste_auto_sub')}</div>
      </div>
      <div style="color:var(--accent);font-size:20px;flex-shrink:0">→</div>
    </div>
    <div onclick="startManualFlow()" style="background:var(--card);border:2px solid var(--border);border-radius:14px;padding:18px 16px;cursor:pointer;display:flex;align-items:center;gap:14px">
      <div style="width:48px;height:48px;border-radius:12px;background:#EDE9FE;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">✏️</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:3px">${t('entry_manual')}</div>
        <div style="font-size:12px;color:var(--muted)">${t('entry_manual_sub')}</div>
      </div>
      <div style="color:var(--muted);font-size:20px;flex-shrink:0">→</div>
    </div>
  </div>
  <div style="text-align:right;padding:6px 16px 8px;font-size:11px;color:var(--muted);cursor:pointer" onclick="startStitchOnlyFlow()">
    ${t('entry_free_mode_link')}
  </div>`;
  showSheet(html);
}

export function showConfirmDialog(message, onConfirm, opts) {
  document.getElementById("dlg-title").textContent = (opts && opts.title) ? opts.title : t('dialog_confirm_title');
  document.getElementById("dlg-msg").textContent = message;
  document.getElementById("dlg-msg").style.display = "";
  document.getElementById("dlg-input").style.display = "none";
  state.dlgCallback = null;
  state.confirmCallback = onConfirm;
  state._dlgOpts = opts || null;
  document.getElementById("dialog").classList.add("show");
  window._pushPopupState?.();
  const okBtn = document.querySelector("#dialog .dialog-btn.ok");
  if (okBtn && opts && opts.confirmLabel) okBtn.textContent = opts.confirmLabel;
  const cancelBtn = document.querySelector("#dialog .dialog-btn:not(.ok)");
  if (cancelBtn && opts && opts.cancelLabel) cancelBtn.textContent = opts.cancelLabel;
  setTimeout(() => okBtn && okBtn.focus(), 100);
}

export function confirmDialog() {
  const val = document.getElementById("dlg-input").value;
  const cb = state.confirmCallback;
  state.confirmCallback = null;
  closeDialog();
  if (typeof state.dlgCallback === 'function') { state.dlgCallback(val); state.dlgCallback = null; }
  if (typeof cb === 'function') { cb(true); }
}

export function closeDialog() {
  document.getElementById("dialog").classList.remove("show");
  const okBtn = document.querySelector("#dialog .dialog-btn.ok");
  if (okBtn) okBtn.textContent = t('confirm');
  const cancelBtn = document.querySelector("#dialog .dialog-btn:not(.ok)");
  if (cancelBtn) cancelBtn.textContent = t('cancel');
  if (typeof state.confirmCallback === 'function') { state.confirmCallback(false); state.confirmCallback = null; }
  state._dlgOpts = null;
  window._popPopupState?.();
}
