/**
 * RAYMONS LINESHEET STUDIO - IMAGE MANAGER, CROP/PAN/ZOOM & SMART AUTO-MATCHER
 * Handles uploaded product photos, interactive drag/zoom/crop in every frame, and slot assignment
 */

class ImageManager {
  constructor(app) {
    this.app = app;

    // Image URLs for the 5 main slots
    this.slots = {
      hero: 'assets/samples/P1059-Vizon-İmaj.jpg',
      detail1: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail2: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail3: 'assets/samples/P1059-Vizon-Model-ARKA.jpg',
      detail4: 'assets/samples/P1059-Vizon-Ghost-Ön.jpg'
    };

    // Per-slot transform state { scale, x, y }
    // Default transforms replicate örnek-dolu-linesheet.ai framing accurately
    this.transforms = {
      hero: { scale: 1.85, x: 0, y: -260 },
      detail1: { scale: 3.6, x: 0, y: 40 },
      detail2: { scale: 1.15, x: 0, y: -65 },
      detail3: { scale: 1.15, x: 0, y: -65 },
      detail4: { scale: 0.88, x: 0, y: 0 }
    };

    // Currently selected slot for crop/pan/zoom ('hero', 'detail1'..'detail4', or 'color_0'..)
    this.selectedSlotKey = 'detail1';

    // User-uploaded gallery
    this.uploadedFiles = [];

    // Drag state
    this.isDragging = false;
    this.dragSlotKey = null;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOriginX = 0;
    this.dragOriginY = 0;

    this.initGalleryDropzone();
    this.initGlobalDragEvents();
    this.initCropToolbarEvents();
    this.renderSlotControls();
    this.renderLinesheetSlots();
    this.updateCropToolbarUI();
  }

  /**
   * Get transform for any slot key ('hero', 'detail1'.., or 'color_0'..)
   */
  getTransform(slotKey) {
    if (slotKey && slotKey.startsWith('color_')) {
      const idx = parseInt(slotKey.split('_')[1], 10);
      const c = this.app.colorManager?.colors?.[idx];
      if (c) {
        if (!c.transform) c.transform = { scale: 1.0, x: 0, y: 0 };
        return c.transform;
      }
    }
    if (!this.transforms[slotKey]) {
      this.transforms[slotKey] = { scale: 1.0, x: 0, y: 0 };
    }
    return this.transforms[slotKey];
  }

  /**
   * Set transform for any slot key and update DOM immediately
   */
  setTransform(slotKey, newTransform) {
    const t = this.getTransform(slotKey);
    if (typeof newTransform.scale === 'number') {
      t.scale = Math.min(Math.max(newTransform.scale, 0.25), 6.0);
    }
    if (typeof newTransform.x === 'number') t.x = newTransform.x;
    if (typeof newTransform.y === 'number') t.y = newTransform.y;

    this.applyTransformToDOM(slotKey);
    if (this.selectedSlotKey === slotKey) {
      this.updateCropToolbarUI();
    }
  }

  /**
   * Apply preset crop ("fit", "cover", "pants", "waist") to the selected slot
   */
  applyPresetCrop(preset, slotKey = this.selectedSlotKey) {
    if (!slotKey) return;
    const frame = document.querySelector(`.ls-image-frame[data-slot-key="${slotKey}"]`);
    const img = frame ? frame.querySelector('img') : null;
    const slotW = frame ? frame.clientWidth : 208;
    const slotH = frame ? frame.clientHeight : 238;
    const imgW = (img && img.naturalWidth) ? img.naturalWidth : 1536;
    const imgH = (img && img.naturalHeight) ? img.naturalHeight : 2752;

    const coverRatio = Math.max(slotW / imgW, slotH / imgH);
    const containRatio = Math.min(slotW / imgW, slotH / imgH);

    if (preset === 'fit') {
      // Fit entire image inside slot without cropping
      const fitScale = containRatio / coverRatio;
      this.setTransform(slotKey, { scale: fitScale, x: 0, y: 0 });
    } else if (preset === 'cover') {
      this.setTransform(slotKey, { scale: 1.0, x: 0, y: 0 });
    } else if (preset === 'pants') {
      // Focus on lower body (waist to shoes)
      const shiftY = -slotH * 0.28;
      this.setTransform(slotKey, { scale: slotKey === 'hero' ? 1.85 : 1.18, x: 0, y: shiftY });
    } else if (preset === 'waist') {
      // Focus on waist / belt / pocket detail
      const shiftY = slotH * 0.16;
      this.setTransform(slotKey, { scale: 3.5, x: 0, y: shiftY });
    }
  }

