/**
 * RAYMONS LINESHEET STUDIO - EXCEL PARSER
 * Robust Garment & Textile Linesheet Parser
 *
 * Desteklenen Formatlar:
 * 1. Raymons_Linesheet_Siparis_Formu.xlsx (Profesyonel Müşteri Şablonu - Çok Sayfalı)
 * 2. Tek sütunlu serbest müşteri listeleri (örn: müşteriden gelen excel.xlsx, 21011.xlsx)
 * 3. Tablo / kolonlu sipariş listeleri (örn: Başlıksız e-tablo.xlsx)
 */

class ExcelParser {
  /**
   * Parse an Excel file (ArrayBuffer, File, or raw string/CSV)
   * Scans all sheets in the workbook and automatically selects the sheet
   * that contains the most complete garment data.
   * @param {File|ArrayBuffer|string} fileOrBufferOrText
   * @returns {Promise<Object>} Extracted Linesheet Data
   */
  static async parse(fileOrBufferOrText) {
    // If raw string / CSV passed
    if (typeof fileOrBufferOrText === 'string') {
      return this.parseText(fileOrBufferOrText);
    }

    let data;
    if (fileOrBufferOrText instanceof File) {
      // Check if it's a CSV or text file
      if (fileOrBufferOrText.name && fileOrBufferOrText.name.toLowerCase().endsWith('.csv')) {
        const text = await fileOrBufferOrText.text();
        return this.parseText(text);
      }
      data = await fileOrBufferOrText.arrayBuffer();
    } else {
      data = fileOrBufferOrText;
    }

    const workbook = XLSX.read(data, { type: 'array' });
    let bestResult = null;
    let highestScore = -1;

    // Scan all sheets in the workbook
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows || rows.length === 0) continue;

      const result = this.extractGarmentData(rows, sheetName);
      const score = this.calculateCompletenessScore(result, sheetName);

