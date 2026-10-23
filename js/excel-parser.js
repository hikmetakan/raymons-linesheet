/**
 * RAYMONS LINESHEET STUDIO - EXCEL PARSER
 * Robust Garment & Textile Linesheet Parser
 *
 * Desteklenen Formatlar:
 * 1. Raymons_Linesheet_Siparis_Formu.xlsx (Profesyonel Müşteri Şablonu)
 * 2. Tek sütunlu serbest müşteri listeleri (örn: müşteriden gelen excel.xlsx)
 * 3. Tablo / kolonlu sipariş listeleri
 *
 * Kurallar:
 * - Artıcle / Article numara -> Article No:
 * - Color / Ana Renk -> İlk yazılan renk üstteki Color: alanına
 * - Diğer Renkler (Renk 1, Renk 2... veya alt satırlar) -> Alttaki Renk Varyantlarına
 * - Asorti -> Asorti: kısmına
 * - Toplam ... adet -> Total: .. Pcs kısmına ("adet" -> "Pcs" otomatik çevrilir)
 * - Kompozisyon (% veya kumaş lifi) -> Composition: kısmına
 */

class ExcelParser {
  /**
   * Parse an Excel file (ArrayBuffer or File)
   * @param {File|ArrayBuffer} fileOrBuffer
   * @returns {Promise<Object>} Extracted Linesheet Data
   */
  static async parse(fileOrBuffer) {
    let data;
    if (fileOrBuffer instanceof File) {
      data = await fileOrBuffer.arrayBuffer();
    } else {
      data = fileOrBuffer;
    }

    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    return this.extractGarmentData(rows);
  }

  /**
   * Intelligently extract garment specifications from rows
   */
  static extractGarmentData(rows) {
    const result = {
      articleNo: '',
      composition: '',
      mainColor: '',
      colors: [],
      asorti: '',
      total: '',
      suggestedIcons: []
    };

    const asortiLines = [];
    let section = 'header';

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      // Extract non-empty trimmed cells
      const cells = row.map(c => String(c).trim()).filter(Boolean);
      if (cells.length === 0) continue;

      const c0 = cells[0];
      const c1 = cells.length > 1 ? cells[1] : '';
      const raw = cells.join(' | ');

      // Skip table header titles
      if (/ALAN ADI|FIELD NAME|ÖRNEK DOLDURULMUŞ|SİPARİŞ VE ÜRÜN BİLGİ/i.test(raw)) {
        continue;
      }

      // 1. Article / Model No
      if (/^(art[ıiIİ]cle|model|ürün\s*kodu|kod)/i.test(c0) || /^(art[ıiIİ]cle|model)\s*[:：]/i.test(raw)) {
        let val = (c1 && !/^(art[ıiIİ]cle|model|kod)/i.test(c1)) ? c1 : '';
        if (!val) {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val) result.articleNo = val;
        continue;
      }

      // 2. Renk X / Color X (Explicit variant row from Raymons Form, e.g. 'Renk 1:', 'Bordo')
      if (/^(renk|color)\s*\d+[:：]?/i.test(c0)) {
        const val = (c1 && !/varyant|renk\s*adı|örnek/i.test(c1)) ? c1 : '';
        if (val) {
          result.colors.push(val);
        }
        continue;
      }

      // 3. Main Color (Color / Ana Renk)
      if (/^(color|ana\s*renk|renk)\b/i.test(c0) || /^(color|renk)\s*[:：]/i.test(raw)) {
        let val = (c1 && !/^(color|ana\s*renk|renk)/i.test(c1)) ? c1 : '';
        if (!val) {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1 && parts[1].trim()) val = parts[1].trim();
        }
        if (val) {
          result.mainColor = val;
        }
        section = 'colors';
        continue;
      }

