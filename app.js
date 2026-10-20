(() => {
  'use strict';

  const MAX_FILES = 80;
  const MAX_FULLSCREEN_LAYERS = 8;
  const MAX_FILE_BYTES = 60 * 1024 * 1024;
  const STORAGE_KEY = 'kaki-mark-studio-settings-v3';
  const ONBOARDING_KEY = 'kaki-mark-studio-onboarding-v1';
  const PREVIEW_EDGE = 1500;

  const WATERMARK_DEFAULTS = Object.freeze({
    preset: 'tiled',
    text: 'KAKI STUDIO',
    size: 3.2,
    opacity: 82,
    position: 'br',
    margin: 4,
    rotate: -24,
    gap: 28,
    font: 'sans',
    color: '#ffffff',
    strokeColor: '#111111',
    stroke: 0,
    gradientColor: '#141412',
    gradientStrength: 92,
    gradientHeight: 48,
    bandBackground: '#141310',
    bandOpacity: 90,
    bandDateEnabled: false
  });

  const COLLAGE_DEFAULTS = Object.freeze({
    ratio: 'auto',
    rows: 3,
    cols: 3,
    gap: 4,
    background: '#fbfaf7',
    numberEnabled: true,
    numberStart: 1,
    numberSize: 8,
    numberPosition: 'br',
    soldEnabled: false,
    soldNumbers: '',
    remainingMode: false,
    cellMarkEnabled: false
  });

  const EXPORT_DEFAULTS = Object.freeze({
    format: 'jpeg',
    edge: '2400',
    edgeLocked: true,
    quality: 92,
    prefix: 'kaki'
  });

  const PRESETS = Object.freeze({
    tiled: { opacity: 18, size: 3.8, stroke: 0, gap: 30 },
    gradient: { opacity: 94, size: 5.2, stroke: 0, gradientStrength: 92, gradientHeight: 48 },
    band: { opacity: 92, size: 3.5, stroke: 0 }
  });

  const PRESET_ALIASES = { corner: 'tiled', center: 'gradient', double: 'tiled' };

  const FRAME_DEFAULTS = Object.freeze({
    scale: 100,
    opacity: 100,
    blend: 'normal',
    x: 0,
    y: 0,
    placement: 'cell',
    tintEnabled: false,
    tintColor: '#ffffff',
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowOpacity: 32,
    shadowBlur: 40,
    shadowX: 8,
    shadowY: 12,
    glowEnabled: false,
    glowColor: '#ffffff',
    glowOpacity: 48,
    glowBlur: 60,
    strokeEnabled: false,
    strokeColor: '#ffffff',
    strokeWidth: 5
  });

  const SMALL_DEFAULTS = Object.freeze({
    scale: 18,
    opacity: 90,
    blend: 'normal',
    anchor: 'br',
    x: 4,
    y: 4,
    placement: 'cell',
    rotate: 0,
    shadowEnabled: true,
    shadowColor: '#000000',
    shadowOpacity: 42,
    shadowBlur: 14,
    shadowX: 3,
    shadowY: 5,
    glowEnabled: false,
    glowColor: '#ffffff',
    glowOpacity: 50,
    glowBlur: 36,
    strokeEnabled: false,
    strokeColor: '#ffffff',
    strokeWidth: 4
  });

  const BLEND_MODES = Object.freeze({
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    'soft-light': 'soft-light',
    lighten: 'lighten',
    darken: 'darken'
  });

  const FULLSCREEN_BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'lighten', 'darken'];

  const FONT_STACKS = {
    sans: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Helvetica Neue",sans-serif',
    serif: '"Songti SC","STSong","SimSun",Georgia,serif',
    mono: '"SFMono-Regular",Consolas,"Liberation Mono",monospace'
  };

  const state = {
    files: [],
    activePage: 0,
    mode: 'watermark',
    watermark: { ...WATERMARK_DEFAULTS },
    collage: { ...COLLAGE_DEFAULTS },
    marks: {
      frame: { ...FRAME_DEFAULTS },
      small: { ...SMALL_DEFAULTS }
    },
    assets: {
      fullscreen: [],
      frame: null,
      small: null
    },
    export: { ...EXPORT_DEFAULTS },
    previewUrls: [],
    busy: false,
    previewToken: 0,
    renderToken: 0
  };

  const el = {};
  let previewTimer = 0;
  let resizeTimer = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const numberOr = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const currentDateLabel = () => {
    const now = new Date();
    return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
  };
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hexToRgba = (hex, alpha = 1) => {
    const value = String(hex || '#000000').replace('#', '');
    const safe = /^[0-9a-f]{6}$/i.test(value) ? value : '000000';
    const r = parseInt(safe.slice(0, 2), 16);
    const g = parseInt(safe.slice(2, 4), 16);
    const b = parseInt(safe.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
  };
  const getPath = (object, path) => path.split('.').reduce((value, key) => value && value[key], object);
  const setPath = (object, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((node, key) => node[key], object);
    target[last] = value;
  };

  function cacheEls() {
    const ids = [
      'resetSettingsBtn','dropZone','fileInput','queueView','queueStrip','libraryMeta',
      'clearImagesBtn','watermarkTab','collageTab','watermarkPanel','collagePanel',
      'watermarkText','watermarkSize','watermarkSizeValue','watermarkOpacity','watermarkOpacityValue',
      'watermarkPosition','watermarkMargin','watermarkMarginValue','watermarkRotate',
      'watermarkRotateValue','watermarkGap','watermarkGapValue','watermarkFont','watermarkColor',
      'strokeColor','watermarkStroke','watermarkStrokeValue','cornerOptions','tiledOptions',
      'bandOptions','bandBackground','bandOpacity','bandOpacityValue','bandDateEnabled',
      'gradientColor','gradientStrength','gradientStrengthValue','gradientHeight',
      'gradientHeightValue','gradientOptions','gradientHeightOptions',
      'collageRatio','collageRows','collageCols','collageGap','collageGapValue','collageBg',
      'numberEnabled','numberStart','numberSize','numberSizeValue','numberPosition','soldEnabled','soldOptions','soldNumbers',
      'remainingMode','cellMarkEnabled','exportFormat','exportEdge','exportEdgeState',
      'exportEdgeLockBtn','exportQuality','exportQualityValue','exportQualityRow','filePrefix',
      'stageTitle','previewMeta','previewSurface','previewCanvas','emptyState',
      'emptySelectBtn','prevBtn','nextBtn','pagerLabel','downloadCurrentBtn','exportAllBtn',
      'exportAllLabel','progressWrap','progressText','progressPercent','progressBar','toastRegion',
      'previewAllBtn','resultGallery','resultGrid',
      'numberOptions','fullscreenCount','fullscreenInput','addFullscreenBtn','fullscreenList',
      'frameInput','frameChooseBtn','frameEmpty','frameEditor','frameThumb',
      'frameName','frameRemoveBtn','frameShadowControls','frameGlowControls','frameStrokeControls',
      'frameStatus','smallInput','smallChooseBtn','smallEmpty','smallEditor',
      'smallThumb','smallName','smallRemoveBtn','smallShadowControls','smallGlowControls',
      'smallStrokeControls','smallStatus','showWelcomeBtn','welcomeOverlay','welcomeStartBtn'
    ];
    ids.forEach((id) => { el[id] = document.getElementById(id); });
    el.presetCards = Array.from(document.querySelectorAll('[data-preset]'));
    el.modeTabs = Array.from(document.querySelectorAll('[data-mode]'));
    el.watermarkControls = Array.from(document.querySelectorAll('[data-watermark]'));
    el.collageControls = Array.from(document.querySelectorAll('[data-collage]'));
    el.markControls = Array.from(document.querySelectorAll('[data-mark]'));
    el.collageMarkPlacements = Array.from(document.querySelectorAll('.collage-mark-placement'));
    el.exportControls = Array.from(document.querySelectorAll('[data-export]'));
  }

  function toast(message, type = '') {
    const node = document.createElement('div');
    node.className = `toast ${type}`.trim();
    node.textContent = message;
    el.toastRegion.appendChild(node);
    window.setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(4px)';
      node.style.transition = 'opacity .2s, transform .2s';
      window.setTimeout(() => node.remove(), 220);
    }, 3600);
  }

  function syncRange(input, outputEl, suffix = '%') {
    if (!input) return;
    const min = numberOr(input.min, 0);
    const max = numberOr(input.max, 100);
    const value = numberOr(input.value, min);
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--pct', `${pct}%`);
    if (outputEl) outputEl.textContent = `${value}${suffix}`;
  }

  function syncAllRanges() {
    syncRange(el.watermarkSize, el.watermarkSizeValue);
    syncRange(el.watermarkOpacity, el.watermarkOpacityValue);
    syncRange(el.watermarkMargin, el.watermarkMarginValue);
    syncRange(el.watermarkRotate, el.watermarkRotateValue, '°');
    syncRange(el.watermarkGap, el.watermarkGapValue, '');
    syncRange(el.watermarkStroke, el.watermarkStrokeValue);
    syncRange(el.bandOpacity, el.bandOpacityValue);
    syncRange(el.gradientStrength, el.gradientStrengthValue);
    syncRange(el.gradientHeight, el.gradientHeightValue);
    syncRange(el.collageGap, el.collageGapValue);
    syncRange(el.numberSize, el.numberSizeValue);
    syncRange(el.exportQuality, el.exportQualityValue);
    document.querySelectorAll('[data-value-for]').forEach((output) => {
      const key = output.dataset.valueFor;
      const control = el.markControls.find((item) => item.dataset.mark === key && item.type === 'range');
      if (!control) return;
      syncRange(control, output, output.dataset.suffix || (key.endsWith('.rotate') ? '°' : '%'));
    });
  }

  function applyUiFromState() {
    el.watermarkText.value = state.watermark.text;
    el.watermarkSize.value = state.watermark.size;
    el.watermarkOpacity.value = state.watermark.opacity;
    el.watermarkPosition.value = state.watermark.position;
    el.watermarkMargin.value = state.watermark.margin;
    el.watermarkRotate.value = state.watermark.rotate;
    el.watermarkGap.value = state.watermark.gap;
    el.watermarkFont.value = state.watermark.font;
    el.watermarkColor.value = state.watermark.color;
    el.strokeColor.value = state.watermark.strokeColor;
    el.watermarkStroke.value = state.watermark.stroke;
    el.gradientColor.value = state.watermark.gradientColor;
    el.gradientStrength.value = state.watermark.gradientStrength;
    el.gradientHeight.value = state.watermark.gradientHeight;
    el.bandBackground.value = state.watermark.bandBackground;
    el.bandOpacity.value = state.watermark.bandOpacity;
    el.bandDateEnabled.checked = state.watermark.bandDateEnabled;

    el.collageRatio.value = state.collage.ratio;
    el.collageRows.value = state.collage.rows;
    el.collageCols.value = state.collage.cols;
    el.collageGap.value = state.collage.gap;
    el.collageBg.value = state.collage.background;
    el.numberEnabled.checked = state.collage.numberEnabled;
    el.numberStart.value = state.collage.numberStart;
    el.numberSize.value = state.collage.numberSize;
    el.numberPosition.value = state.collage.numberPosition;
    el.soldEnabled.checked = state.collage.soldEnabled;
    el.soldNumbers.value = state.collage.soldNumbers;
    el.remainingMode.checked = state.collage.remainingMode;
    el.cellMarkEnabled.checked = state.collage.cellMarkEnabled;

    el.exportFormat.value = state.export.format;
    el.exportEdge.value = state.export.edge;
    el.exportQuality.value = state.export.quality;
    el.filePrefix.value = state.export.prefix;
    updateExportUi();

    el.presetCards.forEach((card) => card.classList.toggle('active', card.dataset.preset === state.watermark.preset));
    el.modeTabs.forEach((tab) => {
      const active = tab.dataset.mode === state.mode;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    el.watermarkTab.setAttribute('aria-controls', 'watermarkPanel');
    el.collageTab.setAttribute('aria-controls', 'collagePanel');
    el.watermarkPanel.hidden = false;
    el.collagePanel.hidden = state.mode !== 'collage';

    el.numberOptions.hidden = !state.collage.numberEnabled;
    el.soldOptions.hidden = !state.collage.soldEnabled;
    el.cornerOptions.hidden = ['tiled','band','gradient'].includes(state.watermark.preset);
    el.tiledOptions.hidden = state.watermark.preset !== 'tiled';
    el.gradientOptions.hidden = state.watermark.preset !== 'gradient';
    el.gradientHeightOptions.hidden = state.watermark.preset !== 'gradient';
    el.bandOptions.hidden = state.watermark.preset !== 'band';

    el.markControls.forEach((control) => {
      const value = getPath(state.marks, control.dataset.mark);
      if (control.type === 'checkbox') control.checked = Boolean(value);
      else if (value !== undefined) control.value = value;
    });

    syncAllRanges();
    syncStageTitle();
    renderMarkModules();
    updateActionAvailability();
  }

  function syncStageTitle() {
    const title = state.mode === 'watermark' ? '单图水印预览' : '目录拼图预览';
    el.stageTitle.textContent = title;
    document.title = state.mode === 'watermark'
      ? 'Kaki Mark Studio · 批量图片水印'
      : 'Kaki Mark Studio · 目录拼图';
  }

  function updateExportUi() {
    const locked = Boolean(state.export.edgeLocked);
    el.exportEdge.disabled = locked;
    el.exportEdgeState.textContent = locked ? '已锁定' : '可修改';
    el.exportEdgeLockBtn.textContent = locked ? '解锁' : '锁定';
    el.exportQualityRow.hidden = state.export.format !== 'jpeg';
  }

  function persistSettings() {
    try {
      const payload = {
        watermark: state.watermark,
        collage: state.collage,
        marks: state.marks,
        export: state.export,
        mode: state.mode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* localStorage may be disabled in private windows */ }
  }

  function restoreSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.watermark && typeof data.watermark === 'object') Object.assign(state.watermark, data.watermark);
      if (data.collage && typeof data.collage === 'object') Object.assign(state.collage, data.collage);
      if (data.marks && typeof data.marks === 'object') {
        if (data.marks.frame) Object.assign(state.marks.frame, data.marks.frame);
        if (data.marks.small) Object.assign(state.marks.small, data.marks.small);
      }
      if (data.export && typeof data.export === 'object') Object.assign(state.export, data.export);
      if (data.mode === 'collage' || data.mode === 'watermark') state.mode = data.mode;
      sanitizeState();
    } catch (_) { /* ignore corrupted old settings */ }
  }

  function sanitizeState() {
    const wm = state.watermark;
    wm.text = String(wm.text ?? WATERMARK_DEFAULTS.text).slice(0, 60);
    wm.size = clamp(numberOr(wm.size, WATERMARK_DEFAULTS.size), 1, 18);
    wm.opacity = clamp(numberOr(wm.opacity, WATERMARK_DEFAULTS.opacity), 5, 100);
    wm.margin = clamp(numberOr(wm.margin, WATERMARK_DEFAULTS.margin), 2, 15);
    wm.rotate = clamp(numberOr(wm.rotate, WATERMARK_DEFAULTS.rotate), -45, 45);
    wm.gap = clamp(numberOr(wm.gap, WATERMARK_DEFAULTS.gap), 8, 48);
    wm.stroke = clamp(numberOr(wm.stroke, WATERMARK_DEFAULTS.stroke), 0, 12);
    wm.gradientStrength = clamp(numberOr(wm.gradientStrength, WATERMARK_DEFAULTS.gradientStrength), 10, 100);
    wm.gradientHeight = clamp(numberOr(wm.gradientHeight, WATERMARK_DEFAULTS.gradientHeight), 15, 75);
    if (PRESET_ALIASES[wm.preset]) wm.preset = PRESET_ALIASES[wm.preset];
    if (!PRESETS[wm.preset]) wm.preset = WATERMARK_DEFAULTS.preset;
    if (!FONT_STACKS[wm.font]) wm.font = WATERMARK_DEFAULTS.font;
    if (!['br','bl','tr','tl','center'].includes(wm.position)) wm.position = WATERMARK_DEFAULTS.position;
    if (!/^#[0-9a-f]{6}$/i.test(wm.color)) wm.color = WATERMARK_DEFAULTS.color;
    if (!/^#[0-9a-f]{6}$/i.test(wm.strokeColor)) wm.strokeColor = WATERMARK_DEFAULTS.strokeColor;
    if (!/^#[0-9a-f]{6}$/i.test(wm.gradientColor)) wm.gradientColor = WATERMARK_DEFAULTS.gradientColor;
    if (!/^#[0-9a-f]{6}$/i.test(wm.bandBackground)) wm.bandBackground = WATERMARK_DEFAULTS.bandBackground;
    wm.bandOpacity = clamp(numberOr(wm.bandOpacity, WATERMARK_DEFAULTS.bandOpacity), 0, 100);
    wm.bandDateEnabled = Boolean(wm.bandDateEnabled);

    const cl = state.collage;
    cl.rows = clamp(Math.round(numberOr(cl.rows, COLLAGE_DEFAULTS.rows)), 1, 8);
    cl.cols = clamp(Math.round(numberOr(cl.cols, COLLAGE_DEFAULTS.cols)), 1, 8);
    cl.gap = clamp(numberOr(cl.gap, COLLAGE_DEFAULTS.gap), 0, 12);
    cl.numberStart = clamp(Math.round(numberOr(cl.numberStart, 1)), 0, 99999);
    cl.numberSize = clamp(numberOr(cl.numberSize, COLLAGE_DEFAULTS.numberSize), 2, 18);
    if (!['auto','1','0.75','0.8','0.5625'].includes(cl.ratio)) cl.ratio = 'auto';
    if (!['br','bl','tr','tl','bc'].includes(cl.numberPosition)) cl.numberPosition = 'br';
    if (!/^#[0-9a-f]{6}$/i.test(cl.background)) cl.background = COLLAGE_DEFAULTS.background;
    cl.soldNumbers = String(cl.soldNumbers ?? '').slice(0, 200);

    sanitizeMarkSettings(state.marks.frame, FRAME_DEFAULTS, {
      scale: [10, 120], opacity: [5, 100], x: [-50, 50], y: [-50, 50],
      shadowOpacity: [0, 100], shadowBlur: [0, 120], shadowX: [-40, 40], shadowY: [-40, 40],
      glowOpacity: [0, 100], glowBlur: [0, 300], strokeWidth: [0.2, 24]
    });
    sanitizeMarkSettings(state.marks.small, SMALL_DEFAULTS, {
      scale: [3, 70], opacity: [5, 100], x: [-45, 45], y: [-45, 45], rotate: [-45, 45],
      shadowOpacity: [0, 100], shadowBlur: [0, 60], shadowX: [-20, 20], shadowY: [-20, 20],
      glowOpacity: [0, 100], glowBlur: [0, 180], strokeWidth: [0.2, 16]
    });
    if (!['tl','tc','tr','ml','mc','mr','bl','bc','br'].includes(state.marks.small.anchor)) {
      state.marks.small.anchor = SMALL_DEFAULTS.anchor;
    }
    if (!['cell','sheet'].includes(state.marks.frame.placement)) state.marks.frame.placement = FRAME_DEFAULTS.placement;
    if (!['cell','sheet'].includes(state.marks.small.placement)) state.marks.small.placement = SMALL_DEFAULTS.placement;

    const ex = state.export;
    ex.format = ['jpeg','png'].includes(String(ex.format)) ? String(ex.format) : EXPORT_DEFAULTS.format;
    ex.edge = ['1600','2400','3200','4000'].includes(String(ex.edge)) ? String(ex.edge) : EXPORT_DEFAULTS.edge;
    ex.edgeLocked = ex.edgeLocked === undefined ? EXPORT_DEFAULTS.edgeLocked : Boolean(ex.edgeLocked);
    ex.quality = clamp(Math.round(numberOr(ex.quality, EXPORT_DEFAULTS.quality)), 70, 100);
    ex.prefix = String(ex.prefix || EXPORT_DEFAULTS.prefix).slice(0, 30);
  }

  function sanitizeMarkSettings(settings, defaults, limits) {
    Object.entries(limits).forEach(([key, [min, max]]) => {
      settings[key] = clamp(numberOr(settings[key], defaults[key]), min, max);
    });
    if (!BLEND_MODES[settings.blend]) settings.blend = defaults.blend;
    ['shadowEnabled','glowEnabled','strokeEnabled','tintEnabled'].forEach((key) => {
      if (!(key in defaults)) return;
      settings[key] = Boolean(settings[key]);
    });
    ['shadowColor','glowColor','strokeColor','tintColor'].forEach((key) => {
      if (!(key in defaults)) return;
      if (!/^#[0-9a-f]{6}$/i.test(settings[key])) settings[key] = defaults[key];
    });
  }

  function resetSettings() {
    state.watermark = { ...WATERMARK_DEFAULTS };
    state.collage = { ...COLLAGE_DEFAULTS };
    state.marks = {
      frame: { ...FRAME_DEFAULTS },
      small: { ...SMALL_DEFAULTS }
    };
    state.export = { ...EXPORT_DEFAULTS };
    applyUiFromState();
    persistSettings();
    toast('已恢复默认设置');
    schedulePreview();
  }

  function applyPreset(name) {
    name = PRESET_ALIASES[name] || name;
    if (!PRESETS[name]) return;
    state.watermark.preset = name;
    Object.assign(state.watermark, PRESETS[name]);
    applyUiFromState();
    persistSettings();
    schedulePreview();
  }

  function setMode(mode) {
    if (!['watermark','collage'].includes(mode)) return;
    state.mode = mode;
    state.activePage = 0;
    applyUiFromState();
    persistSettings();
    renderQueue();
    schedulePreview();
  }

  function fileId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function readImageMeta(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const result = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`无法读取图片：${file.name}`));
      };
      img.src = url;
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (!img.naturalWidth || !img.naturalHeight) {
          reject(new Error('图片尺寸无效'));
          return;
        }
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片格式无法读取'));
      };
      img.src = url;
    });
  }

  async function createAssetRecord(file) {
    const image = await loadImage(file);
    return {
      id: fileId(),
      file,
      name: file.name,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      thumbUrl: URL.createObjectURL(file)
    };
  }

  function releaseAsset(record) {
    if (record?.thumbUrl) URL.revokeObjectURL(record.thumbUrl);
    if (record) record.image = null;
  }

  function releaseAllAssets() {
    state.assets.fullscreen.forEach((layer) => releaseAsset(layer.record));
    state.assets.fullscreen = [];
    releaseAsset(state.assets.frame);
    releaseAsset(state.assets.small);
    state.assets.frame = null;
    state.assets.small = null;
  }

  function validAssetFiles(files) {
    return Array.from(files || []).filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name}：不是图片文件`, 'error');
        return false;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast(`${file.name}：文件超过 60MB`, 'error');
        return false;
      }
      return true;
    });
  }

  async function addFullscreenAssets(files) {
    const incoming = validAssetFiles(files);
    if (!incoming.length) return;
    const room = MAX_FULLSCREEN_LAYERS - state.assets.fullscreen.length;
    if (room <= 0) {
      toast(`全屏水印最多 ${MAX_FULLSCREEN_LAYERS} 层`, 'error');
      return;
    }
    const selected = incoming.slice(0, room);
    const records = [];
    for (const file of selected) {
      try {
        records.push(await createAssetRecord(file));
      } catch (_) {
        toast(`${file.name}：无法读取`, 'error');
      }
    }
    records.forEach((record, index) => {
      state.assets.fullscreen.push({
        id: record.id,
        record,
        opacity: 100,
        blend: 'normal',
        fit: 'cover',
        placement: 'after'
      });
    });
    if (incoming.length > room) toast(`最多保留 ${MAX_FULLSCREEN_LAYERS} 层全屏水印`, 'error');
    renderMarkModules();
    schedulePreview();
  }

  async function setSingleAsset(type, file) {
    if (!file) return;
    if (!validAssetFiles([file]).length) return;
    try {
      const record = await createAssetRecord(file);
      releaseAsset(state.assets[type]);
      state.assets[type] = record;
      renderMarkModules();
      schedulePreview();
    } catch (_) {
      toast(`${file.name}：无法读取`, 'error');
    }
  }

  function removeFullscreenAsset(id) {
    const index = state.assets.fullscreen.findIndex((layer) => layer.id === id);
    if (index < 0) return;
    releaseAsset(state.assets.fullscreen[index].record);
    state.assets.fullscreen.splice(index, 1);
    renderMarkModules();
    schedulePreview();
  }

  function removeSingleAsset(type) {
    releaseAsset(state.assets[type]);
    state.assets[type] = null;
    renderMarkModules();
    schedulePreview();
  }

  function renderMarkModules() {
    el.fullscreenCount.textContent = `${state.assets.fullscreen.length} 层`;

    el.frameStatus.textContent = state.assets.frame ? '已导入' : '未导入';
    el.frameEmpty.hidden = Boolean(state.assets.frame);
    el.frameEditor.hidden = !state.assets.frame;
    if (state.assets.frame) {
      el.frameThumb.src = state.assets.frame.thumbUrl;
      el.frameThumb.alt = state.assets.frame.name;
      el.frameName.textContent = state.assets.frame.name;
    }

    el.smallStatus.textContent = state.assets.small ? '已导入' : '未导入';
    el.smallEmpty.hidden = Boolean(state.assets.small);
    el.smallEditor.hidden = !state.assets.small;
    if (state.assets.small) {
      el.smallThumb.src = state.assets.small.thumbUrl;
      el.smallThumb.alt = state.assets.small.name;
      el.smallName.textContent = state.assets.small.name;
    }

    el.collageMarkPlacements.forEach((node) => {
      node.hidden = state.mode !== 'collage';
    });
    updateEffectVisibility();
    renderFullscreenList();
  }

  function updateEffectVisibility() {
    el.frameShadowControls.hidden = !state.marks.frame.shadowEnabled;
    el.frameGlowControls.hidden = !state.marks.frame.glowEnabled;
    el.frameStrokeControls.hidden = !state.marks.frame.strokeEnabled;
    el.smallShadowControls.hidden = !state.marks.small.shadowEnabled;
    el.smallGlowControls.hidden = !state.marks.small.glowEnabled;
    el.smallStrokeControls.hidden = !state.marks.small.strokeEnabled;
  }

  function makeOption(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }

  function renderFullscreenList() {
    el.fullscreenList.innerHTML = '';
    if (!state.assets.fullscreen.length) {
      const empty = document.createElement('div');
      empty.className = 'layer-empty';
      empty.textContent = '尚未导入全屏水印';
      el.fullscreenList.appendChild(empty);
      return;
    }

    state.assets.fullscreen.forEach((layer, index) => {
      const card = document.createElement('article');
      card.className = 'layer-card';

      const head = document.createElement('div');
      head.className = 'layer-head';
      const thumb = document.createElement('span');
      thumb.className = 'layer-thumb';
      const thumbImg = document.createElement('img');
      thumbImg.src = layer.record.thumbUrl;
      thumbImg.alt = '';
      thumb.appendChild(thumbImg);
      const name = document.createElement('div');
      name.className = 'layer-name';
      const title = document.createElement('strong');
      title.textContent = `第 ${index + 1} 层 · ${layer.record.name}`;
      const detail = document.createElement('small');
      detail.textContent = `${layer.record.width} × ${layer.record.height}`;
      name.append(title, detail);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'layer-remove';
      remove.title = '移除这一层';
      remove.setAttribute('aria-label', `移除 ${layer.record.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => removeFullscreenAsset(layer.id));
      head.append(thumb, name, remove);

      const controls = document.createElement('div');
      controls.className = 'layer-controls';

      const opacityBox = document.createElement('div');
      opacityBox.className = 'layer-control';
      const opacityLabel = document.createElement('label');
      opacityLabel.htmlFor = `layer-opacity-${layer.id}`;
      opacityLabel.textContent = '不透明度';
      const opacityOut = document.createElement('output');
      opacityOut.textContent = `${layer.opacity}%`;
      opacityLabel.appendChild(opacityOut);
      const opacity = document.createElement('input');
      opacity.type = 'range';
      opacity.id = `layer-opacity-${layer.id}`;
      opacity.min = '0';
      opacity.max = '100';
      opacity.step = '1';
      opacity.value = String(layer.opacity);
      syncRange(opacity, opacityOut);
      opacity.addEventListener('input', () => {
        layer.opacity = numberOr(opacity.value, 40);
        syncRange(opacity, opacityOut);
        schedulePreview();
      });
      opacityBox.append(opacityLabel, opacity);

      const blendBox = document.createElement('div');
      blendBox.className = 'layer-control';
      const blendLabel = document.createElement('label');
      blendLabel.textContent = '混合模式';
      const blend = document.createElement('select');
      [
        ['normal','正常'], ['soft-light','柔光'], ['screen','滤色'], ['multiply','正片叠底'],
        ['overlay','叠加'], ['lighten','变亮'], ['darken','变暗']
      ].forEach(([value, label]) => blend.appendChild(makeOption(value, label)));
      blend.value = layer.blend;
      blend.addEventListener('change', () => {
        layer.blend = FULLSCREEN_BLENDS.includes(blend.value) ? blend.value : 'normal';
        schedulePreview();
      });
      blendBox.append(blendLabel, blend);

      const fitBox = document.createElement('div');
      fitBox.className = 'layer-control';
      const fitLabel = document.createElement('label');
      fitLabel.textContent = '铺放方式';
      const fit = document.createElement('select');
      [['cover','铺满画面'],['contain','完整显示'],['tile','平铺重复']].forEach(([value, label]) => fit.appendChild(makeOption(value, label)));
      fit.value = layer.fit;
      fit.addEventListener('change', () => {
        layer.fit = ['cover','contain','tile'].includes(fit.value) ? fit.value : 'cover';
        schedulePreview();
      });
      fitBox.append(fitLabel, fit);

      controls.append(opacityBox, blendBox, fitBox);
      if (state.mode === 'collage') {
        const placeBox = document.createElement('div');
        placeBox.className = 'layer-control wide';
        const placeLabel = document.createElement('label');
        placeLabel.textContent = '与拼图的关系';
        const place = document.createElement('select');
        [['before','拼图前叠加'],['after','拼图后叠加']].forEach(([value, label]) => place.appendChild(makeOption(value, label)));
        place.value = layer.placement;
        place.addEventListener('change', () => {
          layer.placement = place.value === 'before' ? 'before' : 'after';
          schedulePreview();
        });
        placeBox.append(placeLabel, place);
        controls.appendChild(placeBox);
      }

      card.append(head, controls);
      el.fullscreenList.appendChild(card);
    });
  }

  async function addFiles(fileList) {
    if (state.busy) {
      toast('请等待当前导出任务结束');
      return;
    }
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    const rejected = [];
    const room = MAX_FILES - state.files.length;
    for (const file of incoming) {
      if (accepted.length >= room) {
        rejected.push(`${file.name}：超过 ${MAX_FILES} 张上限`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name}：不是图片`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name}：文件超过 60MB`);
        continue;
      }
      accepted.push(file);
    }

    if (!accepted.length) {
      toast(rejected[0] || '没有可导入的图片', 'error');
      return;
    }

    el.dropZone.classList.add('is-loading');
    el.dropZone.setAttribute('aria-busy', 'true');
    const loaded = [];
    for (const file of accepted) {
      try {
        const meta = await readImageMeta(file);
        loaded.push({
          id: fileId(),
          file,
          name: file.name,
          width: meta.width,
          height: meta.height,
          thumbUrl: URL.createObjectURL(file)
        });
      } catch (_) {
        rejected.push(`${file.name}：无法读取`);
      }
    }
    state.files.push(...loaded);
    state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
    el.dropZone.classList.remove('is-loading');
    el.dropZone.removeAttribute('aria-busy');

    if (loaded.length) toast(`已加入 ${loaded.length} 张图片`);
    if (rejected.length) toast(rejected.slice(0, 2).join('；'), 'error');
  }

  function removeFile(id) {
    const index = state.files.findIndex((f) => f.id === id);
    if (index < 0) return;
    const [removed] = state.files.splice(index, 1);
    if (removed.thumbUrl) URL.revokeObjectURL(removed.thumbUrl);
    state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
  }

  function clearFiles() {
    if (!state.files.length) return;
    if (!window.confirm(`确定清空这 ${state.files.length} 张图片吗？原始文件不会被删除。`)) return;
    state.files.forEach((f) => f.thumbUrl && URL.revokeObjectURL(f.thumbUrl));
    state.files = [];
    state.activePage = 0;
    renderQueue();
    syncStageTitle();
    updateActionAvailability();
    schedulePreview();
    toast('作品队列已清空');
  }

  function renderQueue() {
    const hasFiles = state.files.length > 0;
    el.queueView.hidden = !hasFiles;
    el.queueStrip.innerHTML = '';
    if (!hasFiles) {
      el.libraryMeta.textContent = '尚未导入图片';
      return;
    }
    el.libraryMeta.textContent = `${state.files.length} 张 · 合计 ${formatBytes(state.files.reduce((sum, f) => sum + f.file.size, 0))}`;

    const activeImageIndex = state.mode === 'collage'
      ? clamp(state.activePage * perPage(), 0, state.files.length - 1)
      : clamp(state.activePage, 0, state.files.length - 1);

    state.files.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'queue-item';
      item.draggable = true;
      item.dataset.id = file.id;
      item.title = `${file.name} · ${file.width}×${file.height}`;
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', `选择第 ${index + 1} 张 ${file.name}`);
      const img = document.createElement('img');
      img.src = file.thumbUrl;
      img.alt = '';
      img.loading = 'lazy';
      const badge = document.createElement('span');
      badge.textContent = pad(index + 1);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'queue-remove';
      remove.title = `移除 ${file.name}`;
      remove.setAttribute('aria-label', `移除 ${file.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeFile(file.id);
      });
      item.append(img, badge, remove);
      item.addEventListener('click', () => selectImage(index));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectImage(index);
        }
      });
      bindDragSort(item);
      if (index === activeImageIndex) item.classList.add('active');
      el.queueStrip.appendChild(item);
    });
  }

  function selectImage(index) {
    if (!state.files[index]) return;
    state.activePage = state.mode === 'collage' ? Math.floor(index / perPage()) : index;
    renderQueue();
    updatePager();
    schedulePreview();
  }

  let draggedId = null;
  function bindDragSort(item) {
    item.addEventListener('dragstart', (event) => {
      draggedId = item.dataset.id;
      item.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', draggedId); } catch (_) {}
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.queue-item.drop-target').forEach((node) => node.classList.remove('drop-target'));
      draggedId = null;
    });
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (item.dataset.id !== draggedId) item.classList.add('drop-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drop-target');
      const targetId = item.dataset.id;
      const sourceId = draggedId || event.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === targetId) return;
      const from = state.files.findIndex((f) => f.id === sourceId);
      const to = state.files.findIndex((f) => f.id === targetId);
      if (from < 0 || to < 0) return;
      const [moved] = state.files.splice(from, 1);
      state.files.splice(to, 0, moved);
      renderQueue();
      schedulePreview();
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function perPage() {
    return clamp(Math.round(state.collage.rows), 1, 8) * clamp(Math.round(state.collage.cols), 1, 8);
  }

  function pageCount() {
    if (!state.files.length) return 0;
    return state.mode === 'collage' ? Math.ceil(state.files.length / perPage()) : state.files.length;
  }

  function updatePager() {
    const count = pageCount();
    if (!count) {
      el.pagerLabel.textContent = '0 / 0';
      el.prevBtn.disabled = true;
      el.nextBtn.disabled = true;
      return;
    }
    state.activePage = clamp(state.activePage, 0, count - 1);
    el.pagerLabel.textContent = `${state.activePage + 1} / ${count}`;
    el.prevBtn.disabled = state.activePage <= 0;
    el.nextBtn.disabled = state.activePage >= count - 1;
  }

  function updateActionAvailability() {
    const has = state.files.length > 0;
    el.downloadCurrentBtn.disabled = !has || state.busy;
    el.exportAllBtn.disabled = !has || state.busy;
    el.previewAllBtn.disabled = !has || state.busy;
    el.exportAllLabel.textContent = state.mode === 'watermark' ? '批量导出 ZIP' : '打包全部页面';
    el.emptyState.hidden = has;
    el.previewCanvas.hidden = !has;
    updatePager();
  }

  function goPage(delta) {
    const count = pageCount();
    if (!count) return;
    state.activePage = clamp(state.activePage + delta, 0, count - 1);
    renderQueue();
    updatePager();
    schedulePreview();
  }

  function schedulePreview() {
    clearResultGallery();
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      renderPreview().catch((error) => {
        console.error(error);
        toast('预览生成失败，请重新导入图片', 'error');
      });
    }, 70);
  }

  function resolveWatermarkText(template, index) {
    const number = state.collage.numberStart + index;
    return String(template || '').replace(/\{n\}/gi, String(number)).replace(/\{nn\}/gi, pad(number));
  }

  function fitFontSize(ctx, text, baseSize, maxWidth) {
    let size = baseSize;
    ctx.font = `600 ${size}px ${FONT_STACKS[state.watermark.font] || FONT_STACKS.sans}`;
    const width = ctx.measureText(text).width;
    if (width > maxWidth && width > 0) size *= maxWidth / width;
    return Math.max(8, size);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawText(ctx, text, x, y, size, align = 'left', baseline = 'middle', alpha = 1) {
    const wm = state.watermark;
    ctx.save();
    ctx.font = `600 ${size}px ${FONT_STACKS[wm.font] || FONT_STACKS.sans}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = (wm.opacity / 100) * alpha;
    if (wm.stroke > 0) {
      ctx.strokeStyle = wm.strokeColor;
      ctx.lineWidth = Math.max(0.5, size * (wm.stroke / 100) * 1.8);
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = wm.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawWatermark(ctx, boxW, boxH, number, options = {}) {
    const wm = state.watermark;
    const preset = options.preset || wm.preset;
    const dims = options.dims || { x: 0, y: 0, w: boxW, h: boxH };
    const minDim = Math.min(boxW, boxH);
    const text = resolveWatermarkText(wm.text, number).trim();
    const showDate = preset === 'band' && wm.bandDateEnabled;
    if (!text && !showDate) return;
    const margin = minDim * (wm.margin / 100);
    const baseSize = minDim * (wm.size / 100);

    ctx.save();
    if (options.clip) {
      roundedRect(ctx, dims.x, dims.y, dims.w, dims.h, options.radius || 0);
      ctx.clip();
    }
    ctx.translate(dims.x, dims.y);

    if (preset === 'tiled') {
      const size = fitFontSize(ctx, text, baseSize, boxW * 0.5);
      const spacing = size * (wm.gap / 10);
      const angle = wm.rotate * Math.PI / 180;
      const diagonal = Math.hypot(boxW, boxH);
      const startX = boxW / 2 - diagonal / 2;
      const startY = boxH / 2 - diagonal / 2;
      const cols = Math.ceil(diagonal / Math.max(1, spacing)) + 4;
      const rows = Math.ceil(diagonal / Math.max(1, spacing * 0.62)) + 4;
      ctx.translate(boxW / 2, boxH / 2);
      ctx.rotate(angle);
      ctx.translate(-boxW / 2, -boxH / 2);
      ctx.font = `600 ${size}px ${FONT_STACKS[wm.font] || FONT_STACKS.sans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const measured = ctx.measureText(text).width;
      const stepX = Math.max(spacing, measured + size * 1.6);
      const stepY = Math.max(size * 3.5, size * (wm.gap / 6));
      const start = -boxW * 1.1;
      const endX = boxW * 2.1;
      const endY = boxH * 2.1;
      for (let y = -boxH * 0.7, row = 0; y < endY; y += stepY, row++) {
        const offset = row % 2 ? stepX / 2 : 0;
        for (let x = start - offset; x < endX; x += stepX) {
          if ((x + y) > -diagonal && (x + y) < diagonal * 2.2) {
            drawText(ctx, text, x, y, size, 'left', 'middle');
          }
        }
      }
    } else if (preset === 'gradient') {
      const gradientHeight = boxH * (wm.gradientHeight / 100);
      const top = boxH - gradientHeight;
      const strength = clamp(wm.gradientStrength / 100, 0, 1);
      const gradient = ctx.createLinearGradient(0, top, 0, boxH);
      gradient.addColorStop(0, hexToRgba(wm.gradientColor, 0));
      gradient.addColorStop(0.5, hexToRgba(wm.gradientColor, strength * 0.3));
      gradient.addColorStop(1, hexToRgba(wm.gradientColor, strength * 0.96));
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, top, boxW, gradientHeight);
      ctx.restore();

      const maxWidth = boxW - margin * 2;
      const ghostSize = fitFontSize(ctx, text, minDim * 0.18, maxWidth * 0.96);
      const size = fitFontSize(ctx, text, baseSize, maxWidth * 0.82);
      const signatureY = boxH - Math.max(size * 1.45, minDim * 0.075);
      const ghostY = signatureY - ghostSize * 0.28;
      drawText(ctx, text, boxW / 2, ghostY, ghostSize, 'center', 'middle', 0.17);
      ctx.save();
      ctx.shadowColor = hexToRgba(wm.gradientColor, 0.55);
      ctx.shadowBlur = minDim * 0.025;
      drawText(ctx, text, boxW / 2, signatureY, size, 'center', 'middle');
      ctx.restore();
    } else if (preset === 'band') {
      const bandH = Math.max(baseSize * 2.75, boxH * 0.085);
      const bandY = boxH - bandH;
      const dateLabel = showDate ? currentDateLabel() : '';
      const dateSize = Math.max(8, bandH * 0.2);
      ctx.save();
      ctx.font = `600 ${dateSize}px ${FONT_STACKS[wm.font] || FONT_STACKS.sans}`;
      const dateWidth = dateLabel ? ctx.measureText(dateLabel).width : 0;
      ctx.restore();
      ctx.save();
      ctx.fillStyle = hexToRgba(wm.bandBackground, wm.bandOpacity / 100);
      ctx.fillRect(0, bandY, boxW, bandH);
      if (text) {
        const maxTextWidth = boxW - margin * 2 - (dateLabel ? dateWidth + margin : 0);
        const size = fitFontSize(ctx, text, baseSize, maxTextWidth);
        drawText(ctx, text, margin, bandY + bandH / 2, size * 0.92, 'left', 'middle');
      }
      if (dateLabel) {
        drawText(ctx, dateLabel, boxW - margin, bandY + bandH / 2, dateSize, 'right', 'middle', 0.9);
      }
      ctx.restore();
    } else {
      const maxWidth = boxW - margin * 2;
      const size = fitFontSize(ctx, text, baseSize, maxWidth);
      const pos = wm.position;
      let x = margin;
      let y = margin;
      let align = 'left';
      let baseline = 'top';
      if (pos === 'br') { x = boxW - margin; y = boxH - margin; align = 'right'; baseline = 'bottom'; }
      else if (pos === 'bl') { x = margin; y = boxH - margin; baseline = 'bottom'; }
      else if (pos === 'tr') { x = boxW - margin; y = margin; align = 'right'; }
      else if (pos === 'center') { x = boxW / 2; y = boxH / 2; align = 'center'; baseline = 'middle'; }
      drawText(ctx, text, x, y, size, align, baseline);
    }
    ctx.restore();
  }

  function drawContain(ctx, img, x, y, w, h) {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function drawCover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const sourceAspect = iw / ih;
    const targetAspect = w / h;
    let sx, sy, sw, sh;
    if (sourceAspect > targetAspect) {
      sh = ih;
      sw = ih * targetAspect;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = iw / targetAspect;
      sx = 0;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  function drawTiledImage(ctx, img, x, y, w, h, opacity) {
    const tileW = Math.max(1, w * 0.28);
    const tileH = tileW * (img.naturalHeight / Math.max(1, img.naturalWidth));
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let ty = y; ty < y + h; ty += tileH) {
      for (let tx = x; tx < x + w; tx += tileW) {
        ctx.drawImage(img, tx, ty, tileW, tileH);
      }
    }
    ctx.restore();
  }

  function drawFullscreenLayers(ctx, x, y, w, h, placement) {
    state.assets.fullscreen.forEach((layer) => {
      if (state.mode === 'collage' && placement && layer.placement !== placement) return;
      if (!layer.record?.image) return;
      const img = layer.record.image;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.globalAlpha = clamp(layer.opacity, 0, 100) / 100;
      ctx.globalCompositeOperation = BLEND_MODES[layer.blend] || 'source-over';
      if (layer.fit === 'contain') {
        drawContain(ctx, img, x, y, w, h);
      } else if (layer.fit === 'tile') {
        drawTiledImage(ctx, img, x, y, w, h, 1);
      } else {
        drawCover(ctx, img, x, y, w, h);
      }
      ctx.restore();
    });
  }

  function tintedMask(img, color, drawW, drawH, padding) {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2200 / Math.max(drawW + padding * 2, drawH + padding * 2));
    canvas.width = Math.max(1, Math.ceil((drawW + padding * 2) * scale));
    canvas.height = Math.max(1, Math.ceil((drawH + padding * 2) * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, padding * scale, padding * scale, drawW * scale, drawH * scale);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return { canvas, scale, padding };
  }

  function drawMaskBlur(ctx, img, color, alpha, blurPx, dw, dh) {
    if (alpha <= 0 || blurPx <= 0) return;
    const padding = Math.ceil(blurPx * 2.2);
    const mask = tintedMask(img, color, dw, dh, padding);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.filter = `blur(${Math.max(0.1, blurPx * mask.scale)}px)`;
    const width = dw + padding * 2;
    const height = dh + padding * 2;
    ctx.drawImage(mask.canvas, -dw / 2 - padding, -dh / 2 - padding, width, height);
    ctx.restore();
  }

  function edt1d(f, d, n) {
    if (n <= 0) return;
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let first = -1;
    for (let i = 0; i < n; i++) {
      if (Number.isFinite(f[i])) {
        first = i;
        break;
      }
    }
    if (first < 0) {
      d.fill(Infinity, 0, n);
      return;
    }
    let k = 0;
    v[0] = first;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = first + 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const delta = q - v[k];
      d[q] = delta * delta + f[v[k]];
    }
  }

  function distanceTransformFromAlpha(alpha, width, height) {
    const data = new Float64Array(width * height);
    let hasMark = false;
    for (let i = 0; i < data.length; i++) {
      if (alpha[i] > 2) {
        data[i] = 0;
        hasMark = true;
      } else {
        data[i] = Infinity;
      }
    }
    if (!hasMark) return null;
    const length = Math.max(width, height);
    const f = new Float64Array(length);
    const d = new Float64Array(length);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) f[y] = data[x + y * width];
      edt1d(f, d, height);
      for (let y = 0; y < height; y++) data[x + y * width] = d[y];
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) f[x] = data[x + y * width];
      edt1d(f, d, width);
      for (let x = 0; x < width; x++) data[x + y * width] = d[x];
    }
    return data;
  }

  function deriveForegroundAlpha(image, width, height) {
    const pixels = image.data;
    const total = width * height;
    let fullyTransparentPixels = 0;
    for (let i = 0; i < total; i++) {
      if (pixels[i * 4 + 3] < 12) fullyTransparentPixels++;
    }
    const alpha = new Uint8Array(total);
    if (fullyTransparentPixels > total * 0.03) {
      for (let i = 0; i < total; i++) alpha[i] = pixels[i * 4 + 3];
      return alpha;
    }

    const histogram = new Uint32Array(64);
    let modeBin = 0;
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const luminance = Math.round(0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]);
      const bin = clamp(Math.floor(luminance / 4), 0, 63);
      histogram[bin]++;
      if (histogram[bin] > histogram[modeBin]) modeBin = bin;
    }
    const backgroundLuminance = modeBin * 4 + 2;
    const contrastRange = Math.max(28, backgroundLuminance > 127 ? backgroundLuminance : 255 - backgroundLuminance);
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      const luminance = 0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2];
      alpha[i] = Math.round(clamp((Math.abs(luminance - backgroundLuminance) - 4) / (contrastRange * 0.8), 0, 1) * 255);
    }
    return alpha;
  }

  const recolorCache = new WeakMap();
  function recoloredImage(img, color) {
    const cached = recolorCache.get(img);
    if (cached?.has(color)) return cached.get(color);
    const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = deriveForegroundAlpha(source, canvas.width, canvas.height);
    const rgb = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1) : 'ffffff';
    const red = parseInt(rgb.slice(0, 2), 16);
    const green = parseInt(rgb.slice(2, 4), 16);
    const blue = parseInt(rgb.slice(4, 6), 16);
    const output = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < alpha.length; i++) {
      const p = i * 4;
      output.data[p] = red;
      output.data[p + 1] = green;
      output.data[p + 2] = blue;
      output.data[p + 3] = alpha[i];
    }
    ctx.putImageData(output, 0, 0);
    const entries = cached || new Map();
    entries.set(color, canvas);
    if (!cached) recolorCache.set(img, entries);
    return canvas;
  }

  function createSilhouette(img, drawW, drawH, padding, radiusPx, maxDimension = 1600) {
    const scale = Math.min(1, maxDimension / Math.max(1, drawW + padding * 2, drawH + padding * 2));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((drawW + padding * 2) * scale));
    canvas.height = Math.max(1, Math.ceil((drawH + padding * 2) * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, padding * scale, padding * scale, drawW * scale, drawH * scale);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const alpha = deriveForegroundAlpha(image, canvas.width, canvas.height);
    const distances = distanceTransformFromAlpha(alpha, canvas.width, canvas.height);
    if (!distances) return { canvas, scale, padding };
    const radius = Math.max(0, radiusPx * scale);
    const feather = Math.max(1, 1.35 * scale);
    const output = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < distances.length; i++) {
      const coverage = clamp((radius + feather - Math.sqrt(distances[i])) / feather, 0, 1);
      const p = i * 4;
      output.data[p] = 255;
      output.data[p + 1] = 255;
      output.data[p + 2] = 255;
      output.data[p + 3] = Math.round(coverage * 255);
    }
    ctx.putImageData(output, 0, 0);
    return { canvas, scale, padding };
  }

  function drawMaskStroke(ctx, img, color, widthPx, dw, dh) {
    if (widthPx <= 0) return;
    const padding = Math.ceil(widthPx + 3);
    const silhouette = createSilhouette(img, dw, dh, padding, widthPx);
    const tinted = document.createElement('canvas');
    tinted.width = silhouette.canvas.width;
    tinted.height = silhouette.canvas.height;
    const tintedCtx = tinted.getContext('2d');
    tintedCtx.drawImage(silhouette.canvas, 0, 0);
    tintedCtx.globalCompositeOperation = 'source-in';
    tintedCtx.fillStyle = color;
    tintedCtx.fillRect(0, 0, tinted.width, tinted.height);
    ctx.save();
    ctx.drawImage(tinted, -dw / 2 - padding, -dh / 2 - padding, dw + padding * 2, dh + padding * 2);
    ctx.restore();
  }

  function drawCompositeAsset(ctx, img, boxW, boxH, settings, kind) {
    if (!img) return;
    const renderImg = kind === 'frame' && settings.tintEnabled
      ? recoloredImage(img, settings.tintColor)
      : img;
    const sourceW = img.naturalWidth;
    const sourceH = img.naturalHeight;
    let dw;
    let dh;
    if (kind === 'frame') {
      const fit = Math.min(boxW / sourceW, boxH / sourceH) * (settings.scale / 100);
      dw = sourceW * fit;
      dh = sourceH * fit;
    } else {
      const fit = (Math.min(boxW, boxH) * (settings.scale / 100)) / Math.max(sourceW, sourceH);
      dw = sourceW * fit;
      dh = sourceH * fit;
    }

    const anchor = kind === 'frame' ? 'mc' : settings.anchor;
    const offsetX = boxW * (settings.x / 100);
    const offsetY = boxH * (settings.y / 100);
    let cx = boxW / 2 + offsetX;
    let cy = boxH / 2 + offsetY;
    if (anchor.includes('l')) cx = offsetX + dw / 2;
    if (anchor.includes('r')) cx = boxW - offsetX - dw / 2;
    if (anchor.startsWith('t')) cy = offsetY + dh / 2;
    if (anchor.startsWith('b')) cy = boxH - offsetY - dh / 2;

    const effectScale = clamp(Math.min(boxW, boxH) / 1200, 0.35, 5);
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === 'small') ctx.rotate((settings.rotate || 0) * Math.PI / 180);

    if (settings.glowEnabled) {
      drawMaskBlur(
        ctx,
        renderImg,
        settings.glowColor,
        settings.glowOpacity / 100,
        settings.glowBlur * effectScale,
        dw,
        dh
      );
    }
    if (settings.strokeEnabled) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      drawMaskStroke(ctx, renderImg, settings.strokeColor, settings.strokeWidth * effectScale, dw, dh);
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = clamp(settings.opacity, 0, 100) / 100;
    ctx.globalCompositeOperation = BLEND_MODES[settings.blend] || 'source-over';
    if (settings.shadowEnabled) {
      ctx.shadowColor = hexToRgba(settings.shadowColor, settings.shadowOpacity / 100);
      ctx.shadowBlur = settings.shadowBlur * effectScale;
      ctx.shadowOffsetX = settings.shadowX * effectScale;
      ctx.shadowOffsetY = settings.shadowY * effectScale;
    }
    ctx.drawImage(renderImg, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    ctx.restore();
  }

  function drawImportedMarks(ctx, boxW, boxH) {
    drawCompositeAsset(ctx, state.assets.frame?.image, boxW, boxH, state.marks.frame, 'frame');
    drawCompositeAsset(ctx, state.assets.small?.image, boxW, boxH, state.marks.small, 'small');
  }

  function watermarkLongEdge(img) {
    const scale = Math.min(1, PREVIEW_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    return {
      width: Math.max(1, Math.round(img.naturalWidth * scale)),
      height: Math.max(1, Math.round(img.naturalHeight * scale))
    };
  }

  async function renderWatermarkToCanvas(canvas, record, index, maxEdge) {
    const img = await loadImage(record.file);
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    drawContain(ctx, img, 0, 0, width, height);
    drawFullscreenLayers(ctx, 0, 0, width, height);
    drawWatermark(ctx, width, height, index);
    drawImportedMarks(ctx, width, height);
    return { width, height };
  }

  function collageRatioValue() {
    if (state.collage.ratio === 'auto') {
      const first = state.files[0];
      if (!first) return 0.8;
      return clamp(first.width / first.height, 0.35, 2.4);
    }
    return numberOr(state.collage.ratio, 0.8);
  }

  function parseSoldNumbers(raw) {
    const sold = new Set();
    const normalized = String(raw || '').replace(/，|、|。|;/g, ',').replace(/[—–~～]/g, '-');
    normalized.split(',').forEach((part) => {
      const token = part.trim();
      if (!token) return;
      const range = token.split('-').map((v) => Number(v.trim()));
      if (range.length === 2 && Number.isFinite(range[0]) && Number.isFinite(range[1])) {
        const a = Math.round(Math.min(range[0], range[1]));
        const b = Math.round(Math.max(range[0], range[1]));
        if (b - a <= 50000) for (let n = a; n <= b; n++) sold.add(n);
      } else {
        const n = Number(token);
        if (Number.isFinite(n)) sold.add(Math.round(n));
      }
    });
    return sold;
  }

  function isSold(itemNumber) {
    const raw = state.collage.soldNumbers.trim();
    if (!state.collage.soldEnabled || !raw) return false;
    const sold = parseSoldNumbers(raw);
    return state.collage.remainingMode ? !sold.has(itemNumber) : sold.has(itemNumber);
  }

  function soldOverlay(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(23,22,19,.73)';
    ctx.fillRect(x, y, w, h);
    const size = Math.min(w, h) * 0.085;
    ctx.font = `600 ${size}px ${FONT_STACKS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(250,248,240,.92)';
    ctx.fillText('SOLD OUT', x + w / 2, y + h / 2);
    ctx.restore();
  }

  function drawItemNumber(ctx, number, x, y, w, h) {
    const size = Math.min(w, h) * (state.collage.numberSize / 100);
    const padding = Math.min(w, h) * 0.035;
    const pos = state.collage.numberPosition;
    if (pos === 'bc') {
      ctx.save();
      ctx.font = `600 ${size}px ${FONT_STACKS.sans}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeText(String(number), x + w / 2, y + h - padding);
      ctx.fillStyle = 'rgba(255,255,255,.96)';
      ctx.fillText(String(number), x + w / 2, y + h - padding);
      ctx.restore();
      return;
    }
    const align = pos === 'tr' || pos === 'br' ? 'right' : 'left';
    const baseline = pos === 'bl' || pos === 'br' ? 'bottom' : 'top';
    const tx = align === 'right' ? x + w - padding : x + padding;
    const ty = baseline === 'bottom' ? y + h - padding : y + padding;
    ctx.save();
    ctx.font = `600 ${size}px ${FONT_STACKS.sans}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, size * 0.14);
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.strokeText(String(number), tx, ty);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.fillText(String(number), tx, ty);
    ctx.restore();
  }

  function collageBaseMetrics() {
    const cols = clamp(Math.round(state.collage.cols), 1, 8);
    const rows = clamp(Math.round(state.collage.rows), 1, 8);
    const cellW = 800;
    const ratio = collageRatioValue();
    const cellH = cellW / Math.max(0.1, ratio);
    const gap = cellW * (state.collage.gap / 100);
    return {
      cols, rows, cellW, cellH, gap,
      width: cols * cellW + (cols + 1) * gap,
      height: rows * cellH + (rows + 1) * gap
    };
  }

  async function renderCollagePage(canvas, pageIndex, maxEdge) {
    const base = collageBaseMetrics();
    const scale = Math.min(1, maxEdge / Math.max(base.width, base.height));
    const width = Math.max(1, Math.round(base.width * scale));
    const height = Math.max(1, Math.round(base.height * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = state.collage.background;
    ctx.fillRect(0, 0, base.width, base.height);
    const start = pageIndex * perPage();
    const visible = state.files.slice(start, start + perPage());
    for (let slot = 0; slot < perPage(); slot++) {
      const col = slot % base.cols;
      const row = Math.floor(slot / base.cols);
      const x = base.gap + col * (base.cellW + base.gap);
      const y = base.gap + row * (base.cellH + base.gap);
      const record = visible[slot];
      if (!record) {
        ctx.save();
        roundedRect(ctx, x, y, base.cellW, base.cellH, base.cellW * 0.012);
        ctx.fillStyle = 'rgba(40,38,30,.045)';
        ctx.fill();
        ctx.restore();
        continue;
      }
      const img = await loadImage(record.file);
      ctx.save();
      roundedRect(ctx, x, y, base.cellW, base.cellH, base.cellW * 0.012);
      ctx.clip();
      drawCover(ctx, img, x, y, base.cellW, base.cellH);
      drawFullscreenLayers(ctx, x, y, base.cellW, base.cellH, 'before');
      if (state.marks.frame.placement === 'cell') {
        drawCompositeAsset(ctx, state.assets.frame?.image, base.cellW, base.cellH, state.marks.frame, 'frame');
      }
      if (state.marks.small.placement === 'cell') {
        drawCompositeAsset(ctx, state.assets.small?.image, base.cellW, base.cellH, state.marks.small, 'small');
      }
      const number = state.collage.numberStart + start + slot;
      if (isSold(number)) soldOverlay(ctx, x, y, base.cellW, base.cellH);
      if (state.collage.cellMarkEnabled) {
        drawWatermark(ctx, base.cellW, base.cellH, start + slot, {
          preset: state.watermark.preset === 'tiled' ? 'corner' : state.watermark.preset,
          dims: { x, y, w: base.cellW, h: base.cellH },
          clip: true,
          radius: base.cellW * 0.012
        });
      }
      if (state.collage.numberEnabled) drawItemNumber(ctx, number, x, y, base.cellW, base.cellH);
      ctx.restore();
    }
    drawFullscreenLayers(ctx, 0, 0, base.width, base.height, 'after');
    if (state.marks.frame.placement === 'sheet') {
      drawCompositeAsset(ctx, state.assets.frame?.image, base.width, base.height, state.marks.frame, 'frame');
    }
    if (state.marks.small.placement === 'sheet') {
      drawCompositeAsset(ctx, state.assets.small?.image, base.width, base.height, state.marks.small, 'small');
    }
    ctx.restore();
    return { width, height };
  }

  async function renderPreview() {
    if (!state.files.length) {
      el.emptyState.hidden = false;
      el.previewCanvas.hidden = true;
      el.previewMeta.textContent = '等待图片';
      syncStageTitle();
      return;
    }
    const token = ++state.previewToken;
    const page = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
    if (state.mode === 'watermark') {
      const record = state.files[page];
      if (!record) return;
      const dims = await renderWatermarkToCanvas(el.previewCanvas, record, page, PREVIEW_EDGE);
      if (token !== state.previewToken) return;
      el.previewMeta.textContent = `${dims.width} × ${dims.height} · ${record.name}`;
    } else {
      const dims = await renderCollagePage(el.previewCanvas, page, PREVIEW_EDGE);
      if (token !== state.previewToken) return;
      el.previewMeta.textContent = `第 ${page + 1} / ${pageCount()} 页 · ${dims.width} × ${dims.height}`;
    }
    el.emptyState.hidden = true;
    el.previewCanvas.hidden = false;
    fitPreviewDisplay();
    syncStageTitle();
    updatePager();
  }

  function fitPreviewDisplay() {
    if (el.previewCanvas.hidden || !el.previewCanvas.width) return;
    const surface = el.previewSurface;
    const style = getComputedStyle(surface);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const availW = Math.max(80, surface.clientWidth - padX);
    const availHClass = surface.clientHeight - padY;
    const availH = Math.max(window.innerWidth <= 760 ? 220 : 260, availHClass);
    const aspect = el.previewCanvas.width / el.previewCanvas.height;
    let w = availW;
    let h = w / aspect;
    if (h > availH) {
      h = availH;
      w = h * aspect;
    }
    el.previewCanvas.style.width = `${Math.floor(w)}px`;
    el.previewCanvas.style.height = `${Math.floor(h)}px`;
  }

  function safePrefix() {
    const cleaned = String(state.export.prefix || 'kaki').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
    return cleaned || 'kaki';
  }

  function outputFilename(pageIndex) {
    const prefix = safePrefix();
    const extension = state.export.format === 'png' ? 'png' : 'jpg';
    return state.mode === 'watermark'
      ? `${prefix}-${pad(pageIndex + 1, 3)}.${extension}`
      : `${prefix}-sheet-${pad(pageIndex + 1, 2)}.${extension}`;
  }

  async function createOutputCanvasForPage(pageIndex) {
    const canvas = document.createElement('canvas');
    const maxEdge = numberOr(state.export.edge, 2400);
    if (state.mode === 'watermark') {
      await renderWatermarkToCanvas(canvas, state.files[pageIndex], pageIndex, maxEdge);
    } else {
      await renderCollagePage(canvas, pageIndex, maxEdge);
    }
    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      const isPng = state.export.format === 'png';
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('浏览器无法导出该图片'));
      }, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : state.export.quality / 100);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function setBusy(busy) {
    state.busy = busy;
    updateActionAvailability();
    el.dropZone.setAttribute('aria-busy', String(busy));
  }

  function showProgress(visible, text = '', percent = 0) {
    el.progressWrap.hidden = !visible;
    el.progressText.textContent = text;
    el.progressPercent.textContent = `${percent}%`;
    el.progressBar.style.width = `${percent}%`;
  }

  function clearResultGallery() {
    state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    state.previewUrls = [];
    el.resultGrid.innerHTML = '';
    el.resultGallery.hidden = true;
  }

  async function loadAllPreviews() {
    if (state.busy || !state.files.length) return;
    setBusy(true);
    clearResultGallery();
    showProgress(true, '正在生成全部成品…', 0);
    const total = pageCount();
    try {
      for (let page = 0; page < total; page++) {
        const canvas = await createOutputCanvasForPage(page);
        const blob = await canvasToBlob(canvas);
        const url = URL.createObjectURL(blob);
        state.previewUrls.push(url);
        const filename = outputFilename(page);

        const figure = document.createElement('figure');
        figure.className = 'result-item';
        const image = document.createElement('img');
        image.src = url;
        image.alt = filename;
        image.loading = 'lazy';
        const caption = document.createElement('figcaption');
        const label = document.createElement('span');
        label.textContent = filename;
        const download = document.createElement('a');
        download.href = url;
        download.download = filename;
        download.textContent = '下载';
        caption.append(label, download);
        figure.append(image, caption);
        el.resultGrid.appendChild(figure);

        showProgress(true, `正在生成第 ${page + 1} / ${total} 张`, Math.round(((page + 1) / total) * 100));
      }
      el.resultGallery.hidden = false;
      el.resultGallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showProgress(true, '全部成品已生成', 100);
      toast(`已生成 ${total} 张成品，可长按图片保存`);
    } catch (error) {
      console.error(error);
      clearResultGallery();
      showProgress(false);
      toast(error.message || '成品预览生成失败', 'error');
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (!state.busy) showProgress(false);
      }, 2500);
    }
  }

  async function downloadCurrent() {
    if (state.busy || !state.files.length) return;
    setBusy(true);
    try {
      const page = clamp(state.activePage, 0, pageCount() - 1);
      const canvas = await createOutputCanvasForPage(page);
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob, outputFilename(page));
      toast('当前图片已下载');
    } catch (error) {
      console.error(error);
      toast(error.message || '下载失败', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function exportAllZip() {
    if (state.busy || !state.files.length) return;
    if (typeof window.JSZip !== 'function') {
      toast('ZIP 组件未加载，请刷新页面后重试', 'error');
      return;
    }
    setBusy(true);
    const total = pageCount();
    const zip = new JSZip();
    showProgress(true, '正在生成图片…', 0);
    try {
      for (let page = 0; page < total; page++) {
        const canvas = await createOutputCanvasForPage(page);
        const blob = await canvasToBlob(canvas);
        zip.file(outputFilename(page), blob);
        const percent = Math.round(((page + 1) / total) * 75);
        showProgress(true, `正在生成第 ${page + 1} / ${total} 张`, percent);
      }
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE', streamFiles: false },
        (meta) => {
          const percent = 75 + Math.round(meta.percent * 0.25);
          showProgress(true, '正在打包 ZIP…', percent);
        }
      );
      const zipName = `${safePrefix()}-${state.mode === 'watermark' ? 'marked' : 'collages'}-${state.export.format}.zip`;
      downloadBlob(zipBlob, zipName);
      showProgress(true, '打包完成', 100);
      toast(`已导出 ${total} 张图片`);
    } catch (error) {
      console.error(error);
      toast(error.message || '批量导出失败', 'error');
      showProgress(false);
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        if (!state.busy) showProgress(false);
      }, 3500);
    }
  }

  function readWatermarkControl(control) {
    const key = control.dataset.watermark;
    if (!key) return;
    if (control.type === 'checkbox') state.watermark[key] = control.checked;
    else if (control.type === 'range' || control.type === 'number') state.watermark[key] = numberOr(control.value, WATERMARK_DEFAULTS[key]);
    else state.watermark[key] = control.value;
  }

  function readCollageControl(control) {
    const key = control.dataset.collage;
    if (!key) return;
    if (control.type === 'checkbox') state.collage[key] = control.checked;
    else if (control.type === 'number') state.collage[key] = numberOr(control.value, COLLAGE_DEFAULTS[key]);
    else state.collage[key] = control.value;
  }

  function readExportControl(control) {
    const key = control.dataset.export;
    if (!key) return;
    if (control.type === 'range' || control.type === 'number') state.export[key] = numberOr(control.value, EXPORT_DEFAULTS[key]);
    else state.export[key] = control.value;
  }

  function readMarkControl(control) {
    const path = control.dataset.mark;
    if (!path) return;
    let value;
    if (control.type === 'checkbox') value = control.checked;
    else if (control.type === 'range' || control.type === 'number') {
      const fallback = getPath(state.marks, path);
      value = numberOr(control.value, fallback);
    } else {
      value = control.value;
    }
    setPath(state.marks, path, value);
  }

  function showWelcome() {
    el.welcomeOverlay.hidden = false;
    el.welcomeOverlay.classList.remove('is-closing');
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => el.welcomeStartBtn.focus(), 60);
  }

  function hideWelcome(markSeen = true) {
    if (el.welcomeOverlay.hidden) return;
    if (markSeen) {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'seen');
      } catch (_) { /* private mode can disable persistent storage */ }
    }
    el.welcomeOverlay.classList.add('is-closing');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      el.welcomeOverlay.hidden = true;
      el.welcomeOverlay.classList.remove('is-closing');
    }, 260);
  }

  function bindControls() {
    el.resetSettingsBtn.addEventListener('click', resetSettings);
    el.clearImagesBtn.addEventListener('click', clearFiles);
    el.prevBtn.addEventListener('click', () => goPage(-1));
    el.nextBtn.addEventListener('click', () => goPage(1));
    el.downloadCurrentBtn.addEventListener('click', downloadCurrent);
    el.exportAllBtn.addEventListener('click', exportAllZip);
    el.previewAllBtn.addEventListener('click', loadAllPreviews);
    el.showWelcomeBtn.addEventListener('click', showWelcome);
    el.welcomeStartBtn.addEventListener('click', () => hideWelcome(true));
    el.welcomeOverlay.addEventListener('click', (event) => {
      if (event.target === el.welcomeOverlay) hideWelcome(true);
    });
    el.frameChooseBtn.addEventListener('click', () => el.frameInput.click());
    el.smallChooseBtn.addEventListener('click', () => el.smallInput.click());
    el.addFullscreenBtn.addEventListener('click', () => el.fullscreenInput.click());
    el.frameRemoveBtn.addEventListener('click', () => removeSingleAsset('frame'));
    el.smallRemoveBtn.addEventListener('click', () => removeSingleAsset('small'));

    el.fullscreenInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addFullscreenAssets(files);
    });
    el.frameInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      await setSingleAsset('frame', file);
    });
    el.smallInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      await setSingleAsset('small', file);
    });

    el.modeTabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode)));
    el.presetCards.forEach((card) => card.addEventListener('click', () => applyPreset(card.dataset.preset)));

    el.watermarkControls.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'color' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        readWatermarkControl(control);
        if (control.type === 'range') {
          const map = {
            size: el.watermarkSizeValue,
            opacity: el.watermarkOpacityValue,
            margin: el.watermarkMarginValue,
            rotate: el.watermarkRotateValue,
            gap: el.watermarkGapValue,
            stroke: el.watermarkStrokeValue,
            gradientStrength: el.gradientStrengthValue,
            gradientHeight: el.gradientHeightValue,
            bandOpacity: el.bandOpacityValue
          };
          syncRange(control, map[control.dataset.watermark], control.dataset.watermark === 'rotate' ? '°' : (control.dataset.watermark === 'gap' ? '' : '%'));
        }
        persistSettings();
        schedulePreview();
      });
    });

    el.markControls.forEach((control) => {
      const eventName = control.type === 'range' ? 'input' : 'change';
      control.addEventListener(eventName, () => {
        readMarkControl(control);
        if (control.type === 'range') {
          const output = document.querySelector(`[data-value-for="${control.dataset.mark}"]`);
          syncRange(control, output, output?.dataset.suffix || (control.dataset.mark.endsWith('.rotate') ? '°' : '%'));
        }
        updateEffectVisibility();
        persistSettings();
        schedulePreview();
      });
    });

    el.collageControls.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'color' || control.type === 'checkbox' ? 'change' : 'input';
      control.addEventListener(eventName, () => {
        readCollageControl(control);
        sanitizeState();
        el.numberOptions.hidden = !state.collage.numberEnabled;
        el.soldOptions.hidden = !state.collage.soldEnabled;
        if (control.type === 'range') {
          const output = control.dataset.collage === 'numberSize' ? el.numberSizeValue : el.collageGapValue;
          syncRange(control, output, '%');
        }
        state.activePage = clamp(state.activePage, 0, Math.max(0, pageCount() - 1));
        syncStageTitle();
        renderQueue();
        updatePager();
        persistSettings();
        schedulePreview();
      });
    });

    el.exportControls.forEach((control) => {
      const eventName = control.type === 'range' ? 'input' : 'change';
      control.addEventListener(eventName, () => {
        readExportControl(control);
        if (control.type === 'range') syncRange(control, el.exportQualityValue);
        updateExportUi();
        clearResultGallery();
        persistSettings();
      });
    });
    el.exportEdgeLockBtn.addEventListener('click', () => {
      state.export.edgeLocked = !state.export.edgeLocked;
      updateExportUi();
      clearResultGallery();
      persistSettings();
    });

    const openPicker = () => {
      if (!state.busy) el.fileInput.click();
    };
    el.dropZone.addEventListener('click', openPicker);
    el.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPicker();
      }
    });
    el.emptySelectBtn.addEventListener('click', openPicker);
    el.fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      await addFiles(files);
    });

    ['dragenter','dragover'].forEach((name) => {
      el.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        el.dropZone.classList.add('is-dragging');
      });
    });
    ['dragleave','drop'].forEach((name) => {
      el.dropZone.addEventListener(name, (event) => {
        event.preventDefault();
        el.dropZone.classList.remove('is-dragging');
      });
    });
    el.dropZone.addEventListener('drop', (event) => {
      addFiles(event.dataTransfer.files);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !el.welcomeOverlay.hidden) {
        hideWelcome(true);
        return;
      }
      const target = event.target;
      if (target && /INPUT|SELECT|TEXTAREA/.test(target.tagName)) return;
      if (event.key === 'ArrowLeft') goPage(-1);
      if (event.key === 'ArrowRight') goPage(1);
    });

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fitPreviewDisplay();
      }, 120);
    });
    window.addEventListener('beforeunload', () => {
      state.files.forEach((f) => f.thumbUrl && URL.revokeObjectURL(f.thumbUrl));
      state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
      releaseAllAssets();
    });
  }

  function init() {
    cacheEls();
    restoreSettings();
    applyUiFromState();
    bindControls();
    renderQueue();
    updateActionAvailability();
    syncStageTitle();
    schedulePreview();
    let onboardingSeen = false;
    try {
      onboardingSeen = localStorage.getItem(ONBOARDING_KEY) === 'seen';
    } catch (_) { /* ignore storage restrictions */ }
    if (!onboardingSeen) window.setTimeout(showWelcome, 120);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
