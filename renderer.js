const net = require('net');
const { ipcRenderer } = require('electron');

// Window Controls
document.getElementById('minBtn').addEventListener('click', () => ipcRenderer.send('window-minimize'));
document.getElementById('closeBtn').addEventListener('click', () => ipcRenderer.send('window-close'));

const client = new net.Socket();

const els = {
  connStatus: document.getElementById('connStatus'),
  dot: document.querySelector('.dot'),
  modeBtns: document.querySelectorAll('.mode-btn'),

  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  autostartCheck: document.getElementById('autostartCheck'),
  startMinCheck: document.getElementById('startMinCheck'),
  safeMaxRpmInput: document.getElementById('safeMaxRpmInput'),
  ecoCpuLimitSlider: document.getElementById('ecoCpuLimitSlider'),
  ecoCpuLimitVal: document.getElementById('ecoCpuLimitVal'),
  saveRpmSettingsBtn: document.getElementById('saveRpmSettingsBtn'),
  masterToggle: document.getElementById('masterToggle'),

  powerBtns: document.querySelectorAll('.power-btn'),
  fanBtns: document.querySelectorAll('.fan-btn'),

  cpuRpm: document.getElementById('cpuRpm'),
  cpuTemp: document.getElementById('cpuTemp'),
  cpuProgress: document.querySelector('.cpu-progress'),

  gpuRpm: document.getElementById('gpuRpm'),
  gpuTemp: document.getElementById('gpuTemp'),
  gpuProgress: document.querySelector('.gpu-progress'),

  masterSliderContainer: document.getElementById('masterSliderContainer'),
  masterSlider: document.getElementById('masterSlider'),
  masterSliderVal: document.getElementById('masterSliderVal'),

  curveEditor: document.getElementById('curveEditor'),
  curveSvg: document.getElementById('curveSvg'),
  curvePath: document.getElementById('curvePath'),
  curveTooltip: document.getElementById('curveTooltip')
};