      // 4. Composition / Kumaş İçeriği
      if (/^(composition|kumaş|içerik|karışım)\b/i.test(c0) || /^(composition|kumaş)\s*[:：]/i.test(raw)) {
        let val = (c1 && !/^(composition|kumaş|karışım)/i.test(c1)) ? c1 : '';
        if (!val) {
          const parts = raw.split(/[:：]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val) result.composition = val;
        continue;
      }

      // 5. Asorti Header
      if (/^(asort[ıiIİ]|beden)/i.test(c0) || /^asort[ıiIİ]\s*[:：]/i.test(raw)) {
        let val = (c1 && !/^(asort|beden)/i.test(c1)) ? c1 : '';
        if (!val) {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1 && parts[1].trim()) val = parts[1].trim();
        }
        if (val) asortiLines.push(val);
        section = 'asorti';
        continue;
      }

      // 6. Toplam / Total
      if (/^(toplam|total)\b/i.test(c0) || /^(toplam|total)\s*[:：]/i.test(raw)) {
        let val = (c1 && !/^(toplam|total)/i.test(c1)) ? c1 : '';
        if (!val) {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (!val) {
          val = raw.replace(/^(toplam|total)[:\s]*/i, '').trim();
        }
        val = val.replace(/\badet\b/gi, 'Pcs').replace(/\bpcs\b/gi, 'Pcs').trim();
        if (val && !/pcs/i.test(val)) {
          val += ' Pcs';
        }
        result.total = val;
        section = 'after_total';
        continue;
      }

      // 7. Diğer Renkler Header
      if (/diğer\s*renk|renkler|colors/i.test(c0) || /diğer\s*renk/i.test(raw)) {
        section = 'colors';
        continue;
      }

      // Section-based collecting for single-column excels
      if (section === 'colors') {
        const val = (c1 && !c0) ? c1 : c0;
        if (val && !/^(asorti|toplam|total|composition|kumaş|renk|diğer)/i.test(val) && !/%/.test(val)) {
          if (!result.mainColor) {
            result.mainColor = val;
          } else {
            result.colors.push(val);
          }
        }
      } else if (section === 'asorti') {
        const val = (c1 && !c0) ? c1 : cells.join(' ');
        if (val && !/^(toplam|total|composition|kumaş)/i.test(val) && !/%/.test(val)) {
          asortiLines.push(val);
        }
      } else if (section === 'after_total') {
        if (!result.composition) {
          result.composition = raw;
        }
      }
    }

    if (asortiLines.length > 0) {
      result.asorti = asortiLines.join(' / ');
    }

    // Auto-detect fabric blend icons from composition
    result.suggestedIcons = this.detectIconsFromComposition(result.composition);

    return result;
  }

  /**
   * Match Turkish & English textile words to icon IDs
   */
  static detectIconsFromComposition(compositionText) {
    if (!compositionText) return ['nylon', 'lycra', 'breathable', 'soft_touch'];

    const comp = compositionText.toLowerCase();
    const icons = [];

    if (/naylon|nylon|polyamid|polyamide|poliamid/i.test(comp)) {
      icons.push('nylon');
    }
    if (/elestan|elastan|elastane|lycra|likra|spandex/i.test(comp)) {
      icons.push('lycra');
    }
    if (/pamuk|cotton/i.test(comp)) {
      icons.push('cotton');
    }
    if (/akrilik|acrylic/i.test(comp)) {
      icons.push('acrylic');
    }
    if (/polyester|pes\b/i.test(comp)) {
      icons.push('polyester');
    }
    if (/viskon|viskoz|viscose|rayon/i.test(comp)) {
      icons.push('viscose');
    }
    if (/keten|linen/i.test(comp)) {
      icons.push('linen');
    }
    if (/yün|wool/i.test(comp)) {
      icons.push('wool');
    }
    if (/modal/i.test(comp)) {
      icons.push('modal');
    }
    if (/ipek|silk/i.test(comp)) {
      icons.push('silk');
    }

    // Add default comfort features up to 4 icons
    if (!icons.includes('breathable') && icons.length < 4) {
      icons.push('breathable');
    }
    if (!icons.includes('soft_touch') && icons.length < 4) {
      icons.push('soft_touch');
    }

    return icons.slice(0, 4);
  }
}

window.ExcelParser = ExcelParser;
