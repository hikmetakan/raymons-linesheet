/**
 * RAYMONS LINESHEET STUDIO - EXPORT MANAGER
 * Generates WhatsApp-optimized and High-Resolution Print PDFs and Images
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
    // Quality selection cards in modal
    document.querySelectorAll('.quality-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.quality-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedQuality = card.dataset.quality;
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Close button
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideModal());
    }

    // Overlay click to close
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.hideModal();
      });
    }

    // Start export button
    const confirmBtn = document.getElementById('btn-confirm-export');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.runExport(this.selectedQuality));
    }
  }

  showModal(presetQuality = 'whatsapp') {
    if (!this.modal) return;
    this.selectedQuality = presetQuality;

    document.querySelectorAll('.quality-card').forEach(c => {
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
        // Direct JPG download for WhatsApp photo sharing
        this.setProgress(20, 'Görsel hazırlanıyor...');
        const canvas = await this.renderSheetToCanvas(sheet, 1.5);
        this.setProgress(80, 'Görsel kaydediliyor...');

        const link = document.createElement('a');
        link.download = `${filenameBase}-WhatsApp.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.82);
        link.click();

        this.setProgress(100, 'Tamamlandı!');
        setTimeout(() => this.hideModal(), 800);
      } else if (quality === 'whatsapp') {
        // WhatsApp Optimized Lightweight PDF
        this.setProgress(25, 'WhatsApp PDF optimize ediliyor...');
        const scale = 1.25; // Optimized scale for sharp text and minimal file size
        const canvas = await this.renderSheetToCanvas(sheet, scale);

        this.setProgress(65, 'PDF oluşturuluyor...');
        const imgData = canvas.toDataURL('image/jpeg', 0.72); // Compressed JPEG

        const { jsPDF } = window.jspdf;
        // Linesheet dimensions: 1080 x 1850 pt
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
        setTimeout(() => this.hideModal(), 800);
      } else {
        // High Quality Print PDF (300 DPI HQ)
        this.setProgress(20, 'Yüksek çözünürlüklü baskı sayfası taranıyor...');
        const scale = 2.0; // Crystal sharp 2x render
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
        setTimeout(() => this.hideModal(), 800);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Dışa aktarma sırasında bir hata oluştu: ' + err.message);
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  /**
   * Render DOM element to canvas using html2canvas
   */
  async renderSheetToCanvas(element, scale = 1.5) {
    // Save current transform
    const wrapper = document.getElementById('canvas-wrapper');
    const originalTransform = wrapper ? wrapper.style.transform : '';
    if (wrapper) wrapper.style.transform = 'scale(1)';

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
      if (wrapper) wrapper.style.transform = originalTransform;
    }
  }
}

window.ExportManager = ExportManager;