      // Prioritize the sheet with the most valid data
      if (score > highestScore) {
        highestScore = score;
        bestResult = result;
      }
    }

    if (!bestResult || highestScore <= 0) {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) : [];
      return this.extractGarmentData(rows, workbook.SheetNames[0]);
    }

    return bestResult;
  }

  /**
   * Parse raw CSV or pasted text directly (tab-separated or comma-separated)
   */
  static parseText(text) {
    if (!text || typeof text !== 'string') return null;

    try {
      // Use SheetJS CSV parser
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      return this.extractGarmentData(rows, 'PastedText');
    } catch (e) {
      // Manual fallback parser for simple lines
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const rows = lines.map(line => {
        if (line.includes('\t')) return line.split('\t').map(c => c.trim());
        return line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      });
      return this.extractGarmentData(rows, 'PastedFallback');
    }
  }

  /**
   * Score extracted data completeness
   */
  static calculateCompletenessScore(data, sheetName = '') {
    if (!data) return 0;
    let score = 0;
    if (data.articleNo && data.articleNo.length > 0) score += 20;
    if (data.mainColor && data.mainColor.length > 0 && !/örnek|vitrin|ana\s*renk|field/i.test(data.mainColor)) score += 15;
    if (data.composition && data.composition.length > 0 && !/örnek|kumaş\s*içeriği/i.test(data.composition)) score += 15;
    if (data.asorti && data.asorti.length > 0 && !/örnek|beden\s*dağılımı/i.test(data.asorti)) score += 15;
    if (data.total && data.total.length > 0 && !/örnek|toplam\s*pcs/i.test(data.total)) score += 10;
    if (Array.isArray(data.colors)) {
      const validColors = data.colors.filter(c => c && !/örnek|varyant|alan\s*adı|renk\s*adı/i.test(c));
      score += validColors.length * 2;
    }

    // BONUS: If this is NOT an "Örnek" / "Sample" reference sheet, give it priority!
    // That way, if the customer actually filled the Order Form sheet, it always takes precedence over the example sheet.
    const isReferenceSheet = /örnek|sample|referans|taslak|dolu/i.test(sheetName);
    if (!isReferenceSheet && score >= 20) {
      score += 200; // Real customer input always wins over reference example sheet
    }

    return score;
  }

  /**
   * Intelligently extract garment specifications from rows
   */
  static extractGarmentData(rows, sheetName = '') {
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

    // Helper: is placeholder instruction text
    const isPlaceholder = (str) => {
      if (!str) return true;
      return /^(örnek|model veya|vitrin\s*\/|kumaş içeriği|beden dağılımı|toplam adet|1\. varyant|\d+\.\s*varyant|alan adı|müşteri bilgi)/i.test(str.trim());
    };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;

      // Extract raw columns preserving positions
      const col0 = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
      const col1 = row.length > 1 && row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
      const col2 = row.length > 2 && row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';

      // All non-empty cells
      const cells = row.map(c => String(c).trim()).filter(Boolean);
      if (cells.length === 0) continue;

      const raw = cells.join(' | ');

      // Skip table header / instruction banner rows
      if (/ALAN ADI|FIELD NAME|ÖRNEK DOLDURULMUŞ|SİPARİŞ VE ÜRÜN BİLGİ/i.test(raw)) {
        continue;
      }

      // Check if this row is formatted as [Label, Value, (Optional Hint)]
      const isMultiCol = row.length >= 2;

      // 1. Article / Model No
      if (/^(art[ıiIİ]cle|model|ürün\s*kodu|kod)/i.test(col0) || /^(art[ıiIİ]cle|model)\s*[:：]/i.test(raw)) {
        let val = '';
        if (isMultiCol) {
          val = col1;
        } else {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val && !isPlaceholder(val)) {
          val = val.replace(/\.0$/, ''); // Clean Excel floats (e.g. 22920.0 -> 22920)
          result.articleNo = val;
        }
        continue;
      }

      // 2. Renk X / Color X (Explicit variant row from Raymons Form, e.g. 'Renk 1:', 'Bordo')
      if (/^(renk|color)\s*\d+[:：]?/i.test(col0)) {
        let val = isMultiCol ? col1 : '';
        if (!val) {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val && !isPlaceholder(val) && !/varyant|renk\s*adı|örnek/i.test(val)) {
          result.colors.push(val);
        }
        continue;
      }

      // 3. Main Color (Color / Ana Renk)
      if (/^(color|ana\s*renk|renk)\b/i.test(col0) || /^(color|renk)\s*[:：]/i.test(raw)) {
        let val = '';
        if (isMultiCol) {
          val = col1;
        } else {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val && !isPlaceholder(val)) {
          result.mainColor = val;
        }
        section = 'colors';
        continue;
      }

      // 4. Composition / Kumaş İçeriği
      if (/^(composition|kumaş|içerik|karışım)\b/i.test(col0) || /^(composition|kumaş)\s*[:：]/i.test(raw)) {
        let val = '';
        if (isMultiCol) {
          val = col1;
        } else {
          const parts = raw.split(/[:：]/);
          if (parts.length > 1) val = parts[1].trim();
        }
        if (val && !isPlaceholder(val)) {
          result.composition = val;
        }
        continue;
      }

      // 5. Asorti Header / Content
      if (/^(asort[ıiIİ]|beden)/i.test(col0) || /^asort[ıiIİ]\s*[:：]/i.test(raw)) {
        let val = '';
        if (isMultiCol) {
          val = col1;
        } else {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1 && parts[1].trim()) val = parts[1].trim();
        }
        if (val && !isPlaceholder(val)) {
          asortiLines.push(val);
        }
        section = 'asorti';
        continue;
      }

      // 6. Toplam / Total
      if (/^(toplam|total)\b/i.test(col0) || /^(toplam|total)\s*[:：]/i.test(raw)) {
        let val = '';
        if (isMultiCol) {
          val = col1;
        } else {
          const parts = raw.split(/[:：|]/);
          if (parts.length > 1) val = parts[1].trim();
          if (!val) val = raw.replace(/^(toplam|total)[:\s]*/i, '').trim();
        }
        if (val && !isPlaceholder(val)) {
          val = val.replace(/\.0$/, '');
          val = val.replace(/\badet\b/gi, 'Pcs').replace(/\bpcs\b/gi, 'Pcs').trim();
          if (val && !/pcs/i.test(val)) {
            val += ' Pcs';
          }
          result.total = val;
        }
        section = 'after_total';
        continue;
      }

      // 7. Diğer Renkler Header
      if (/diğer\s*renk|renkler|colors/i.test(col0) || /diğer\s*renk/i.test(raw)) {
        section = 'colors';
        continue;
      }

      // 8. Section-based collecting for single-column excels (e.g. 21011.xlsx, müşteriden gelen excel.xlsx)
      if (section === 'colors') {
        const val = col0 || (cells.length > 0 ? cells[0] : '');
        if (val && !isPlaceholder(val) && !/^(asorti|toplam|total|composition|kumaş|renk|diğer)/i.test(val) && !/%/.test(val)) {
          if (!result.mainColor) {
            result.mainColor = val;
          } else if (!result.colors.includes(val) && val !== result.mainColor) {
            result.colors.push(val);
          }
        }
      } else if (section === 'asorti') {
        const val = col0 || cells.join(' ');
        if (val && !isPlaceholder(val) && !/^(toplam|total|composition|kumaş)/i.test(val) && !/%/.test(val)) {
          asortiLines.push(val);
        }
      } else if (section === 'after_total') {
        if (!result.composition && (/%/.test(raw) || /pamuk|naylon|akrilik|polyester|viskon/i.test(raw))) {
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