// =======================
// DIL DESTEĞI (TR/EN)
// =======================
const I18N = {
  tr: {
    settings_title: 'Ayarlar',
    language: 'Dil',
    autostart: 'Windows Başlatıldığında Çalıştır',
    start_minimized: 'Başlangıçta Görev Çubuğuna Gizle',
    fan_limit_title: 'Fan Devir Sınırı',
    max_fan_rpm: 'En Yüksek Fan Devri:',
    max_fan_rpm_desc: 'Fanlar hiçbir modda, hiçbir koşulda bu değerin üzerinde dönmez. Uygulama ölçümlere göre sınırı kendisi hassas şekilde ayarlar.',
    eco_cpu_limit: 'Tasarruf Modu İşlemci Limiti:',
    eco_cpu_limit_desc: "Tasarruf modundayken işlemcinin maksimum gücünü kısar. (%99 Turbo Boost'u kapatıp sıcaklıkları harika düşürür).",
    save_limits: 'Sınırları Kaydet ve Uygula',
    saved_applied: 'Kaydedildi ve uygulandı',
    about: 'Hakkında',
    info: 'Bilgi',
    warning: 'Uyarı:',
    rpm_warning_text: "Fan devri, ayarladığınız sınırın ±100 RPM civarında değişiklik gösterebilir. EC (gömülü denetleyici) değerleri 100 RPM'lik adımlarla çalıştığı için küçük sapmalar normaldir.",
    hw_limit_text: 'Maksimum donanım sınırı cihazdan cihaza değişiklik gösterebilir. Uygulama, bu sınırın aşılmasını önlemek için sürekli ölçüm yapar ve gerekirse ayarınızı kendisi günceller.',
    close: 'Kapat',
    setup_done_title: 'Kurulum Tamamlandı!',
    setup_done_desc: "OMEN Fan Control'ü bilgisayarınız her açıldığında otomatik olarak arka planda başlatmak ister misiniz?",
    yes_autostart: 'Evet, Otomatik Başlat',
    no: 'Hayır',
    connecting: 'Bağlanıyor...',
    connected: 'Bağlandı',
    reconnecting: 'Bağlantı Koptu. Yeniden deneniyor...',
    power_plan: 'Güç Planı:',
    power_default: 'DENGELİ',
    power_performance: 'TAM GÜÇ',
    power_quiet: 'TASARRUF',
    fan: 'Fan:',
    toggle_control: 'Uygulama kontrolünü aç/kapat',
    active: 'AKTİF',
    passive: 'PASİF',
    master_slider: 'Sistem Soğutma Gücü (Master Slider)',
    curve_editor: 'Özel Fan Eğrisi (Fan Curve)',
    logs: 'KAYIT',
    clear: 'Temizle',
    log_console: 'Log Konsolu',
    settings: 'Ayarlar',
    log_connected: 'Fan kontrol servisine bağlanıldı',
    log_disconnected_retry: 'Bağlantı koptu, 3 saniye içinde tekrar denenecek',
    log_enabled: 'Kontrol aktif edildi',
    log_disabled: 'Kontrol pasife alındı, fanları BIOS yönetiyor',
    log_wmi_error: 'Donanıma erişilemiyor. Lütfen programı yönetici olarak çalıştırın.',
    log_power_mode: 'Güç planı:',
    log_fan_mode: 'Fan modu:',
    log_manual_speed: 'Manuel fan hızı %s olarak ayarlandı',
    log_profile_selected: 'Profil %s seçildi',
    log_curve_updated: 'Eğri güncellendi ve uygulandı (Profil %s)',
    log_limits_saved: 'Sınırlar kaydedildi: Fanlar en fazla %s RPM dönecek'
  },
  en: {
    settings_title: 'Settings',
    language: 'Language',
    autostart: 'Run at Windows Startup',
    start_minimized: 'Hide to System Tray on Startup',
    fan_limit_title: 'Fan Speed Limit',
    max_fan_rpm: 'Max Fan Speed:',
    max_fan_rpm_desc: 'Fans will never exceed this value in any mode or condition. The app adjusts the limit precisely based on measurements.',
    eco_cpu_limit: 'Eco Mode CPU Limit:',
    eco_cpu_limit_desc: "In Eco mode, the CPU's maximum power is throttled. (99% disables Turbo Boost and greatly reduces temperatures).",
    save_limits: 'Save & Apply Limits',
    saved_applied: 'Saved and applied',
    about: 'About',
    info: 'Info',
    warning: 'Warning:',
    rpm_warning_text: 'Fan speed may vary around ±100 RPM of your configured limit. EC (embedded controller) values work in 100 RPM steps, so small deviations are normal.',
    hw_limit_text: 'The maximum hardware limit varies from device to device. The app continuously monitors to prevent exceeding it and adjusts your setting when necessary.',
    close: 'Close',
    setup_done_title: 'Setup Complete!',
    setup_done_desc: 'Would you like OMEN Fan Control to start automatically in the background every time your computer boots?',
    yes_autostart: 'Yes, Start Automatically',
    no: 'No',
    connecting: 'Connecting...',
    connected: 'Connected',
    reconnecting: 'Disconnected. Retrying...',
    power_plan: 'Power Plan:',
    power_default: 'BALANCED',
    power_performance: 'FULL POWER',
    power_quiet: 'ECO',
    fan: 'Fan:',
    toggle_control: 'Toggle app control',
    active: 'ACTIVE',
    passive: 'OFF',
    master_slider: 'System Cooling Power (Master Slider)',
    curve_editor: 'Custom Fan Curve',
    logs: 'LOGS',
    clear: 'Clear',
    log_console: 'Log Console',
    settings: 'Settings',
    log_connected: 'Connected to fan control service',
    log_disconnected_retry: 'Connection lost, retrying in 3 seconds',
    log_enabled: 'Control enabled',
    log_disabled: 'Control disabled, BIOS manages the fans',
    log_wmi_error: 'Cannot access hardware. Please run the program as administrator.',
    log_power_mode: 'Power plan:',
    log_fan_mode: 'Fan mode:',
    log_manual_speed: 'Manual fan speed set to %s',
    log_profile_selected: 'Profile %s selected',
    log_curve_updated: 'Curve updated and applied (Profile %s)',
    log_limits_saved: 'Limits saved: fans will spin at most %s RPM'
  }
};

