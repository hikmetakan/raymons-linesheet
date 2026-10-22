/**
 * RAYMONS LINESHEET STUDIO - FABRIC & BLEND ICON MANAGER
 * Manages fabric composition icons and performance features
 */

class IconManager {
  constructor(app) {
    this.app = app;

    // Full catalog of supported fabric & performance icons
    this.catalog = {
      nylon: {
        id: 'nylon',
        name: 'Polyamid / Naylon',
        code: 'NYLON',
        category: 'fabric',
        src: 'assets/icons/nylon.png',
        svgSrc: 'assets/icons/nylon.svg'
      },
      lycra: {
        id: 'lycra',
        name: 'Likra / Elastan',
        code: 'LYCRA',
        category: 'fabric',
        src: 'assets/icons/lycra.png',
        svgSrc: 'assets/icons/lycra.svg'
      },
      cotton: {
        id: 'cotton',
        name: 'Pamuk (Cotton)',
        code: 'COTTON',
        category: 'fabric',
        src: 'assets/icons/cotton.svg'
      },
      acrylic: {
        id: 'acrylic',
        name: 'Akrilik (Acrylic)',
        code: 'ACRYLIC',
        category: 'fabric',
        src: 'assets/icons/acrylic.svg'
      },
      polyester: {
        id: 'polyester',
        name: 'Polyester',
        code: 'POLYESTER',
        category: 'fabric',
        src: 'assets/icons/polyester.svg'
      },
      viscose: {
        id: 'viscose',
        name: 'Viskon (Viscose)',
        code: 'VISCOSE',
        category: 'fabric',
        src: 'assets/icons/viscose.svg'
      },
      wool: {
        id: 'wool',
        name: 'Yün (Wool)',
        code: 'WOOL',
        category: 'fabric',
        src: 'assets/icons/wool.svg'
      },
      linen: {
        id: 'linen',
        name: 'Keten (Linen)',
        code: 'LINEN',
        category: 'fabric',
        src: 'assets/icons/linen.svg'
      },
      modal: {
        id: 'modal',
        name: 'Modal',
        code: 'MODAL',
        category: 'fabric',
        src: 'assets/icons/modal.svg'
      },
      silk: {
        id: 'silk',
        name: 'İpek (Silk)',
        code: 'SILK',
        category: 'fabric',
        src: 'assets/icons/silk.svg'
      },
      breathable: {
        id: 'breathable',
        name: 'Nefes Alabilir',
        code: 'BREATHABLE\nFABRIC',
        category: 'feature',
        src: 'assets/icons/breathable.png',
        svgSrc: 'assets/icons/breathable.svg'
      },
      soft_touch: {
        id: 'soft_touch',
        name: 'Yumuşak Doku',
        code: 'SOFT\nTOUCH',
        category: 'feature',
        src: 'assets/icons/soft_touch.png',
        svgSrc: 'assets/icons/soft_touch.svg'
      },
      stretch: {
        id: 'stretch',
        name: '4 Yönlü Esnek',
        code: '4-WAY\nSTRETCH',
        category: 'feature',
        src: 'assets/icons/stretch.svg'
      },
      water_repellent: {
        id: 'water_repellent',
        name: 'Su İtici',
        code: 'WATER\nREPELLENT',
        category: 'feature',
        src: 'assets/icons/water_repellent.svg'
      },
      quick_dry: {
        id: 'quick_dry',
        name: 'Hızlı Kuruma',
        code: 'QUICK\nDRY',
        category: 'feature',
        src: 'assets/icons/quick_dry.svg'
      },
      easy_care: {
        id: 'easy_care',
        name: 'Kolay Ütülenir',
        code: 'EASY\nCARE',
        category: 'feature',
        src: 'assets/icons/easy_care.svg'
      }
    };

    // Currently active icons on the linesheet (IDs array)
    this.activeIcons = ['nylon', 'lycra', 'breathable', 'soft_touch'];

    this.renderPickerGrid();
    this.renderActiveTray();
    this.renderLinesheetIcons();
  }

  /**
   * Set active icons list (e.g. from Excel parser or presets)
   */
  setActiveIcons(iconIds) {
    this.activeIcons = iconIds.filter(id => this.catalog[id]);
    this.updateUI();
  }

  /**
   * Toggle an icon: clicking adds it to linesheet or removes if already active
   */
  toggleIcon(iconId) {
    if (!this.catalog[iconId]) return;

    const index = this.activeIcons.indexOf(iconId);
    if (index > -1) {
      // Remove
      this.activeIcons.splice(index, 1);
    } else {
      // Add (up to 5 icons)
      if (this.activeIcons.length >= 6) {
        alert('En fazla 6 adet karışım ikonu ekleyebilirsiniz.');
        return;
      }
      this.activeIcons.push(iconId);
    }

    this.updateUI();
  }

  removeIcon(iconId) {
    const index = this.activeIcons.indexOf(iconId);
    if (index > -1) {
      this.activeIcons.splice(index, 1);
      this.updateUI();
    }
  }

  updateUI() {
    this.renderPickerGrid();
    this.renderActiveTray();
    this.renderLinesheetIcons();
  }

  /**
   * Render the icon cards in the sidebar picker
   */
  renderPickerGrid() {
    const container = document.getElementById('icon-picker-grid');
    if (!container) return;

    container.innerHTML = Object.values(this.catalog).map(icon => {
      const isActive = this.activeIcons.includes(icon.id);
      return `
        <div class="icon-card ${isActive ? 'active' : ''}" data-id="${icon.id}" title="${icon.name}">
          <img src="${icon.src}" alt="${icon.name}">
          <span class="icon-card-name">${icon.name}</span>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.icon-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.toggleIcon(id);
      });
    });
  }

  /**
   * Render the active icons tray in the sidebar
   */
  renderActiveTray() {
    const tray = document.getElementById('active-icons-tray');
    if (!tray) return;

    if (this.activeIcons.length === 0) {
      tray.innerHTML = '<span style="font-size:0.75rem; color:#64748b;">Henüz ikon seçilmedi. Aşağıdan tıklayarak ekleyin.</span>';
      return;
    }

    tray.innerHTML = this.activeIcons.map(id => {
      const icon = this.catalog[id];
      if (!icon) return '';
      return `
        <div class="tray-icon-item" data-id="${id}">
          <span>${icon.name.split(' ')[0]}</span>
          <span class="remove-btn" title="Kaldır" onclick="window.linesheetApp.iconManager.removeIcon('${id}')">&times;</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render icons on the actual Linesheet sheet preview
   */
  renderLinesheetIcons() {
    const container = document.getElementById('ls-icons-row');
    if (!container) return;

    container.innerHTML = this.activeIcons.map(id => {
      const icon = this.catalog[id];
      if (!icon) return '';
      const formattedCode = icon.code.replace(/\n/g, '<br>');
      return `
        <div class="ls-icon-unit" title="${icon.name}">
          <div class="ls-icon-img">
            <img src="${icon.src}" alt="${icon.name}">
          </div>
          <div class="ls-icon-caption">${formattedCode}</div>
        </div>
      `;
    }).join('');
  }
}

window.IconManager = IconManager;
