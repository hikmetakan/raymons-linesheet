/**
 * RAYMONS LINESHEET STUDIO - CORE APPLICATION CONTROLLER
 * Luxury Garment Linesheet Automation & Editor
 */

class LinesheetApp {
  constructor() {
    // Current garment data state
    this.data = {
      articleNo: 'P1059',
      composition: '%80 Naylon - %20 Elestan',
      asorti: '31:1 / 32:2 / 33:2 / 34:2 /\n36:2 / 38:1',
      total: '10 Pcs',
      mainColor: 'Vizon'
    };

    // Typography customization state (Point 3)
    this.typography = {
      fontFamily: "'Montserrat', sans-serif",
      labelSize: 19,
      articleSize: 21,
      compositionSize: 20,
      asortiSize: 19,
      totalSize: 20,
      mainColorSize: 21,
      lineHeight: 1.22
    };

    // Canvas zoom scale
    this.zoomScale = 0.55;

    // Initialize sub-managers
    this.iconManager = new IconManager(this);
    this.colorManager = new ColorManager(this);
    this.imageManager = new ImageManager(this);
    this.exportManager = new ExportManager(this);

    this.initSidebarTabs();
    this.initExcelDropzone();
    this.initFormBindings();
    this.initTypographyControls();
    this.initColorLayoutControls();
    this.initZoomControls();
    this.initQuickActions();

    // Initial update of linesheet
    this.updateLinesheetText();
    this.applyTypographyStyles();
    this.fitCanvasToScreen();
  }

  /* ==========================================================================
     EXCEL IMPORT
     ========================================================================== */
  initExcelDropzone() {
    const dropzone = document.getElementById('excel-dropzone');
    const input = document.getElementById('excel-input');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    input.addEventListener('change', async (e) => {
      if (e.target.files.length > 0) {
        await this.handleExcelFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        await this.handleExcelFile(e.dataTransfer.files[0]);
      }
    });
  }

  async handleExcelFile(file) {
    try {
      const parsed = await ExcelParser.parse(file);
      this.applyParsedData(parsed);

      const colorCount = parsed.colors ? parsed.colors.length : 0;
      alert(`Excel başarıyla aktarıldı!\n• Article No: ${parsed.articleNo || '-'}\n• Ana Renk (Color): ${parsed.mainColor || '-'}\n• Diğer Renkler: ${colorCount} adet\n• Asorti: ${parsed.asorti || '-'}\n• Total: ${parsed.total || '-'}\n• Composition: ${parsed.composition || '-'}`);
    } catch (err) {
      console.error('Excel parse error:', err);
      alert('Excel dosyası okunurken hata oluştu: ' + err.message);
    }
  }

  applyParsedData(parsed) {
    if (parsed.articleNo) this.data.articleNo = parsed.articleNo;
    if (parsed.composition) this.data.composition = parsed.composition;
    if (parsed.asorti) this.data.asorti = parsed.asorti;
    if (parsed.total) this.data.total = parsed.total;
    if (parsed.mainColor) this.data.mainColor = parsed.mainColor;

    // Auto-adjust Asorti font size if Asorti text is very long
    if (this.data.asorti && this.data.asorti.length > 48) {
      this.typography.asortiSize = 15;
    } else if (this.data.asorti && this.data.asorti.length > 35) {
      this.typography.asortiSize = 17;
    } else {
      this.typography.asortiSize = 19;
    }

    if (parsed.colors && parsed.colors.length > 0) {
      this.colorManager.setColors(parsed.colors);
    }

    if (parsed.suggestedIcons && parsed.suggestedIcons.length > 0) {
      this.iconManager.setActiveIcons(parsed.suggestedIcons);
    }

    this.syncFormFields();
    this.syncTypographyControls();
    this.updateLinesheetText();
    this.applyTypographyStyles();

    this.imageManager.autoMatchImages();
  }