let lang = localStorage.getItem('omen_lang') || 'en';
function t(key, ...args) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.tr[key] || key;
  args.forEach(v => { s = s.replace('%s', v); });
  return s;
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  const rpmIcon = document.getElementById('rpmInfoIcon');
  if (rpmIcon) rpmIcon.title = t('info');
  // Dinamik metinleri de guncelle
  if (!wmiWarned) {
    els.connStatus.querySelector('span').innerText = isConnected ? t('connected') : t('connecting');
  }
  applyEnabledState(deviceEnabled);
}

const langSelect = document.getElementById('langSelect');
langSelect.value = lang;
langSelect.addEventListener('change', (e) => {
  lang = e.target.value;
  localStorage.setItem('omen_lang', lang);
  applyLang();
  ipcRenderer.send('set-lang', lang);
});
ipcRenderer.send('set-lang', lang);

let isConnected = false;
let currentPowerMode = 'default';
let currentFanMode = 'manual';
let wmiWarned = false;

// Tek tik kilidi: ayni komutun tekrar tekrar gonderilmesini engeller
let lastCmdTime = 0;
let modeSyncHoldUntil = 0; // Komut sonrasi kisa sure eski durum bildirimleri yok sayilir
function canSend() {
  const now = Date.now();
  if (now - lastCmdTime < 350) return false;
  lastCmdTime = now;
  modeSyncHoldUntil = now + 700;
  return true;
}

// Uygulama kontrol anahtari
let deviceEnabled = localStorage.getItem('omen_enabled') !== 'false';

let safeMaxRpm = parseInt(localStorage.getItem('omen_safe_max')) || 4000;
let ecoCpuLimit = parseInt(localStorage.getItem('omen_eco_cpu')) || 99;
let userMaxRpm = safeMaxRpm;

els.safeMaxRpmInput.value = safeMaxRpm;
els.ecoCpuLimitSlider.value = ecoCpuLimit;
els.ecoCpuLimitVal.innerText = `%${ecoCpuLimit}`;

const CIRCUMFERENCE = 251.2;

function fmtRpm(rpm) {
  return Math.round((rpm || 0) / 100) * 100;
}

// =======================
// LOG PANELİ
// =======================
const logPanel = document.getElementById('logPanel');
const logBody = document.getElementById('logBody');
const logOpenBtn = document.getElementById('logOpenBtn');

function log(msg, type = 'info') {
  if (!logBody) return;
  const t = new Date();
  const p = n => String(n).padStart(2, '0');
  const row = document.createElement('div');
  row.className = `log-line log-${type}`;
  row.textContent = `[${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}] ${msg}`;
  logBody.appendChild(row);
  while (logBody.children.length > 200) logBody.removeChild(logBody.firstChild);
  logBody.scrollTop = logBody.scrollHeight;
}

logOpenBtn.addEventListener('click', () => {
  const open = logPanel.classList.toggle('open');
  logOpenBtn.classList.toggle('open', open);
});
document.getElementById('logClearBtn').addEventListener('click', () => { logBody.innerHTML = ''; });
document.getElementById('logCloseBtn').addEventListener('click', () => {
  logPanel.classList.remove('open');
  logOpenBtn.classList.remove('open');
});

// Info panel toggle
const infoToggleBtn = document.querySelector('.info-icon');
if (infoToggleBtn) {
  infoToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const modal = document.getElementById('infoModal');
    modal.classList.toggle('open');
    infoToggleBtn.classList.toggle('open', modal.classList.contains('open'));
  });
}
document.getElementById('infoModal').addEventListener('click', (e) => {
  if (e.target === infoModal || e.target.classList.contains('info-modal-close')) {
    infoModal.classList.remove('open');
    infoToggleBtn.classList.remove('open');
  }
});

function setProgress(element, percent) {
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  element.style.strokeDashoffset = offset;
}

