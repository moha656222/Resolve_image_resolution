/* ==========================================================
   RESOLVE · Professional Image Enhancement
   Functional logic (unchanged behavior, refined copy)
   ========================================================== */

/* ================== STATE ================== */
const TARGETS = { '2K': 2560, '4K': 3840, '8K': 7680 };

const RES_OPTS = [
  { k: '2K', dim: '2560 × 1440', desc: 'Nítido · Rápido' },
  { k: '4K', dim: '3840 × 2160', desc: 'Detallado · Equilibrado' },
  { k: '8K', dim: '7680 × 4320', desc: 'Archivo · Máximo' },
];

const FEATURES = [
  { tag: '01', t: 'Totalmente privado', d: 'Tus imágenes permanecen en tu dispositivo durante todo el proceso. Nada se envía a servidores externos.' },
  { tag: '02', t: 'Sin registros', d: 'Sin cuentas, sin correos, sin fricción. Abre la herramienta y empieza a trabajar de inmediato.' },
  { tag: '03', t: 'Calidad superior', d: 'Reconstrucción precisa del detalle y la textura. Resultados listos para impresión o archivo.' },
  { tag: '04', t: 'Tres resoluciones', d: 'Elige 2K, 4K u 8K según el uso final: redes, publicación o archivo de alta fidelidad.' },
];

const HOW = [
  { n: '01', t: 'Sube tu imagen', d: 'Arrastra o selecciona un archivo JPG, PNG o WEBP de hasta 20 MB.' },
  { n: '02', t: 'Elige resolución', d: '2K para redes, 4K para impresión, 8K para archivo de alta fidelidad.' },
  { n: '03', t: 'Procesa al instante', d: 'El escalado se ejecuta de forma local. Entre 30 segundos y 3 minutos según el tamaño.' },
  { n: '04', t: 'Descarga', d: 'Obtén un PNG de alta resolución con detalle reconstruido y nitidez refinada.' },
];

const STAGES = ['Preparando', 'Analizando', 'Escalando', 'Refinando', 'Finalizando'];

let state = { file: null, resolution: '4K', phase: 'idle', cancel: false, enhanced: null, originalUrl: null };
let upscaler = null;

/* ================== HELPERS ================== */
const $ = (id) => document.getElementById(id);

/* ================== THEME ================== */
function initTheme() {
  const saved = localStorage.getItem('theme');
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
  updateThemeIcon(dark);
}
function updateThemeIcon(dark) {
  $('themeIcon').innerHTML = dark
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
}
$('themeBtn').onclick = () => {
  const dark = !document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  updateThemeIcon(dark);
};

/* ================== HEADER SCROLL ================== */
addEventListener('scroll', () => $('header').classList.toggle('scrolled', scrollY > 20));

/* ================== FEATURES & HOW ================== */
$('featsGrid').innerHTML = FEATURES.map(f => `
  <div class="feat reveal">
    <div class="featIdx">${f.tag}</div>
    <div>
      <h3>${f.t}</h3>
      <p>${f.d}</p>
    </div>
  </div>`).join('');

$('howGrid').innerHTML = HOW.map(h => `
  <div class="step reveal">
    <div class="nn">${h.n}</div>
    <h3>${h.t}</h3>
    <p>${h.d}</p>
  </div>`).join('');

$('yr').textContent = new Date().getFullYear();

/* ================== RESOLUTION SELECTOR ================== */
function renderRes() {
  $('resGrid').innerHTML = RES_OPTS.map(o => `
    <button class="resCard ${state.resolution === o.k ? 'active' : ''}" data-res="${o.k}" data-testid="res-card-${o.k.toLowerCase()}">
      <div class="row1"><span class="lbl">Salida</span><span class="dot"></span></div>
      <div class="num">${o.k}</div>
      <div><div class="dim">${o.dim}</div><div class="desc">${o.desc}</div></div>
    </button>`).join('');
  $('resGrid').querySelectorAll('.resCard').forEach(b => {
    b.onclick = () => {
      state.resolution = b.dataset.res;
      renderRes();
      $('startTxt').textContent = `Mejorar imagen · ${state.resolution}`;
    };
  });
}

