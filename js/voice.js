import { state, NUMBER_MAP, getProj } from './state.js';
import { showToast } from './ui.js';

let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

export function playSound(type) {
  try {
    const ctx = _getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    const now = ctx.currentTime;
    let dur = 0.18;
    let vol = 0.25;
    let freqStart = 880;
    let freqEnd = 440;

    if (type === 'enter') {
      freqStart = 440;
      freqEnd = 880;
    } else if (type === 'stitch') {
      dur = 0.08;
      vol = 0.15;
      freqStart = 600;
      freqEnd = 600;
    }

    osc.frequency.setValueAtTime(freqStart, now);
    if (freqStart !== freqEnd) {
      osc.frequency.linearRampToValueAtTime(freqEnd, now + dur);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.linearRampToValueAtTime(0.001, now + dur + 0.02);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch (_) { /* audio is non-critical */ }
}

export function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'zh-CN';
  r.continuous = true;
  r.interimResults = false;

  r.onresult = (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    console.log('[voice] 识别到：', transcript);

    if (transcript === '撤销' || transcript === '撤回' || transcript === '后退' || transcript === '返回' || transcript === '取消') {
      window.undoStitch();
      window.triggerEdgeGlow(null);
      return;
    }

    const palBtns = document.querySelectorAll('#bottom-bar .pal-btn[data-sid]');
    console.log('[voice] 找到按钮数量：', palBtns.length);
    console.log('[voice] NUMBER_MAP 查询结果：', NUMBER_MAP[transcript]);

    const num = NUMBER_MAP[transcript];
    if (num == null) return;

    const target = palBtns[num - 1];
    if (!target) return;

    const sid = target.dataset.sid;
    window.pushStitch(sid);
    window.triggerEdgeGlow(sid);
    if (state.data.settings.voiceSoundEnabled) {
      playSound('stitch');
    }
  };

  r.onend = () => {
    if (state.voiceMode) r.start();
  };

  r.onerror = (e) => {
    if (e.error === 'not-allowed') {
      state.flowState.voiceState = 'off';
      state.voiceMode = false;
      state.recognition = null;
      setVoicePulse(false);
      updateVoiceButton();
      showToast('麦克风权限被拒绝');
    }
    // 其他错误静默，onend 会自动重启
  };

  return r;
}

export async function toggleVoiceMode() {
  // 启动中时点击 = 取消，直接重置
  if (state.flowState.voiceState === 'starting') {
    state.flowState.voiceState = 'off';
    if (state.recognition) {
      state.recognition.onend = null;
      try { state.recognition.stop(); } catch(_) {}
      state.recognition = null;
    }
    state.voiceMode = false;
    setVoicePulse(false);
    updateVoiceButton();
    return;
  }

  // 已开启时点击 = 关闭
  if (state.flowState.voiceState === 'on') {
    state.flowState.voiceState = 'off';
    state.voiceMode = false;
    if (state.recognition) {
      state.recognition.onend = null;
      try { state.recognition.stop(); } catch(_) {}
      state.recognition = null;
    }
    playSound('exit');
    setVoicePulse(false);
    const proj = getProj(state.curProjId);
    if (proj) {
      const bar = document.getElementById('bottom-bar');
      bar.innerHTML = window.renderDynamicPalette(proj) + window.renderFilterToggle() + window.renderBarRow();
    }
    updateVoiceButton();
    return;
  }

  // 关闭状态点击 = 开启，进入 starting
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast('当前浏览器不支持语音识别');
    return;
  }

  state.flowState.voiceState = 'starting';
  updateVoiceButton(); // 立即显示"启动中..."

  // 请求权限
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    await new Promise(r => setTimeout(r, 300));
  } catch(err) {
    state.flowState.voiceState = 'off';
    updateVoiceButton();
    showToast('麦克风权限被拒绝，请在浏览器设置里允许');
    return;
  }

  // 权限拿到，但用户可能在等待期间又点了取消
  if (state.flowState.voiceState !== 'starting') return;

  // 正式启动
  state.flowState.voiceState = 'on';
  state.voiceMode = true;
  state.recognition = initRecognition();
  try {
    state.recognition.start();
  } catch(err) {
    state.flowState.voiceState = 'off';
    state.voiceMode = false;
    state.recognition = null;
    updateVoiceButton();
    showToast('语音启动失败，请重试');
    return;
  }

  playSound('enter');
  setVoicePulse(true);
  const proj = getProj(state.curProjId);
  if (proj) {
    const bar = document.getElementById('bottom-bar');
    bar.innerHTML = window.renderDynamicPalette(proj) + window.renderFilterToggle() + window.renderBarRow();
  }
  updateVoiceButton();
}

export function setVoicePulse(active) {
  const el = document.getElementById('voice-pulse');
  if (!el) return;
  if (active) {
    el.style.opacity = '0.3';
    el.classList.add('active');
  } else {
    el.classList.remove('active');
    el.style.opacity = '0';
  }
}

export function updateVoiceButton() {
  const btn = document.getElementById('voice-mode-btn');
  if (!btn) return;
  if (state.flowState.voiceState === 'starting') {
    btn.textContent = '🎙 启动中';
    btn.style.background = '#F59E0B';
    btn.style.color = '#fff';
    btn.style.borderColor = '#F59E0B';
    btn.style.animation = 'btn-pulse 1s ease-in-out infinite';
  } else if (state.flowState.voiceState === 'on') {
    btn.textContent = '🎙 语音中';
    btn.style.background = '#EF4444';
    btn.style.color = '#fff';
    btn.style.borderColor = '#EF4444';
    btn.style.animation = 'btn-pulse 1.8s ease-in-out infinite';
  } else {
    btn.textContent = '🎙 语音';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.style.animation = '';
  }
}

export function dismissVoiceHint() {
  localStorage.setItem('voice_hint_shown', 'true');
  const banner = document.getElementById('voice-hint-banner');
  if (banner) banner.remove();
}

export function openVoiceTutorial() {
  const content = `<div class="sheet-handle"></div>
  <div class="sheet-title">🎙 语音模式使用说明</div>
  <div style="padding:14px 16px;font-size:14px;line-height:1.8;color:var(--text)">
    <div style="background:#FEF3C7;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#92400E;line-height:1.6">
      💡 追求快速记录针数的用户优先推荐手动模式。Web 端语音识别存在不可避免的延迟，适合对节奏要求不高的场景。
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div>
        <div style="font-weight:700;margin-bottom:4px">① 开启语音模式</div>
        <div style="color:var(--muted);font-size:13px">点击底部"🎙 语音"按钮，按钮变红即为开启。首次使用需要允许麦克风权限。</div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:4px">② 说数字添加针法</div>
        <div style="color:var(--muted);font-size:13px">说"一"到"九"，对应底部针法按钮的顺序（从左到右）。开启语音模式后按钮上会显示对应数字。</div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:4px">③ 说"撤销"删除上一针</div>
        <div style="color:var(--muted);font-size:13px">识别到"撤销""撤回""取消"均可触发撤销。</div>
      </div>
      <div>
        <div style="font-weight:700;margin-bottom:4px">④ 音效反馈（推荐打开）</div>
        <div style="color:var(--muted);font-size:13px">可在设置里开启"语音模式音效"，每针成功添加时播放短促提示音。</div>
      </div>
    </div>
  </div>
  <button class="sheet-cancel" onclick="closeSheet()">知道了</button>`;
  window.showSheet(content);
}