function applyEnabledState(on) {
  deviceEnabled = !!on;
  localStorage.setItem('omen_enabled', deviceEnabled ? 'true' : 'false');
  els.masterToggle.textContent = deviceEnabled ? t('active') : t('passive');
  els.masterToggle.classList.toggle('off', !deviceEnabled);
  els.masterToggle.classList.toggle('active', deviceEnabled);
  [els.powerBtns, els.fanBtns].forEach(list =>
    list.forEach(b => {
      if (b.id === 'masterToggle') return; // Anahtarin kendisi kilitlenmez!
      b.classList.toggle('disabled-ui', !deviceEnabled);
    }));
  if (!deviceEnabled) {
    els.masterSliderContainer.style.display = 'none';
    els.curveEditor.style.display = 'none';
  } else {
    els.masterSliderContainer.style.display = (currentFanMode === 'manual') ? 'block' : 'none';
    els.curveEditor.style.display = (currentFanMode === 'curve') ? 'flex' : 'none';
  }
}

els.masterToggle.addEventListener('click', () => {
  if (!canSend()) return;
  applyEnabledState(!deviceEnabled);
  if (deviceEnabled) {
    log(t('log_enabled'), 'ok');
  } else {
    log(t('log_disabled'), 'cmd');
  }
  sendCommand('set_enabled', { enabled: deviceEnabled });
});

function updateUI(data) {
  const { fan, temperatures } = data;

  if (typeof fan.enabled === 'boolean' && fan.enabled !== deviceEnabled) {
    applyEnabledState(fan.enabled);
  }

  els.cpuTemp.innerText = temperatures.cpu > 0 ? temperatures.cpu.toFixed(1) : '--';
  els.gpuTemp.innerText = temperatures.gpu > 0 ? temperatures.gpu.toFixed(1) : '--';

  const cpuRpm = fmtRpm(fan.fanSpeeds.cpu);
  const gpuRpm = fmtRpm(fan.fanSpeeds.gpu);
  els.cpuRpm.innerText = cpuRpm;
  els.gpuRpm.innerText = gpuRpm;

  setProgress(els.cpuProgress, Math.min((cpuRpm / userMaxRpm) * 100, 100));
  setProgress(els.gpuProgress, Math.min((gpuRpm / userMaxRpm) * 100, 100));

  if (fan.wmi_available === false && !wmiWarned) {
    wmiWarned = true;
    log(t('log_wmi_error'), 'err');
  }

  const syncAllowed = Date.now() > modeSyncHoldUntil;

  if (syncAllowed && fan.power_mode !== currentPowerMode) {
    currentPowerMode = fan.power_mode;
    els.powerBtns.forEach(b => {
      if (b.dataset.mode === currentPowerMode) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  if (syncAllowed && fan.fan_mode !== currentFanMode) {
    currentFanMode = fan.fan_mode;
    els.fanBtns.forEach(b => {
      if (!b.dataset.mode) return; // Anahtar dugmesi degil, sadece mod butonlari
      if (b.dataset.mode === currentFanMode) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Toggle Panels
    els.masterSliderContainer.style.display = (currentFanMode === 'manual') ? 'block' : 'none';
    els.curveEditor.style.display = (currentFanMode === 'curve') ? 'flex' : 'none';
  }
}

function sendCommand(command, payload = {}) {
  if (!isConnected) return;
  // Sınırlama ve MAX modu arka uçta yönetiliyor; burada düz gönderim var.
  client.write(JSON.stringify({ command, ...payload }) + '\n');
}

els.powerBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!deviceEnabled || !canSend()) return;
    if (btn.dataset.mode === currentPowerMode) return; // Aynı plan zaten seçili
    currentPowerMode = btn.dataset.mode;
    els.powerBtns.forEach(b => b.classList.toggle('active', b === btn));
    log(`${t('log_power_mode')} ${btn.textContent.trim()}`, 'cmd');
    sendCommand('set_power_mode', { mode: btn.dataset.mode, cpu_limit: ecoCpuLimit });
  });
});