  /* ==========================================================================
     FORM & TEXT BINDINGS
     ========================================================================== */
  initFormBindings() {
    const bindInput = (id, propKey) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = this.data[propKey];
        el.addEventListener('input', (e) => {
          this.data[propKey] = e.target.value;
          this.updateLinesheetText();
        });
      }
    };

    bindInput('input-article', 'articleNo');
    bindInput('input-composition', 'composition');
    bindInput('input-asorti', 'asorti');
    bindInput('input-total', 'total');
    bindInput('input-main-color', 'mainColor');
  }

  syncFormFields() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('input-article', this.data.articleNo);
    setVal('input-composition', this.data.composition);
    setVal('input-asorti', this.data.asorti);
    setVal('input-total', this.data.total);
    setVal('input-main-color', this.data.mainColor);
  }

  updateLinesheetText() {
    const setInner = (id, val, isHtml = false) => {
      const el = document.getElementById(id);
      if (el) {
        if (isHtml) el.innerHTML = val;
        else el.innerText = val;
      }
    };

    setInner('ls-val-article', this.data.articleNo || '');
    setInner('ls-val-composition', this.data.composition || '');
    setInner('ls-val-asorti', (this.data.asorti || '').replace(/\n/g, '<br>'), true);

    let totalStr = this.data.total || '';
    if (totalStr && !/^total/i.test(totalStr)) {
      totalStr = `Total: ${totalStr}`;
    }
    setInner('ls-val-total', totalStr);
    setInner('ls-val-main-color', this.data.mainColor || '');
  }

  /* ==========================================================================
     TYPOGRAPHY CONTROLS (POINT 3)
     ========================================================================== */
  initTypographyControls() {
    const fontSelect = document.getElementById('typo-font-family');
    if (fontSelect) {
      fontSelect.value = this.typography.fontFamily;
      fontSelect.addEventListener('change', (e) => {
        this.typography.fontFamily = e.target.value;
        this.applyTypographyStyles();
      });
    }

    const bindSizeSlider = (sliderId, valBadgeId, key, unit = 'px') => {
      const slider = document.getElementById(sliderId);
      const badge = document.getElementById(valBadgeId);
      if (!slider) return;

      slider.value = this.typography[key];
      if (badge) badge.innerText = `${this.typography[key]}${unit}`;

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.typography[key] = val;
        if (badge) badge.innerText = `${val}${unit}`;
        this.applyTypographyStyles();
      });
    };

    bindSizeSlider('typo-asorti-size', 'typo-asorti-val', 'asortiSize');
    bindSizeSlider('typo-comp-size', 'typo-comp-val', 'compositionSize');
    bindSizeSlider('typo-article-size', 'typo-article-val', 'articleSize');
    bindSizeSlider('typo-color-size', 'typo-color-val', 'mainColorSize');
    bindSizeSlider('typo-total-size', 'typo-total-val', 'totalSize');
    bindSizeSlider('typo-label-size', 'typo-label-val', 'labelSize');
    bindSizeSlider('typo-line-height', 'typo-lh-val', 'lineHeight', '');

    document.getElementById('btn-reset-typo')?.addEventListener('click', () => {
      this.typography = {
        fontFamily: "'Montserrat', sans-serif",
        labelSize: 19,
        articleSize: 21,
        compositionSize: 20,
        asortiSize: 19,
        totalSize: 20,
        mainColorSize: 21,
        lineHeight: 1.22
      };
      this.syncTypographyControls();
      this.applyTypographyStyles();
    });
  }

  syncTypographyControls() {
    const setSlider = (sliderId, badgeId, val, unit = 'px') => {
      const s = document.getElementById(sliderId);
      const b = document.getElementById(badgeId);
      if (s) s.value = val;
      if (b) b.innerText = `${val}${unit}`;
    };

    const fontSelect = document.getElementById('typo-font-family');
    if (fontSelect) fontSelect.value = this.typography.fontFamily;

    setSlider('typo-asorti-size', 'typo-asorti-val', this.typography.asortiSize);
    setSlider('typo-comp-size', 'typo-comp-val', this.typography.compositionSize);
    setSlider('typo-article-size', 'typo-article-val', this.typography.articleSize);
    setSlider('typo-color-size', 'typo-color-val', this.typography.mainColorSize);
    setSlider('typo-total-size', 'typo-total-val', this.typography.totalSize);
    setSlider('typo-label-size', 'typo-label-val', this.typography.labelSize);
    setSlider('typo-line-height', 'typo-lh-val', this.typography.lineHeight, '');
  }

  applyTypographyStyles() {
    const sheet = document.getElementById('linesheet-sheet');
    if (sheet) {
      sheet.style.fontFamily = this.typography.fontFamily;
    }

    // Apply label sizes
    document.querySelectorAll('.ls-specs-container .ls-label').forEach(el => {
      el.style.fontSize = `${this.typography.labelSize}px`;
    });

    const applyFieldStyle = (id, size) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = `${this.typography.lineHeight}`;
      }
    };

    applyFieldStyle('ls-val-article', this.typography.articleSize);
    applyFieldStyle('ls-val-composition', this.typography.compositionSize);
    applyFieldStyle('ls-val-asorti', this.typography.asortiSize);
    applyFieldStyle('ls-val-total', this.typography.totalSize);
    applyFieldStyle('ls-val-main-color', this.typography.mainColorSize);
  }

  /* ==========================================================================
     COLOR LAYOUT CONTROLS (POINT 4)
     ========================================================================== */
  initColorLayoutControls() {
    const scaleSlider = document.getElementById('color-scale-slider');
    const scaleVal = document.getElementById('color-scale-val');
    if (scaleSlider) {
      scaleSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.colorManager.cardScaleMultiplier = val;
        if (scaleVal) scaleVal.innerText = `${Math.round(val * 100)}%`;
        this.colorManager.renderLinesheetVariants();
      });
    }

    const fontSlider = document.getElementById('color-font-slider');
    const fontVal = document.getElementById('color-font-val');
    if (fontSlider) {
      fontSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.colorManager.customFontSize = val === 0 ? null : val;
        if (fontVal) fontVal.innerText = val === 0 ? 'Otomatik' : `${val}px`;
        this.colorManager.renderLinesheetVariants();
      });
    }

    document.getElementById('btn-color-layout-auto')?.addEventListener('click', () => {
      this.colorManager.cardScaleMultiplier = 1.0;
      this.colorManager.customFontSize = null;
      if (scaleSlider) scaleSlider.value = 1.0;
      if (scaleVal) scaleVal.innerText = 'Otomatik (100%)';
      if (fontSlider) fontSlider.value = 0;
      if (fontVal) fontVal.innerText = 'Otomatik';
      this.colorManager.renderLinesheetVariants();
    });
  }

  /* ==========================================================================
     DIRECT IMAGE PICKERS
     ========================================================================== */
  pickDirectImage(slotKey) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        this.imageManager.setSlot(slotKey, url);
      }
    };
    input.click();
  }

  pickImageForColor(colorIndex) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        this.colorManager.updateColorImage(colorIndex, url);
        this.imageManager.selectSlot(`color_${colorIndex}`);
      }
    };
    input.click();
  }

  /* ==========================================================================
     SIDEBAR TABS
     ========================================================================== */
  initSidebarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPanel = document.getElementById(`panel-${tab.dataset.tab}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  /* ==========================================================================
     CANVAS ZOOM & NAVIGATION
     ========================================================================== */
  initZoomControls() {
    const setZoom = (scale) => {
      this.zoomScale = Math.min(Math.max(scale, 0.25), 1.5);
      const wrapper = document.getElementById('canvas-wrapper');
      if (wrapper) {
        wrapper.style.transform = `scale(${this.zoomScale})`;
        wrapper.style.transformOrigin = 'top center';
        wrapper.style.width = `${1080 * this.zoomScale}px`;
        wrapper.style.height = `${1850 * this.zoomScale + 60}px`;
      }
      const badge = document.getElementById('zoom-percentage');
      if (badge) {
        badge.innerText = `${Math.round(this.zoomScale * 100)}%`;
      }
    };

    document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(this.zoomScale + 0.08));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(this.zoomScale - 0.08));
    document.getElementById('btn-zoom-100')?.addEventListener('click', () => setZoom(1.0));
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => this.fitCanvasToScreen());
  }

  fitCanvasToScreen() {
    const container = document.getElementById('canvas-scroll-container');
    if (!container) return;

    const availableWidth = container.clientWidth - 80;
    const availableHeight = container.clientHeight - 80;

    const scaleW = availableWidth / 1080;
    const scaleH = availableHeight / 1850;
    const fitScale = Math.min(scaleW, scaleH, 0.72);

    this.zoomScale = Math.max(fitScale, 0.35);
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      wrapper.style.transform = `scale(${this.zoomScale})`;
      wrapper.style.transformOrigin = 'top center';
      wrapper.style.width = `${1080 * this.zoomScale}px`;
      wrapper.style.height = `${1850 * this.zoomScale + 60}px`;
    }

    const badge = document.getElementById('zoom-percentage');
    if (badge) badge.innerText = `${Math.round(this.zoomScale * 100)}%`;
  }

  /* ==========================================================================
     QUICK ACTIONS & PRESETS
     ========================================================================== */
  initQuickActions() {
    document.getElementById('btn-load-sample')?.addEventListener('click', () => {
      this.loadSampleP1059();
    });

    document.getElementById('btn-load-customer-excel')?.addEventListener('click', async () => {
      await this.loadCustomerExcelSample();
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('Tüm bilgileri sıfırlamak istediğinize emin misiniz?')) {
        this.resetAll();
      }
    });

    document.getElementById('btn-quick-whatsapp')?.addEventListener('click', () => {
      this.exportManager.showModal('whatsapp');
    });

    document.getElementById('btn-quick-print')?.addEventListener('click', () => {
      this.exportManager.showModal('print');
    });

    document.getElementById('btn-quick-jpg')?.addEventListener('click', () => {
      this.exportManager.runExport('image');
    });
  }

  loadSampleP1059() {
    this.data = {
      articleNo: 'P1059',
      composition: '%80 Naylon - %20 Elestan',
      asorti: '31:1 / 32:2 / 33:2 / 34:2 /\n36:2 / 38:1',
      total: '10 Pcs',
      mainColor: 'Vizon'
    };

    this.typography.asortiSize = 19;
    this.syncTypographyControls();
    this.applyTypographyStyles();

    this.iconManager.setActiveIcons(['nylon', 'lycra', 'breathable', 'soft_touch']);

    this.colorManager.setColors([
      { id: 'c1', name: 'Siyah', image: 'assets/samples/P1059-Siyah-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c2', name: 'Lacivert', image: 'assets/samples/P1059-Lacivert-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c3', name: 'Kahve', image: 'assets/samples/P1059-Kahve-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c4', name: 'Haki', image: 'assets/samples/P1059-Haki-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } }
    ]);

    this.imageManager.slots = {
      hero: 'assets/samples/P1059-Vizon-İmaj.jpg',
      detail1: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail2: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail3: 'assets/samples/P1059-Vizon-Model-ARKA.jpg',
      detail4: 'assets/samples/P1059-Vizon-Ghost-Ön.jpg'
    };

    this.imageManager.transforms = {
      hero: { scale: 1.85, x: 0, y: -260 },
      detail1: { scale: 3.6, x: 0, y: 40 },
      detail2: { scale: 1.15, x: 0, y: -65 },
      detail3: { scale: 1.15, x: 0, y: -65 },
      detail4: { scale: 0.88, x: 0, y: 0 }
    };

    this.imageManager.renderSlotControls();
    this.imageManager.renderLinesheetSlots();
    this.imageManager.updateCropToolbarUI();

    this.syncFormFields();
    this.updateLinesheetText();
  }

  async loadCustomerExcelSample() {
    try {
      const response = await fetch('assets/ornek_musteri_excel.xlsx');
      const buffer = await response.arrayBuffer();
      const parsed = await ExcelParser.parse(buffer);
      this.applyParsedData(parsed);
      alert(`Müşteri Exceli aktarıldı!\n• Article No: ${parsed.articleNo}\n• Ana Renk (Color): ${parsed.mainColor}\n• Diğer Renkler: ${parsed.colors.length} adet otomatik boyutlandırıldı\n• Asorti: ${parsed.asorti}\n• Total: ${parsed.total}\n• Composition: ${parsed.composition}`);
    } catch (err) {
      console.error('Fetch error:', err);
      alert('Örnek excel yüklenirken hata oluştu.');
    }
  }

  resetAll() {
    this.data = {
      articleNo: '',
      composition: '',
      asorti: '',
      total: '',
      mainColor: ''
    };
    this.iconManager.setActiveIcons([]);
    this.colorManager.setColors([
      { id: 'c1', name: 'Renk 1', image: null, transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c2', name: 'Renk 2', image: null, transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c3', name: 'Renk 3', image: null, transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c4', name: 'Renk 4', image: null, transform: { scale: 1.0, x: 0, y: 0 } }
    ]);
    this.imageManager.slots = {
      hero: null,
      detail1: null,
      detail2: null,
      detail3: null,
      detail4: null
    };
    this.imageManager.renderSlotControls();
    this.imageManager.renderLinesheetSlots();
    this.syncFormFields();
    this.updateLinesheetText();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.linesheetApp = new LinesheetApp();
});
