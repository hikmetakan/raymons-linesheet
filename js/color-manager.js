/**
 * RAYMONS LINESHEET STUDIO - COLOR VARIANTS MANAGER
 * Manages color variants list, reordering, images, and dynamic responsive sizing (1 to 30+ colors)
 */

class ColorManager {
  constructor(app) {
    this.app = app;

    // Default sample colors (P1059 sample)
    this.colors = [
      { id: 'c1', name: 'Siyah', image: 'assets/samples/P1059-Siyah-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c2', name: 'Lacivert', image: 'assets/samples/P1059-Lacivert-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c3', name: 'Kahve', image: 'assets/samples/P1059-Kahve-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } },
      { id: 'c4', name: 'Haki', image: 'assets/samples/P1059-Haki-Ghost-Ön.jpg', transform: { scale: 1.0, x: 0, y: 0 } }
    ];

    // Optional manual scale multiplier (1.0 = 100% auto)
    this.cardScaleMultiplier = 1.0;
    this.customFontSize = null; // null = automatic

    this.initSortable();
    this.renderColorList();
    this.renderLinesheetVariants();
  }

  setColors(colorList) {
    this.colors = colorList.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: 'c_' + Date.now() + '_' + index,
          name: item,
          image: null,
          transform: { scale: 1.0, x: 0, y: 0 }
        };
      }
      return {
        ...item,
        transform: item.transform || { scale: 1.0, x: 0, y: 0 }
      };
    });

    this.renderColorList();
    this.renderLinesheetVariants();
  }

  addColor(name = 'Yeni Renk', image = null) {
    this.colors.push({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name,
      image: image,
      transform: { scale: 1.0, x: 0, y: 0 }
    });
    this.renderColorList();
    this.renderLinesheetVariants();
  }

  removeColor(index) {
    if (this.colors.length <= 1) {
      alert('En az 1 adet renk kalmalıdır.');
      return;
    }
    this.colors.splice(index, 1);
    this.renderColorList();
    this.renderLinesheetVariants();
  }

  moveColor(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.colors.length) return;

    const temp = this.colors[index];
    this.colors[index] = this.colors[newIndex];
    this.colors[newIndex] = temp;

    this.renderColorList();
    this.renderLinesheetVariants();
  }

  updateColorName(index, newName) {
    if (this.colors[index]) {
      this.colors[index].name = newName;
      const listInputs = document.querySelectorAll('.color-input-name');
      if (listInputs[index] && listInputs[index].value !== newName) {
        listInputs[index].value = newName;
      }
    }
  }

  updateColorImage(index, imageSrc) {
    if (this.colors[index]) {
      this.colors[index].image = imageSrc;
      this.colors[index].transform = { scale: 1.0, x: 0, y: 0 };
      this.renderColorList();
      this.renderLinesheetVariants();
    }
  }

  initSortable() {
    const container = document.getElementById('colors-reorder-list');
    if (!container || !window.Sortable) return;

    new Sortable(container, {
      animation: 150,
      handle: '.color-drag-handle',
      ghostClass: 'sortable-ghost',
      onEnd: (evt) => {
        const movedItem = this.colors.splice(evt.oldIndex, 1)[0];
        this.colors.splice(evt.newIndex, 0, movedItem);
        this.renderColorList();
        this.renderLinesheetVariants();
      }
    });
  }

  /**
   * Automatically calculate card dimensions, columns, rows, and font sizes
   * based on total color count (e.g. 1..3 colors = large, 4 = standard, 18..24 = compact grid)
   * Available zone on 1080x1850 sheet: width = 984px (x: 48..1032), height = 720px (y: 980..1700)
   */
  computeAutoLayout(count) {
    const availW = 984;
    const availH = 720;
    const mult = this.cardScaleMultiplier || 1.0;

    let cols, cardW, thumbH, labelFont, nameFont, colGap, rowGap, justifyContent;

    if (count === 1) {
      cols = 1;
      cardW = Math.round(280 * mult);
      thumbH = Math.round(430 * mult);
      labelFont = 20;
      nameFont = 24;
      colGap = 40;
      rowGap = 24;
      justifyContent = 'flex-start';
    } else if (count === 2) {
      cols = 2;
      cardW = Math.round(250 * mult);
      thumbH = Math.round(390 * mult);
      labelFont = 20;
      nameFont = 23;
      colGap = 60;
      rowGap = 24;
      justifyContent = 'flex-start';
    } else if (count === 3) {
      cols = 3;
      cardW = Math.round(230 * mult);
      thumbH = Math.round(355 * mult);
      labelFont = 20;
      nameFont = 22;
      colGap = Math.floor((availW - 3 * cardW) / 2);
      rowGap = 24;
      justifyContent = 'space-between';
    } else if (count === 4) {
      cols = 4;
      cardW = Math.round(184 * mult);
      thumbH = Math.round(285 * mult);
      labelFont = 20;
      nameFont = 22;
      colGap = Math.max(12, Math.floor((availW - 4 * cardW) / 3));
      rowGap = 22;
      justifyContent = 'space-between';
    } else if (count <= 6) {
      cols = count;
      colGap = count === 5 ? 24 : 18;
      cardW = Math.round(Math.floor((availW - (cols - 1) * colGap) / cols) * mult);
      thumbH = Math.round(cardW * 1.54);
      labelFont = count === 5 ? 17 : 15;
      nameFont = count === 5 ? 19 : 17;
      rowGap = 20;
      justifyContent = 'space-between';
    } else {
      // Multi-row layout (7 to 36+ colors)
      if (count <= 8) cols = 4;
      else if (count <= 10) cols = 5;
      else if (count <= 12) cols = 6;
      else if (count <= 18) cols = 6;
      else if (count <= 21) cols = 7;
      else if (count <= 24) cols = 8;
      else cols = Math.min(9, Math.ceil(Math.sqrt(count * 1.8)));

      const rows = Math.ceil(count / cols);
      colGap = cols <= 5 ? 22 : (cols <= 6 ? 16 : 12);
      rowGap = rows <= 2 ? 18 : (rows === 3 ? 12 : 8);

      labelFont = rows <= 2 ? 14 : (rows === 3 ? 12 : 10);
      nameFont = rows <= 2 ? 16 : (rows === 3 ? 14 : 11);

      if (this.customFontSize) {
        nameFont = this.customFontSize;
        labelFont = Math.max(9, this.customFontSize - 2);
      }

      const textHeight = labelFont + nameFont + 10;
      const maxRowH = Math.floor((availH - (rows - 1) * rowGap) / rows);
      const maxThumbH = Math.max(60, maxRowH - textHeight);

      const rawCardW = Math.floor((availW - (cols - 1) * colGap) / cols);
      thumbH = Math.round(Math.min(rawCardW * 1.52, maxThumbH) * mult);
      cardW = Math.round(Math.min(rawCardW, Math.max(85, thumbH * 0.72)));
      justifyContent = 'space-between';
    }

    if (this.customFontSize) {
      nameFont = this.customFontSize;
      labelFont = Math.max(9, this.customFontSize - 2);
    }

    return { cols, cardW, thumbH, labelFont, nameFont, colGap, rowGap, justifyContent };
  }

  renderColorList() {
    const container = document.getElementById('colors-reorder-list');
    if (!container) return;

    const badgeEl = document.getElementById('color-count-badge');
    if (badgeEl) {
      badgeEl.innerText = `${this.colors.length} Renk`;
    }

    container.innerHTML = this.colors.map((color, index) => {
      const hasImg = !!color.image;
      return `
        <div class="color-card-item" data-index="${index}">
          <span class="color-drag-handle" title="Sürükleyip Sırala">⋮⋮</span>
          <span class="color-order-badge">${index + 1}</span>
          <div class="color-thumb-box" onclick="window.linesheetApp.pickImageForColor(${index})" title="Görsel Seç">
            ${hasImg ? `<img src="${color.image}" alt="${color.name}">` : '<span style="font-size:0.65rem; color:#64748b;">+</span>'}
          </div>
          <input type="text" class="color-input-name" value="${color.name}" oninput="window.linesheetApp.colorManager.updateColorName(${index}, this.value); window.linesheetApp.colorManager.syncVariantText(${index}, this.value);" placeholder="Renk Adı">
          <div class="color-actions">
            ${hasImg ? `<button class="btn-icon-tiny" title="Kadraj / Kırp" onclick="window.linesheetApp.imageManager.selectSlot('color_${index}')">✂️</button>` : ''}
            <button class="btn-icon-tiny" title="Yukarı Taşı" onclick="window.linesheetApp.colorManager.moveColor(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn-icon-tiny" title="Aşağı Taşı" onclick="window.linesheetApp.colorManager.moveColor(${index}, 1)" ${index === this.colors.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn-icon-tiny delete" title="Sil" onclick="window.linesheetApp.colorManager.removeColor(${index})">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  syncVariantText(index, newName) {
    const nameEls = document.querySelectorAll('#ls-variants-grid .ls-variant-name');
    if (nameEls[index]) {
      nameEls[index].innerText = newName;
    }
  }

  renderLinesheetVariants() {
    const container = document.getElementById('ls-variants-grid');
    if (!container) return;

    const count = this.colors.length;
    const layout = this.computeAutoLayout(count);

    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${layout.cols}, ${layout.cardW}px)`;
    container.style.justifyContent = layout.justifyContent;
    container.style.columnGap = `${layout.colGap}px`;
    container.style.rowGap = `${layout.rowGap}px`;

    container.innerHTML = this.colors.map((color, index) => {
      const slotKey = `color_${index}`;
      const isSelected = this.app.imageManager?.selectedSlotKey === slotKey;
      return `
        <div class="ls-variant-card" data-index="${index}" style="width:${layout.cardW}px;">
          <div class="ls-variant-thumb ls-image-frame ${isSelected ? 'slot-selected' : ''}"
               data-slot-key="${slotKey}"
               data-w="${layout.cardW}"
               data-h="${layout.thumbH}"
               style="width:${layout.cardW}px; height:${layout.thumbH}px;"
               title="${color.name} - Sürükleyerek kaydırın, çift tıklayarak görsel değiştirin">
            ${color.image ? `<img src="${color.image}" alt="${color.name}">` : `
              <div class="empty-slot-placeholder" style="font-size:${Math.max(10, layout.labelFont - 2)}px;">
                <span>+ Görsel</span>
              </div>
            `}
          </div>
          <div class="ls-variant-info" style="margin-top:${count > 12 ? 4 : 8}px;">
            <div class="ls-variant-label" style="font-size:${layout.labelFont}px;">Color:</div>
            <div class="ls-variant-name ls-editable"
                 style="font-size:${layout.nameFont}px;"
                 contenteditable="true"
                 onblur="window.linesheetApp.colorManager.updateColorName(${index}, this.innerText)">${color.name}</div>
          </div>
        </div>
      `;
    }).join('');

    // Attach drag/zoom/crop handlers and apply transforms to each variant thumbnail
    if (this.app.imageManager) {
      container.querySelectorAll('.ls-variant-thumb').forEach((thumbEl, idx) => {
        const slotKey = `color_${idx}`;
        const color = this.colors[idx];
        if (color && color.image) {
          this.app.imageManager.applyTransformToElement(thumbEl, color.transform || { scale: 1.0, x: 0, y: 0 });
        }
        this.app.imageManager.bindFrameInteractions(thumbEl, slotKey);
      });
    }
  }
}

window.ColorManager = ColorManager;
