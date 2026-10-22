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
    this.initZoomControls();
    this.initQuickActions();

    // Initial update of linesheet
    this.updateLinesheetText();
    this.fitCanvasToScreen();

    // Auto-resize listener
    window.addEventListener('resize', () => {
      // Keep canvas nicely scaled
    });
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
      }
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', async (e) => {
      if (e.dataTransfer.files.length > 0) {
        await this.handleExcelFile(e.dataTransfer.files[0]);
      }
    });
  }

  async handleExcelFile(file) {
    try {
      const parsed = await ExcelParser.parse(file);
      this.applyParsedData(parsed);

      // Notification
      const colorCount = parsed.colors ? parsed.colors.length : 0;
      alert(`Excel başarıyla okundu!\n• Ürün: ${parsed.articleNo || 'Belirtilmedi'}\n• Ana Renk: ${parsed.mainColor || 'Belirtilmedi'}\n• Renk Sayısı: ${colorCount}\n• Kumaş: ${parsed.composition || 'Belirtilmedi'}`);
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

    // Apply colors if found
    if (parsed.colors && parsed.colors.length > 0) {
      this.colorManager.setColors(parsed.colors);
    }

    // Apply suggested fabric icons
    if (parsed.suggestedIcons && parsed.suggestedIcons.length > 0) {
      this.iconManager.setActiveIcons(parsed.suggestedIcons);
    }

    // Sync input form fields
    this.syncFormFields();
    this.updateLinesheetText();

    // Try auto-matching uploaded gallery if available
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

    setInner('ls-val-article', this.data.articleNo || 'P1059');
    setInner('ls-val-composition', this.data.composition || '%80 Naylon - %20 Elestan');
    setInner('ls-val-asorti', (this.data.asorti || '').replace(/\n/g, '<br>'), true);
    setInner('ls-val-total', this.data.total ? `Total: ${this.data.total}` : 'Total: 10 Pcs');
    setInner('ls-val-main-color', this.data.mainColor || 'Vizon');
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
    const fitScale = Math.min(scaleW, scaleH, 0.7);

    this.zoomScale = Math.max(fitScale, 0.3);
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
    // 1. Örnek Doldur (P1059)
    document.getElementById('btn-load-sample')?.addEventListener('click', () => {
      this.loadSampleP1059();
    });

    // 2. Müşteri Exceli Doldur (22920 - 18 colors)
    document.getElementById('btn-load-customer-excel')?.addEventListener('click', async () => {
      await this.loadCustomerExcelSample();
    });

    // 3. Sıfırla
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('Tüm bilgileri sıfırlamak istediğinize emin misiniz?')) {
        this.resetAll();
      }
    });

    // 4. Quick WhatsApp Export button in navbar
    document.getElementById('btn-quick-whatsapp')?.addEventListener('click', () => {
      this.exportManager.showModal('whatsapp');
    });

    // 5. Quick Print Export button in navbar
    document.getElementById('btn-quick-print')?.addEventListener('click', () => {
      this.exportManager.showModal('print');
    });

    // 6. Direct JPG Export button
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

    this.iconManager.setActiveIcons(['nylon', 'lycra', 'breathable', 'soft_touch']);

    this.colorManager.setColors([
      { id: 'c1', name: 'Siyah', image: 'assets/samples/P1059-Siyah-Ghost-Ön.jpg' },
      { id: 'c2', name: 'Lacivert', image: 'assets/samples/P1059-Lacivert-Ghost-Ön.jpg' },
      { id: 'c3', name: 'Kahve', image: 'assets/samples/P1059-Kahve-Ghost-Ön.jpg' },
      { id: 'c4', name: 'Haki', image: 'assets/samples/P1059-Haki-Ghost-Ön.jpg' }
    ]);

    this.imageManager.slots = {
      hero: 'assets/samples/P1059-Vizon-İmaj.jpg',
      detail1: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail2: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail3: 'assets/samples/P1059-Vizon-Model-ARKA.jpg',
      detail4: 'assets/samples/P1059-Vizon-Ghost-Ön.jpg'
    };

    this.imageManager.renderSlotControls();
    this.imageManager.renderLinesheetSlots();

    this.syncFormFields();
    this.updateLinesheetText();
  }

  async loadCustomerExcelSample() {
    try {
      const response = await fetch('assets/ornek_musteri_excel.xlsx');
      const buffer = await response.arrayBuffer();
      const parsed = await ExcelParser.parse(buffer);
      this.applyParsedData(parsed);
      alert('Müşteri Exceli (Article: 22920, 18 Renkli) yüklendi! Renkler paneline gidip sıralamayı düzenleyebilirsiniz.');
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
      { id: 'c1', name: 'Renk 1', image: null },
      { id: 'c2', name: 'Renk 2', image: null },
      { id: 'c3', name: 'Renk 3', image: null },
      { id: 'c4', name: 'Renk 4', image: null }
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

// Instantiate once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.linesheetApp = new LinesheetApp();
});