els.fanBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!deviceEnabled || !canSend()) return;
    if (btn.dataset.mode === currentFanMode) return; // Aynı mod zaten seçili
    currentFanMode = btn.dataset.mode;
    els.fanBtns.forEach(b => b.classList.toggle('active', b === btn));

    els.masterSliderContainer.style.display = (currentFanMode === 'manual') ? 'block' : 'none';
    els.curveEditor.style.display = (currentFanMode === 'curve') ? 'flex' : 'none';

    log(`${t('log_fan_mode')} ${btn.textContent.trim()}`, 'cmd');
    sendCommand('set_fan_mode', { mode: btn.dataset.mode });
  });
});

els.masterSlider.addEventListener('input', (e) => {
  els.masterSliderVal.innerText = `${e.target.value}%`;
});

els.masterSlider.addEventListener('change', (e) => {
  log(t('log_manual_speed', `%${e.target.value}`), 'cmd');
  sendCommand('set_manual', {
    cpu: parseInt(e.target.value),
    gpu: parseInt(e.target.value)
  });
});

// =======================
// EĞRİ EDİTÖRÜ
// =======================
const defaultCurve = [
  { temp: 40, speed: 30 },
  { temp: 60, speed: 50 },
  { temp: 75, speed: 75 },
  { temp: 90, speed: 100 }
];

let profiles = JSON.parse(localStorage.getItem('omen_fan_profiles')) || {
  1: JSON.parse(JSON.stringify(defaultCurve)),
  2: JSON.parse(JSON.stringify(defaultCurve)),
  3: JSON.parse(JSON.stringify(defaultCurve))
};

let activeProfile = localStorage.getItem('omen_active_profile') || '1';
let curvePoints = profiles[activeProfile];

function saveProfile() {
  profiles[activeProfile] = JSON.parse(JSON.stringify(curvePoints));
  localStorage.setItem('omen_fan_profiles', JSON.stringify(profiles));
  localStorage.setItem('omen_active_profile', activeProfile);
}

document.querySelectorAll('.profile-btn').forEach(btn => {
  if (btn.dataset.profile === activeProfile) btn.classList.add('active');
  else btn.classList.remove('active');

  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.profile-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    activeProfile = btn.dataset.profile;
    curvePoints = profiles[activeProfile];
    saveProfile();

    log(t('log_profile_selected', activeProfile), 'cmd');
    renderCurve();
    sendCommand('set_curve', { points: curvePoints });
  });
});

let draggedPoint = null;

function renderCurve() {
  const rect = els.curveSvg.getBoundingClientRect();
  if (rect.width === 0) return; // Henüz görünür değil

  const w = rect.width;
  const h = rect.height;

  // Sıcaklığa göre sırala
  curvePoints.sort((a, b) => a.temp - b.temp);

  // Gerçek piksel koordinatlarıyla yol oluştur
  let d = `M 0 ${h} `;
  curvePoints.forEach(p => {
    d += `L ${(p.temp / 100) * w} ${h - (p.speed / 100) * h} `;
  });
  d += `L ${w} ${h - (curvePoints[curvePoints.length - 1].speed / 100) * h}`;
  els.curvePath.setAttribute('d', d);

  // Noktalar ve kılavuz çizgileri
  const existingElements = els.curveSvg.querySelectorAll('.control-point, .grid-line');
  existingElements.forEach(el => el.remove());

  // 3 yatay kılavuz çizgisi (%25, %50, %75)
  [0.25, 0.5, 0.75].forEach(ratio => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', 'grid-line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', h * ratio);
    line.setAttribute('x2', w);
    line.setAttribute('y2', h * ratio);
    els.curveSvg.insertBefore(line, els.curvePath); // Yolun arkasına yerleştir
  });

  curvePoints.forEach((p, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'control-point');
    circle.setAttribute('cx', (p.temp / 100) * w);
    circle.setAttribute('cy', h - (p.speed / 100) * h);
    circle.setAttribute('r', 6);
    circle.dataset.index = index;

    circle.addEventListener('mousedown', (e) => {
      draggedPoint = index;
      els.curveTooltip.style.display = 'block';
      updateTooltip(circle.getAttribute('cx'), circle.getAttribute('cy'), p.temp, p.speed);
      e.preventDefault();
    });

    // Üzerine gelince de bilgi göster
    circle.addEventListener('mouseenter', (e) => {
      if (draggedPoint === null) {
        els.curveTooltip.style.display = 'block';
        updateTooltip(circle.getAttribute('cx'), circle.getAttribute('cy'), p.temp, p.speed);
      }
    });

    circle.addEventListener('mouseleave', (e) => {
      if (draggedPoint === null) {
        els.curveTooltip.style.display = 'none';
      }
    });

    els.curveSvg.appendChild(circle);
  });
}