  /**
   * Select a slot for editing (crop, zoom, pan, replace)
   */
  selectSlot(slotKey) {
    this.selectedSlotKey = slotKey;
    document.querySelectorAll('.ls-image-frame').forEach(el => {
      el.classList.toggle('slot-selected', el.dataset.slotKey === slotKey);
    });
    this.updateCropToolbarUI();
  }

  getSlotLabel(slotKey) {
    const labels = {
      hero: 'Sağ Büyük İmaj (Hero)',
      detail1: 'Ana Renk Detay 1 (Sol Üst)',
      detail2: 'Ana Renk Detay 2 (Sağ Üst)',
      detail3: 'Ana Renk Detay 3 (Sol Alt)',
      detail4: 'Ana Renk Detay 4 (Sağ Alt)'
    };
    if (labels[slotKey]) return labels[slotKey];
    if (slotKey && slotKey.startsWith('color_')) {
      const idx = parseInt(slotKey.split('_')[1], 10);
      const color = this.app.colorManager?.colors?.[idx];
      return `Renk Varyantı #${idx + 1}: ${color ? color.name : ''}`;
    }
    return 'Görsel Yuvası';
  }

  setSlot(slotKey, imageUrl, defaultPreset = null) {
    if (slotKey && slotKey.startsWith('color_')) {
      const idx = parseInt(slotKey.split('_')[1], 10);
      this.app.colorManager.updateColorImage(idx, imageUrl);
      this.selectSlot(slotKey);
      return;
    }

    if (this.slots.hasOwnProperty(slotKey)) {
      this.slots[slotKey] = imageUrl;
      // Reset transform for newly uploaded image unless preset specified
      if (defaultPreset) {
        this.transforms[slotKey] = { ...defaultPreset };
      } else if (slotKey === 'detail1') {
        this.transforms[slotKey] = { scale: 1.0, x: 0, y: 0 };
      } else {
        this.transforms[slotKey] = { scale: 1.0, x: 0, y: 0 };
      }
      this.renderSlotControls();
      this.renderLinesheetSlots();
      this.selectSlot(slotKey);
    }
  }