/* ================== INTERSECTION REVEAL ================== */
const io = new IntersectionObserver(
  (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach(n => io.observe(n));

/* ================== BEFORE/AFTER SLIDER (generic) ================== */
function bindSlider(slider) {
  const handle = slider.querySelector('.handle');
  const clip = slider.querySelector('.clip');
  let dragging = false;
  const upd = (cx) => {
    const r = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, cx - r.left));
    const p = (x / r.width) * 100;
    handle.style.left = p + '%';
    clip.style.width = p + '%';
  };
  slider.addEventListener('mousedown', (e) => { dragging = true; upd(e.clientX); });
  slider.addEventListener('touchstart', (e) => { dragging = true; upd(e.touches[0].clientX); }, { passive: true });
  addEventListener('mousemove', (e) => { if (dragging) upd(e.clientX); });
  addEventListener('touchmove', (e) => { if (dragging) upd(e.touches[0].clientX); }, { passive: true });
  addEventListener('mouseup', () => dragging = false);
  addEventListener('touchend', () => dragging = false);
}
bindSlider($('heroSlider'));
bindSlider($('resultSlider'));

/* Init clip to 50% on hero */
(function initHeroClip() {
  const hs = $('heroSlider');
  const clip = hs.querySelector('.clip');
  clip.style.width = '50%';
})();

/* ================== UPLOAD ================== */
function bindDropzone() {
  const dz = $('dropzone'), fi = $('fileInput');
  if (!dz || !fi) return;
  dz.onclick = () => fi.click();
  ['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', ev => { const f = ev.dataTransfer.files[0]; if (f) acceptFile(f); });
  fi.addEventListener('change', ev => { const f = ev.target.files[0]; if (f) acceptFile(f); });
}
bindDropzone();

function showError(msg) {
  const e = $('errMsg');
  e.classList.remove('hidden');
  $('errText').textContent = msg;
  setTimeout(() => e.classList.add('hidden'), 5000);
}

function acceptFile(f) {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type);
  if (!ok) { showError('Archivo no compatible. Usa JPG, PNG o WEBP.'); return; }
  if (f.size > 20 * 1024 * 1024) { showError('El archivo supera el tamaño máximo (20 MB).'); return; }
  state.file = f;
  state.originalUrl = URL.createObjectURL(f);
  renderPreview();
  $('configArea').classList.remove('hidden');
  renderRes();
  $('startTxt').textContent = `Mejorar imagen · ${state.resolution}`;
}