function updateTooltip(x, y, temp, speed) {
  els.curveTooltip.style.left = `${x}px`;
  els.curveTooltip.style.top = `${y}px`;
  els.curveTooltip.innerText = `${temp}°C - %${speed}`;
}

els.curveSvg.addEventListener('mousemove', (e) => {
  if (draggedPoint !== null) {
    const rect = els.curveSvg.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width * 100;
    let y = (e.clientY - rect.top) / rect.height * 100;

    // Sınırla
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Yeni değerler
    let temp = Math.round(x);
    let speed = Math.round(100 - y);

    // Noktalar birbirini geçmesin
    if (draggedPoint > 0 && temp <= curvePoints[draggedPoint - 1].temp) {
      temp = curvePoints[draggedPoint - 1].temp + 1;
    }
    if (draggedPoint < curvePoints.length - 1 && temp >= curvePoints[draggedPoint + 1].temp) {
      temp = curvePoints[draggedPoint + 1].temp - 1;
    }

    curvePoints[draggedPoint].temp = temp;
    curvePoints[draggedPoint].speed = speed;

    renderCurve();

    // Bilgi balonunu güncelle
    const px = (temp / 100) * rect.width;
    const py = rect.height - (speed / 100) * rect.height;
    updateTooltip(px, py, temp, speed);
  }
});

// Pencere boyutu değişince yeniden çiz
window.addEventListener('resize', renderCurve);

els.curveSvg.addEventListener('mouseup', () => {
  if (draggedPoint !== null) {
    draggedPoint = null;
    els.curveTooltip.style.display = 'none';
    saveProfile();
    log(t('log_curve_updated', activeProfile), 'ok');
    sendCommand('set_curve', { points: curvePoints });
  }
});
els.curveSvg.addEventListener('mouseleave', () => {
  if (draggedPoint !== null) {
    draggedPoint = null;
    els.curveTooltip.style.display = 'none';
    saveProfile();
    log(t('log_curve_updated', activeProfile), 'ok');
    sendCommand('set_curve', { points: curvePoints });
  }
});

// Panel gizliyken çizim başarısız olabilir; görünür olunca çiziyoruz
const observer = new MutationObserver(() => {
  if (els.curveEditor.style.display !== 'none') {
    renderCurve();
  }
});
observer.observe(els.curveEditor, { attributes: true, attributeFilter: ['style'] });

// =======================
// BAĞLANTI
// =======================
function connect() {
  client.connect(9292, '127.0.0.1', () => {
    isConnected = true;
    els.dot.className = 'dot green';
    els.connStatus.querySelector('span').innerText = t('connected');
    log(t('log_connected'), 'ok');
    // Kontrol durumunu ve sınırları arka uca gönder
    sendCommand('set_enabled', { enabled: deviceEnabled });
    sendCommand('set_limits', { safe_max_rpm: safeMaxRpm });
    // Kayıtlı eğriyi arka uca gönder
    sendCommand('set_curve', { points: curvePoints });
    applyEnabledState(deviceEnabled);
  });
}

client.on('data', (data) => {
  const str = data.toString();
  const messages = str.split('\n').filter(l => l.trim());
  messages.forEach(msg => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.type === 'status_update') {
        updateUI(parsed.data);
      }
    } catch (e) { }
  });
});

client.on('close', () => {
  isConnected = false;
  els.dot.className = 'dot red';
  els.connStatus.querySelector('span').innerText = t('reconnecting');
  log(t('log_disconnected_retry'), 'err');
  setTimeout(connect, 3000);
});

client.on('error', () => {});

connect();

// =======================
// AYARLAR PENCERESİ
// =======================
els.settingsBtn.addEventListener('click', () => {
  els.settingsModal.classList.add('show');
  ipcRenderer.send('get-autostart-status');
});