  /**
   * Compute and apply exact pixel dimensions & offsets so aspect ratio is NEVER stretched
   */
  applyTransformToElement(frameEl, transform) {
    if (!frameEl) return;
    const imgEl = frameEl.querySelector('img');
    if (!imgEl) return;

    const updatePosition = () => {
      const slotW = frameEl.clientWidth || parseFloat(frameEl.dataset.w) || 208;
      const slotH = frameEl.clientHeight || parseFloat(frameEl.dataset.h) || 238;
      const imgW = imgEl.naturalWidth || 1536;
      const imgH = imgEl.naturalHeight || 2752;

      const coverRatio = Math.max(slotW / imgW, slotH / imgH);
      const baseW = imgW * coverRatio;
      const baseH = imgH * coverRatio;

      const s = transform.scale || 1.0;
      const drawW = baseW * s;
      const drawH = baseH * s;
      const drawX = (slotW - drawW) / 2 + (transform.x || 0);
      const drawY = (slotH - drawH) / 2 + (transform.y || 0);

      imgEl.style.position = 'absolute';
      imgEl.style.width = `${drawW}px`;
      imgEl.style.height = `${drawH}px`;
      imgEl.style.left = `${drawX}px`;
      imgEl.style.top = `${drawY}px`;
      imgEl.style.maxWidth = 'none';
      imgEl.style.maxHeight = 'none';
      imgEl.style.transform = 'none';
      imgEl.draggable = false;
    };

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      updatePosition();
    } else {
      imgEl.onload = updatePosition;
    }
  }

  applyTransformToDOM(slotKey) {
    const frameEl = document.querySelector(`.ls-image-frame[data-slot-key="${slotKey}"]`);
    if (frameEl) {
      this.applyTransformToElement(frameEl, this.getTransform(slotKey));
    }
  }

  refreshAllSlotTransforms() {
    document.querySelectorAll('.ls-image-frame').forEach(frameEl => {
      const key = frameEl.dataset.slotKey;
      if (key) {
        this.applyTransformToElement(frameEl, this.getTransform(key));
      }
    });
  }

  /**
   * Interactive Mouse Drag (Pan) & Wheel (Zoom) on any Linesheet Image Frame
   */
  bindFrameInteractions(frameEl, slotKey) {
    if (!frameEl) return;

    frameEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const hasImg = !!frameEl.querySelector('img');
      this.selectSlot(slotKey);

      if (!hasImg) {
        // Empty slot: open file picker immediately
        this.triggerFilePickerForSlot(slotKey);
        return;
      }

      e.preventDefault();
      this.isDragging = true;
      this.dragSlotKey = slotKey;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      const t = this.getTransform(slotKey);
      this.dragOriginX = t.x || 0;
      this.dragOriginY = t.y || 0;
      frameEl.classList.add('is-dragging');
    });

    // Double click to replace image
    frameEl.addEventListener('dblclick', (e) => {
      e.preventDefault();
      this.triggerFilePickerForSlot(slotKey);
    });

    // Mouse wheel to zoom in/out when hovering over selected slot
    frameEl.addEventListener('wheel', (e) => {
      const hasImg = !!frameEl.querySelector('img');
      if (!hasImg) return;
      if (this.selectedSlotKey !== slotKey && !e.altKey && !e.ctrlKey) return;

      e.preventDefault();
      e.stopPropagation();
      const t = this.getTransform(slotKey);
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      this.setTransform(slotKey, { scale: (t.scale || 1.0) + delta });
    }, { passive: false });

    // Allow dropping an image from gallery or desktop onto the slot
    frameEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      frameEl.classList.add('slot-dragover');
    });
    frameEl.addEventListener('dragleave', () => {
      frameEl.classList.remove('slot-dragover');
    });
    frameEl.addEventListener('drop', (e) => {
      e.preventDefault();
      frameEl.classList.remove('slot-dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          this.setSlot(slotKey, url);
        }
        return;
      }
      const galleryUrl = e.dataTransfer.getData('text/plain');
      if (galleryUrl) {
        this.setSlot(slotKey, galleryUrl);
      }
    });
  }

  initGlobalDragEvents() {
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.dragSlotKey) return;
      const zoom = this.app.zoomScale || 1.0;
      const dx = (e.clientX - this.dragStartX) / zoom;
      const dy = (e.clientY - this.dragStartY) / zoom;

      this.setTransform(this.dragSlotKey, {
        x: Math.round(this.dragOriginX + dx),
        y: Math.round(this.dragOriginY + dy)
      });
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        document.querySelectorAll('.ls-image-frame.is-dragging').forEach(el => el.classList.remove('is-dragging'));
        this.dragSlotKey = null;
      }
    });
  }

  initCropToolbarEvents() {
    const zoomSlider = document.getElementById('crop-zoom-slider');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setTransform(this.selectedSlotKey, { scale: val });
      });
    }

    document.getElementById('btn-crop-zoom-in')?.addEventListener('click', () => {
      const t = this.getTransform(this.selectedSlotKey);
      this.setTransform(this.selectedSlotKey, { scale: (t.scale || 1.0) + 0.12 });
    });

    document.getElementById('btn-crop-zoom-out')?.addEventListener('click', () => {
      const t = this.getTransform(this.selectedSlotKey);
      this.setTransform(this.selectedSlotKey, { scale: (t.scale || 1.0) - 0.12 });
    });

    document.getElementById('btn-crop-reset')?.addEventListener('click', () => {
      this.setTransform(this.selectedSlotKey, { scale: 1.0, x: 0, y: 0 });
    });

    document.getElementById('btn-crop-fit')?.addEventListener('click', () => {
      this.applyPresetCrop('fit');
    });

    document.getElementById('btn-crop-pants')?.addEventListener('click', () => {
      this.applyPresetCrop('pants');
    });

    document.getElementById('btn-crop-waist')?.addEventListener('click', () => {
      this.applyPresetCrop('waist');
    });

    document.getElementById('btn-crop-change-img')?.addEventListener('click', () => {
      this.triggerFilePickerForSlot(this.selectedSlotKey);
    });
  }

  updateCropToolbarUI() {
    const labelEl = document.getElementById('crop-selected-label');
    if (labelEl) {
      labelEl.innerText = this.getSlotLabel(this.selectedSlotKey);
    }

    const t = this.getTransform(this.selectedSlotKey);
    const zoomSlider = document.getElementById('crop-zoom-slider');
    if (zoomSlider) {
      zoomSlider.value = t.scale || 1.0;
    }

    const zoomValEl = document.getElementById('crop-zoom-val');
    if (zoomValEl) {
      zoomValEl.innerText = `${Math.round((t.scale || 1.0) * 100)}%`;
    }
  }

  triggerFilePickerForSlot(slotKey) {
    if (!slotKey) return;
    if (slotKey.startsWith('color_')) {
      const idx = parseInt(slotKey.split('_')[1], 10);
      this.app.pickImageForColor(idx);
    } else {
      this.app.pickDirectImage(slotKey);
    }
  }

  /**
   * Handle multiple images uploaded at once
   */
  async handleBatchUpload(files) {
    const newItems = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newItems.push({
          name: file.name,
          url: url,
          file: file
        });
      }
    }

    this.uploadedFiles = [...this.uploadedFiles, ...newItems];
    this.renderGallery();
    this.autoMatchImages(this.uploadedFiles);
  }

  /**
   * Intelligently match uploaded image filenames to slots and color variants
   */
  autoMatchImages(items = this.uploadedFiles) {
    if (!items || items.length === 0) return;

    const normalize = str => str.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

    const mainColor = normalize(this.app.data.mainColor || 'vizon');

    items.forEach(item => {
      const name = normalize(item.name);

      if (name.includes('imaj') || name.includes('hero') || name.includes('lifestyle')) {
        this.slots.hero = item.url;
        this.transforms.hero = { scale: 1.85, x: 0, y: -260 };
        return;
      }

      if (name.includes(mainColor)) {
        if (name.includes('model') && (name.includes('on') || name.includes('front'))) {
          this.slots.detail1 = item.url;
          this.transforms.detail1 = { scale: 3.6, x: 0, y: 40 };
          this.slots.detail2 = item.url;
          this.transforms.detail2 = { scale: 1.15, x: 0, y: -65 };
          return;
        } else if (name.includes('model') && (name.includes('arka') || name.includes('back'))) {
          this.slots.detail3 = item.url;
          this.transforms.detail3 = { scale: 1.15, x: 0, y: -65 };
          return;
        } else if (name.includes('ghost') && (name.includes('on') || name.includes('front'))) {
          this.slots.detail4 = item.url;
          this.transforms.detail4 = { scale: 0.88, x: 0, y: 0 };
          return;
        }
      }

      const colors = this.app.colorManager.colors;
      for (let i = 0; i < colors.length; i++) {
        const colorName = normalize(colors[i].name);
        if (colorName && name.includes(colorName)) {
          this.app.colorManager.updateColorImage(i, item.url);
          break;
        }
      }
    });

    this.renderSlotControls();
    this.renderLinesheetSlots();
  }

  initGalleryDropzone() {
    const dropzone = document.getElementById('images-dropzone');
    const input = document.getElementById('images-input');
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleBatchUpload(e.target.files);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) {
        this.handleBatchUpload(e.dataTransfer.files);
      }
    });
  }

  renderGallery() {
    const container = document.getElementById('uploaded-gallery');
    if (!container) return;

    if (this.uploadedFiles.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #64748b; font-size: 0.72rem; padding: 16px;">Yüklenen görsel bulunmuyor.</div>';
      return;
    }

    container.innerHTML = this.uploadedFiles.map((file, idx) => `
      <div class="gallery-item" draggable="true" data-index="${idx}" title="Yuvalara sürükleyip bırakabilirsiniz: ${file.name}">
        <img src="${file.url}" alt="${file.name}">
        <div class="gallery-item-name">${file.name}</div>
      </div>
    `).join('');

    container.querySelectorAll('.gallery-item').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        const idx = el.dataset.index;
        e.dataTransfer.setData('text/plain', this.uploadedFiles[idx].url);
      });
    });
  }

  renderSlotControls() {
    const container = document.getElementById('slots-list');
    if (!container) return;

    const slotConfigs = [
      { key: 'hero', title: 'Sağ Büyük İmaj (Hero Model)', desc: 'Tam boy lifestyle / model görseli' },
      { key: 'detail1', title: 'Ana Renk Detay 1 (Sol Üst)', desc: 'Kemer / cep yakın çekim veya detay' },
      { key: 'detail2', title: 'Ana Renk Detay 2 (Sağ Üst)', desc: 'Model ön çekim' },
      { key: 'detail3', title: 'Ana Renk Detay 3 (Sol Alt)', desc: 'Model arka çekim' },
      { key: 'detail4', title: 'Ana Renk Detay 4 (Sağ Alt)', desc: 'Hayalet manken / Ghost çekim' }
    ];

    container.innerHTML = slotConfigs.map(cfg => {
      const img = this.slots[cfg.key];
      const isSel = this.selectedSlotKey === cfg.key;
      return `
        <div class="slot-item ${isSel ? 'slot-item-active' : ''}" data-slot="${cfg.key}">
          <div class="slot-thumb" onclick="window.linesheetApp.imageManager.selectSlot('${cfg.key}')" title="Kadraj Düzenle">
            ${img ? `<img src="${img}" alt="${cfg.title}">` : `<span class="empty-icon">+</span>`}
          </div>
          <div class="slot-meta" onclick="window.linesheetApp.imageManager.selectSlot('${cfg.key}')" style="cursor:pointer;">
            <div class="slot-title">${cfg.title}</div>
            <div class="slot-desc">${cfg.desc}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.linesheetApp.imageManager.selectSlot('${cfg.key}')" title="Kırp / Yakınlaştır">✂️</button>
          <button class="btn btn-secondary btn-sm" onclick="window.linesheetApp.pickDirectImage('${cfg.key}')">Seç</button>
        </div>
      `;
    }).join('');
  }

  renderLinesheetSlots() {
    const configs = [
      { key: 'hero', id: 'ls-hero-slot', w: 520, h: 950, label: 'Sağ Büyük İmaj' },
      { key: 'detail1', id: 'ls-detail-1', w: 208, h: 238, label: 'Ana Renk Görseli 1' },
      { key: 'detail2', id: 'ls-detail-2', w: 208, h: 238, label: 'Ana Renk Görseli 2' },
      { key: 'detail3', id: 'ls-detail-3', w: 208, h: 238, label: 'Ana Renk Görseli 3' },
      { key: 'detail4', id: 'ls-detail-4', w: 208, h: 238, label: 'Ana Renk Görseli 4' }
    ];

    configs.forEach(cfg => {
      const el = document.getElementById(cfg.id);
      if (!el) return;
      el.dataset.slotKey = cfg.key;
      el.dataset.w = cfg.w;
      el.dataset.h = cfg.h;
      el.classList.add('ls-image-frame');
      if (this.selectedSlotKey === cfg.key) {
        el.classList.add('slot-selected');
      }

      const imgUrl = this.slots[cfg.key];
      if (imgUrl) {
        el.innerHTML = `<img src="${imgUrl}" alt="${cfg.label}">`;
        this.applyTransformToElement(el, this.getTransform(cfg.key));
      } else {
        el.innerHTML = `
          <div class="empty-slot-placeholder">
            <span>+ ${cfg.label}</span>
          </div>
        `;
      }

      if (!el.dataset.bound) {
        el.dataset.bound = 'true';
        this.bindFrameInteractions(el, cfg.key);
      }
    });
  }
}

window.ImageManager = ImageManager;