function renderPreview() {
  $('dropArea').innerHTML = `
    <div class="preview">
      <div class="thumb"><img src="${state.originalUrl}" alt=""></div>
      <div class="info">
        <div class="lbl">Archivo seleccionado</div>
        <div class="nm">${state.file.name}</div>
        <div class="sz">${(state.file.size / 1024 / 1024).toFixed(2)} MB · ${state.file.type.split('/')[1].toUpperCase()}</div>
      </div>
      <button id="rmFile" aria-label="Quitar archivo" data-testid="remove-file-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  $('rmFile').onclick = resetAll;
}

/* ================== ENHANCEMENT FLOW ================== */
$('startBtn').onclick = enhance;
$('resetBtn').onclick = resetAll;
$('downloadBtn').onclick = download;

function renderStages(idx) {
  $('stagesRow').innerHTML = STAGES.map((_, i) =>
    `<span class="${i <= idx ? 'on' : ''}">${String(i + 1).padStart(2, '0')}</span>${i < STAGES.length - 1 ? '<span class="ln"></span>' : ''}`
  ).join('');
}

let elapsedTimer = null;
async function enhance() {
  state.cancel = false;
  state.phase = 'processing';
  $('configArea').classList.add('hidden');
  $('progArea').classList.remove('hidden');
  $('targetLbl').textContent = `Salida · ${state.resolution}`;

  let secs = 0;
  clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => {
    secs++;
    $('elapsed').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }, 1000);

  setProgress(2, STAGES[0]);

  try {
    if (!upscaler) {
      // eslint-disable-next-line no-undef
      upscaler = new Upscaler({
        model: {
          path: 'https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-slim@1.0.0-beta.12/4x/models/model.json',
          scale: 4,
        },
      });
    }

    setProgress(8, STAGES[1]);
    const img = await loadImg(state.originalUrl);
    if (state.cancel) return;
    setProgress(15, STAGES[2]);

    const out4x = await upscaler.execute(img, {
      output: 'base64',
      patchSize: 64,
      padding: 4,
      progress: (p) => {
        if (state.cancel) return;
        setProgress(15 + p * 60, STAGES[2]);
      },
    });
    if (state.cancel) return;
    setProgress(80, STAGES[3]);

    const upImg = await loadImg(out4x);
    const targetW = TARGETS[state.resolution];
    const finalW = Math.round(targetW);
    const finalH = Math.round((upImg.naturalHeight / upImg.naturalWidth) * finalW);
    const cv = document.createElement('canvas');
    cv.width = finalW;
    cv.height = finalH;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(upImg, 0, 0, finalW, finalH);

    setProgress(95, STAGES[4]);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png', 1));
    const url = URL.createObjectURL(blob);
    state.enhanced = { url, blob, width: finalW, height: finalH };
    setProgress(100, 'Completado');
    clearInterval(elapsedTimer);

    $('progArea').classList.add('hidden');
    $('resultArea').classList.remove('hidden');
    $('outNum').textContent = state.resolution;
    $('outPx').textContent = `${finalW} × ${finalH} px`;
    $('resBadge').textContent = `Mejorado · ${state.resolution}`;
    $('dlTxt').textContent = `Descargar · ${state.resolution}`;
    $('resAfter').src = url;
    $('resBefore').src = state.originalUrl;
    // ensure result slider starts at 50%
    const rs = $('resultSlider');
    rs.querySelector('.clip').style.width = '50%';
    rs.querySelector('.handle').style.left = '50%';
    state.phase = 'done';
  } catch (e) {
    console.error(e);
    clearInterval(elapsedTimer);
    $('progArea').classList.add('hidden');
    showError('No se pudo completar el proceso: ' + (e.message || 'error desconocido'));
    state.phase = 'idle';
    $('configArea').classList.remove('hidden');
  }
}

function setProgress(p, stage) {
  const v = Math.min(100, Math.round(p));
  $('fillBar').style.width = v + '%';
  $('pctTxt').textContent = v + '%';
  if (stage) { $('stageTxt').textContent = stage; }
  const idx = Math.min(Math.floor(v / 20), STAGES.length - 1);
  renderStages(idx);
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function download() {
  if (!state.enhanced) return;
  const a = document.createElement('a');
  a.href = state.enhanced.url;
  a.download = `resolve_${state.resolution}_${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function resetAll() {
  state.cancel = true;
  state.phase = 'idle';
  state.file = null;
  state.enhanced = null;
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state.originalUrl = null;
  clearInterval(elapsedTimer);
  $('configArea').classList.add('hidden');
  $('progArea').classList.add('hidden');
  $('resultArea').classList.add('hidden');
  $('dropArea').innerHTML = `
    <div class="dropzone" id="dropzone" data-testid="dropzone">
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp" hidden>
      <div class="dzIcon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></svg></div>
      <h3>Suelta tu imagen aquí</h3>
      <p>o haz clic para seleccionar un archivo</p>
      <div class="meta">JPG · PNG · WEBP · hasta 20MB</div>
    </div>`;
  bindDropzone();
}

initTheme();
