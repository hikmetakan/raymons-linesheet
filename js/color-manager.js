/**
 * RAYMONS LINESHEET STUDIO - COLOR VARIANTS MANAGER
 * Manages color variants list, reordering, images, and layout overflow
 */

class ColorManager {
  constructor(app) {
    this.app = app;

    // Default sample colors (P1059 sample)
    this.colors = [
      { id: 'c1', name: 'Siyah', image: 'assets/samples/P1059-Siyah-Ghost-Ön.jpg' },
      { id: 'c2', name: 'Lacivert', image: 'assets/samples/P1059-Lacivert-Ghost-Ön.jpg' },
      { id: 'c3', name: 'Kahve', image: 'assets/samples/P1059-Kahve-Ghost-Ön.jpg' },
      { id: 'c4', name: 'Haki', image: 'assets/samples/P1059-Haki-Ghost-Ön.jpg' }
    ];

    this.initSortable();
    this.renderColorList();
    this.renderLinesheetVariants();
  }

  setColors(colorList) {
    // colorList can be array of strings or objects
    this.colors = colorList.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: 'c_' + Date.now() + '_' + index,
          name: item,
          image: null
        };
      }
      return item;
    });

    this.renderColorList();
    this.renderLinesheetVariants();
  }

  addColor(name = 'Yeni Renk', image = null) {
    this.colors.push({
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name,
      image: image
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
      this.renderLinesheetVariants();
    }
  }

  updateColorImage(index, imageSrc) {
    if (this.colors[index]) {
      this.colors[index].image = imageSrc;
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

  renderColorList() {
    const container = document.getElementById('colors-reorder-list');
    if (!container) return;

    container.innerHTML = this.colors.map((color, index) => {
      const hasImg = !!color.image;
      return `
        <div class="color-card-item" data-index="${index}">
          <span class="color-drag-handle" title="Sürükleyip Sırala">⋮⋮</span>
          <span class="color-order-badge">${index + 1}</span>
          <div class="color-thumb-box" onclick="window.linesheetApp.pickImageForColor(${index})" title="Görsel Değiştir">
            ${hasImg ? `<img src="${color.image}" alt="${color.name}">` : '<span style="font-size:0.6rem; color:#64748b;">+</span>'}
          </div>
          <input type="text" class="color-input-name" value="${color.name}" onchange="window.linesheetApp.colorManager.updateColorName(${index}, this.value)" placeholder="Renk Adı">
          <div class="color-actions">
            <button class="btn-icon-tiny" title="Yukarı Taşı" onclick="window.linesheetApp.colorManager.moveColor(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
            <button class="btn-icon-tiny" title="Aşağı Taşı" onclick="window.linesheetApp.colorManager.moveColor(${index}, 1)" ${index === this.colors.length - 1 ? 'disabled' : ''}>▼</button>
            <button class="btn-icon-tiny delete" title="Sil" onclick="window.linesheetApp.colorManager.removeColor(${index})">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLinesheetVariants() {
    const container = document.getElementById('ls-variants-grid');
    if (!container) return;

    // Apply layout class depending on color count
    const count = this.colors.length;
    container.className = 'ls-variants-grid';
    if (count === 5) {
      container.classList.add('cols-5');
    } else if (count >= 6) {
      container.classList.add('cols-6');
    }

    container.innerHTML = this.colors.map((color, index) => {
      return `
        <div class="ls-variant-card" data-index="${index}">
          <div class="ls-variant-thumb ls-interactive-slot" onclick="window.linesheetApp.pickImageForColor(${index})" title="${color.name} Görselini Değiştir">
            ${color.image ? `<img src="${color.image}" alt="${color.name}">` : `
              <div class="empty-slot-placeholder">
                <span>+ Görsel Ekle</span>
              </div>
            `}
          </div>
          <div class="ls-variant-info">
            <div class="ls-variant-label">Color:</div>
            <div class="ls-variant-name ls-editable" contenteditable="true" onblur="window.linesheetApp.colorManager.updateColorName(${index}, this.innerText)">${color.name}</div>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.ColorManager = ColorManager;