els.closeSettingsBtn.addEventListener('click', () => {
  els.settingsModal.classList.remove('show');
});

ipcRenderer.on('autostart-status', (event, isEnabled) => {
  els.autostartCheck.checked = isEnabled;
});

els.autostartCheck.addEventListener('change', (e) => {
  ipcRenderer.send('set-autostart', e.target.checked);
});

// İşlemci limiti göstergesi
els.ecoCpuLimitSlider.addEventListener('input', (e) => {
  els.ecoCpuLimitVal.innerText = `%${e.target.value}`;
});

els.saveRpmSettingsBtn.addEventListener('click', () => {
  // RPM değeri yüzün katlarına yuvarlanır (2900, 3200 gibi)
  let parsedSafe = Math.round(parseInt(els.safeMaxRpmInput.value) / 100) * 100;
  let parsedEco = parseInt(els.ecoCpuLimitSlider.value);

  if (!Number.isFinite(parsedSafe) || parsedSafe < 1000) parsedSafe = safeMaxRpm;
  if (!Number.isFinite(parsedEco)) parsedEco = ecoCpuLimit;

  safeMaxRpm = parsedSafe;
  ecoCpuLimit = parsedEco;

  localStorage.setItem('omen_safe_max', safeMaxRpm);
  localStorage.setItem('omen_eco_cpu', ecoCpuLimit);

  userMaxRpm = safeMaxRpm;

  els.safeMaxRpmInput.value = safeMaxRpm;
  els.ecoCpuLimitSlider.value = ecoCpuLimit;
  els.ecoCpuLimitVal.innerText = `%${ecoCpuLimit}`;

  // Yeni sınırı arka uca gönder
  sendCommand('set_limits', { safe_max_rpm: safeMaxRpm });

  // Mevcut modu yeni sınırla yeniden uygula
  if (deviceEnabled && currentFanMode === 'manual') {
    sendCommand('set_manual', { cpu: parseInt(els.masterSlider.value), gpu: parseInt(els.masterSlider.value) });
  } else if (deviceEnabled && currentFanMode === 'max') {
    sendCommand('set_fan_mode', { mode: 'max' });
  } else if (deviceEnabled && currentFanMode === 'curve') {
    sendCommand('set_curve', { points: curvePoints });
  }

  log(t('log_limits_saved', safeMaxRpm), 'ok');

  els.saveRpmSettingsBtn.innerText = t('saved_applied');
  setTimeout(() => {
    els.saveRpmSettingsBtn.innerText = t('save_limits');
  }, 2000);
});

// Açılışte gizli başlama
const startMinimized = localStorage.getItem('omen_start_minimized') === 'true';
els.startMinCheck.checked = startMinimized;

els.startMinCheck.addEventListener('change', (e) => {
  localStorage.setItem('omen_start_minimized', e.target.checked);
});

// İlk kurulum penceresi
const firstRunModal = document.getElementById('firstRunModal');
const firstRunYesBtn = document.getElementById('firstRunYesBtn');
const firstRunNoBtn = document.getElementById('firstRunNoBtn');

if (localStorage.getItem('omen_setup_done') !== 'true') {
  firstRunModal.classList.add('show');

  firstRunYesBtn.addEventListener('click', () => {
    ipcRenderer.send('set-autostart', true);
    els.autostartCheck.checked = true;
    localStorage.setItem('omen_setup_done', 'true');
    firstRunModal.classList.remove('show');
  });

  firstRunNoBtn.addEventListener('click', () => {
    ipcRenderer.send('set-autostart', false);
    els.autostartCheck.checked = false;
    localStorage.setItem('omen_setup_done', 'true');
    firstRunModal.classList.remove('show');
  });
} else {
  // Ayarlıysa gizli başlat (arayüz oturması için kısa bekleme)
  if (startMinimized) {
    setTimeout(() => {
      ipcRenderer.send('window-minimize');
    }, 500);
  }
}

// Sürüm etiketini package.json'dan oku
try {
  document.getElementById('appVersion').textContent = 'v' + require('./package.json').version;
} catch (e) {}

// Kayitli dili uygula
applyLang();
