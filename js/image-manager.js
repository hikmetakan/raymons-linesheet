/**
 * RAYMONS LINESHEET STUDIO - IMAGE MANAGER & SMART AUTO-MATCHER
 * Handles uploaded product photos, filename matching, slot assignment, and cropping
 */

class ImageManager {
  constructor(app) {
    this.app = app;

    // Slots state
    this.slots = {
      hero: 'assets/samples/P1059-Vizon-İmaj.jpg',
      detail1: 'assets/samples/P1059-Vizon-Model-Ön.jpg', // cropped/zoomed in CSS
      detail2: 'assets/samples/P1059-Vizon-Model-Ön.jpg',
      detail3: 'assets/samples/P1059-Vizon-Model-ARKA.jpg',
      detail4: 'assets/samples/P1059-Vizon-Ghost-Ön.jpg'
    };

    // User-uploaded gallery
    this.uploadedFiles = []; // { name: '', url: '', file: File }

    this.initGalleryDropzone();
    this.renderSlotControls();
    this.renderLinesheetSlots();
  }

  setSlot(slotKey, imageUrl) {
    if (this.slots.hasOwnProperty(slotKey)) {
      this.slots[slotKey] = imageUrl;
      this.renderSlotControls();
      this.renderLinesheetSlots();
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

    // Auto-match if we have newly uploaded images
    this.autoMatchImages(this.uploadedFiles);
  }

  /**
   * Intelligently match uploaded image filenames to slots and color variants
   */
  autoMatchImages(items = this.uploadedFiles) {
    if (!items || items.length === 0) return;

    let matchedCount = 0;
    const normalize = str => str.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

    const mainColor = normalize(this.app.data.mainColor || 'vizon');

    items.forEach(item => {
      const name = normalize(item.name);

      // 1. Hero / Lifestyle / İmaj
      if (name.includes('imaj') || name.includes('hero') || name.includes('lifestyle')) {
        this.slots.hero = item.url;
        matchedCount++;
        return;
      }

      // 2. Main Color Details
      if (name.includes(mainColor)) {
        if (name.includes('model') && (name.includes('on') || name.includes('front'))) {
          this.slots.detail1 = item.url;
          this.slots.detail2 = item.url;
          matchedCount++;
        } else if (name.includes('model') && (name.includes('arka') || name.includes('back'))) {
          this.slots.detail3 = item.url;
          matchedCount++;
        } else if (name.includes('ghost') && (name.includes('on') || name.includes('front'))) {
          this.slots.detail4 = item.url;
          matchedCount++;
        }
        return;
      }

      // 3. Match Color Variants
      const colors = this.app.colorManager.colors;
      for (let i = 0; i < colors.length; i++) {
        const colorName = normalize(colors[i].name);
        if (colorName && name.includes(colorName)) {
          this.app.colorManager.updateColorImage(i, item.url);
          matchedCount++;
          break;
        }
      }
    });

    this.renderSlotControls();
    this.renderLinesheetSlots();

    if (matchedCount > 0) {
      console.log(`Otomatik eşleştirildi: ${matchedCount} görsel.`);
    }
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
      <div class="gallery-item" draggable="true" data-index="${idx}" title="${file.name}">
        <img src="${file.url}" alt="${file.name}">
        <div class="gallery-item-name">${file.name}</div>
      </div>
    `).join('');

    // Attach drag events
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
      { key: 'detail1', title: 'Ana Renk Detay 1 (Kemer / Detay)', desc: 'Sol üst detay yakın çekim' },
      { key: 'detail2', title: 'Ana Renk Detay 2 (Model Ön)', desc: 'Sol üst sağ boy model ön çekim' },
      { key: 'detail3', title: 'Ana Renk Detay 3 (Model Arka)', desc: 'Sol alt sol boy model arka çekim' },
      { key: 'detail4', title: 'Ana Renk Detay 4 (Hayalet Manken)', desc: 'Sol alt sağ hayalet / flat ürün' }
    ];

    container.innerHTML = slotConfigs.map(cfg => {
      const img = this.slots[cfg.key];
      return `
        <div class="slot-item" data-slot="${cfg.key}">
          <div class="slot-thumb" onclick="window.linesheetApp.pickDirectImage('${cfg.key}')" title="Görsel Seç">
            ${img ? `<img src="${img}" alt="${cfg.title}">` : `<span class="empty-icon">+</span>`}
          </div>
          <div class="slot-meta">
            <div class="slot-title">${cfg.title}</div>
            <div class="slot-desc">${cfg.desc}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.linesheetApp.pickDirectImage('${cfg.key}')">Seç</button>
        </div>
      `;
    }).join('');
  }

  renderLinesheetSlots() {
    // Hero slot
    const heroEl = document.getElementById('ls-hero-slot');
    if (heroEl) {
      heroEl.innerHTML = this.slots.hero ? `<img src="${this.slots.hero}" alt="Hero">` : `
        <div class="empty-slot-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          <span>Sağ Büyük İmaj</span>
        </div>
      `;
    }

    // Detail 1..4 slots
    for (let i = 1; i <= 4; i++) {
      const slotEl = document.getElementById(`ls-detail-${i}`);
      const img = this.slots[`detail${i}`];
      if (slotEl) {
        slotEl.innerHTML = img ? `<img src="${img}" alt="Detay ${i}">` : `
          <div class="empty-slot-placeholder">
            <span>Detay ${i}</span>
          </div>
        `;
      }
    }
  }
}

window.ImageManager = ImageManager;
