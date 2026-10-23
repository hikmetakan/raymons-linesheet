/**
 * RAYMONS LINESHEET STUDIO - EXPORT MANAGER
 * Generates WhatsApp-optimized and High-Resolution Print PDFs and Images
 * Uses mathematical pre-baked Canvas rendering for every image slot so
 * images NEVER stretch, squish, or distort in exported PDFs/JPGs.
 */

class ExportManager {
  constructor(app) {
    this.app = app;
    this.modal = document.getElementById('export-modal');
    this.progressContainer = document.getElementById('export-progress');
    this.progressBar = document.getElementById('progress-fill');
    this.progressText = document.getElementById('progress-text');
    this.selectedQuality = 'whatsapp'; // 'whatsapp' | 'print' | 'image'

    this.initEvents();
  }

  initEvents() {
    document.querySelectorAll('#export-modal .quality-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#export-modal .quality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedQuality = card.dataset.quality;
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.hideModal();
      });
    }

    const confirmBtn = document.getElementById('btn-confirm-export');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.runExport(this.selectedQuality));
    }
  }

  showModal(presetQuality = 'whatsapp') {
    if (!this.modal) return;
    this.selectedQuality = presetQuality;

    document.querySelectorAll('#export-modal .quality-card').forEach(c => {
      const isMatch = c.dataset.quality === presetQuality;
      c.classList.toggle('selected', isMatch);
      const radio = c.querySelector('input[type="radio"]');
      if (radio) radio.checked = isMatch;
    });

    this.progressContainer.classList.remove('active');
    this.progressBar.style.width = '0%';
    this.modal.classList.add('active');
  }

  hideModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
  }

  setProgress(pct, text) {
    if (!this.progressContainer) return;
    this.progressContainer.classList.add('active');
    this.progressBar.style.width = `${pct}%`;
    this.progressText.innerText = text;
  }

  /**
   * Execute Export based on Quality Option
   */
  async runExport(quality = this.selectedQuality) {
    const sheet = document.getElementById('linesheet-sheet');
    if (!sheet) return;

    const articleNo = this.app.data.articleNo || 'Linesheet';
    const mainColor = this.app.data.mainColor || 'Model';
    const filenameBase = `Raymons-${articleNo}-${mainColor}`.replace(/\s+/g, '_');

    const confirmBtn = document.getElementById('btn-confirm-export');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      if (quality === 'image') {
        this.setProgress(20, 'Görsel yüksek kalitede hazırlanıyor...');
        const canvas = await this.renderSheetToCanvas(sheet, 2.0);
        this.setProgress(80, 'Görsel kaydediliyor...');

        const link = document.createElement('a');
        link.download = `${filenameBase}-WhatsApp.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.88);
        link.click();

        this.setProgress(100, 'Tamamlandı!');
        setTimeout(() => this.hideModal(), 700);
      } else if (quality === 'whatsapp') {
        this.setProgress(25, 'WhatsApp PDF optimize ediliyor...');
        const scale = 1.4;
        const canvas = await this.renderSheetToCanvas(sheet, scale);

        this.setProgress(65, 'PDF oluşturuluyor...');
        const imgData = canvas.toDataURL('image/jpeg', 0.78);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: [1080, 1850],
          compress: true
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1850, undefined, 'FAST');
        this.setProgress(90, 'Dosya indiriliyor...');
        pdf.save(`${filenameBase}-WhatsApp.pdf`);

        this.setProgress(100, 'Tamamlandı!');
        setTimeout(() => this.hideModal(), 700);
      } else {
        this.setProgress(20, 'Yüksek çözünürlüklü baskı sayfası taranıyor...');
        const scale = 2.2;
        const canvas = await this.renderSheetToCanvas(sheet, scale);

        this.setProgress(70, 'Baskı kalitesinde PDF derleniyor...');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: [1080, 1850],
          compress: true
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1850);
        this.setProgress(90, 'Dosya kaydediliyor...');
        pdf.save(`${filenameBase}-Baski_HQ.pdf`);

        this.setProgress(100, 'Tamamlandı!');
        setTimeout(() => this.hideModal(), 700);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Dışa aktarma sırasında bir hata oluştu: ' + err.message);
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  /**
   * Pre-bake every image slot to an exact-aspect-ratio <canvas> before html2canvas
   * so html2canvas NEVER stretches or squishes any photo.
   */
  async renderSheetToCanvas(element, scale = 1.5) {
    const wrapper = document.getElementById('canvas-wrapper');
    const originalTransform = wrapper ? wrapper.style.transform : '';
    const originalWidth = wrapper ? wrapper.style.width : '';
    const originalHeight = wrapper ? wrapper.style.height : '';

    if (wrapper) {
      wrapper.style.transform = 'scale(1)';
      wrapper.style.width = '1080px';
      wrapper.style.height = '1850px';
    }

    // Temporarily remove active selection outlines and pre-bake all image frames
    element.classList.add('is-exporting');
    const bakedRestorers = [];

    const frames = element.querySelectorAll('.ls-image-frame');
    frames.forEach(frame => {
      const img = frame.querySelector('img');
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const slotKey = frame.dataset.slotKey;
      const t = this.app.imageManager.getTransform(slotKey);

      const slotW = frame.clientWidth || parseFloat(frame.dataset.w) || 208;
      const slotH = frame.clientHeight || parseFloat(frame.dataset.h) || 238;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      const coverRatio = Math.max(slotW / imgW, slotH / imgH);
      const baseW = imgW * coverRatio;
      const baseH = imgH * coverRatio;

      const s = t.scale || 1.0;
      const drawW = baseW * s;
      const drawH = baseH * s;
      const drawX = (slotW - drawW) / 2 + (t.x || 0);
      const drawY = (slotH - drawH) / 2 + (t.y || 0);

      // Create high-res baked canvas for this slot
      const slotCanvas = document.createElement('canvas');
      const bakeScale = Math.max(2, scale);
      slotCanvas.width = Math.round(slotW * bakeScale);
      slotCanvas.height = Math.round(slotH * bakeScale);
      slotCanvas.style.width = `${slotW}px`;
      slotCanvas.style.height = `${slotH}px`;
      slotCanvas.style.display = 'block';

      const ctx = slotCanvas.getContext('2d');
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(0, 0, slotCanvas.width, slotCanvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        drawX * bakeScale,
        drawY * bakeScale,
        drawW * bakeScale,
        drawH * bakeScale
      );

      img.style.display = 'none';
      frame.appendChild(slotCanvas);

      bakedRestorers.push(() => {
        slotCanvas.remove();
        img.style.display = '';
      });
    });

    try {
      const canvas = await html2canvas(element, {
        scale: scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 1080,
        height: 1850
      });
      return canvas;
    } finally {
      bakedRestorers.forEach(restore => restore());
      element.classList.remove('is-exporting');
      if (wrapper) {
        wrapper.style.transform = originalTransform;
        wrapper.style.width = originalWidth;
        wrapper.style.height = originalHeight;
      }
    }
  }
}

window.ExportManager = ExportManager;
