/**
 * RAYMONS LINESHEET STUDIO - EXCEL PARSER
 * Robust Garment & Textile Linesheet Parser
 *
 * Kurallar:
 * 1. Artıcle / Article yazan kısımdaki numara -> Article No: kısmına
 * 2. Color : bilgisinde ilk yazılan renk -> Ana Renk (üstteki Color: kısmına),
 *    sonraki yazılan renkler -> diğer renkler (alttaki renk varyantlarına)
 * 3. Asorti : bilgisi ve altındaki beden dağılımı -> Asorti: kısmına
 * 4. Toplam : ... adet yazan bilgi -> Total: .. Pcs kısmına ("adet" -> "Pcs" çevrilir)
 * 5. En sonda (veya % içeren) karışım bilgisi -> Composition: kısmına
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

    const flatRows = [];
    rows.forEach(row => {
      if (Array.isArray(row)) {
        const cells = row.map(c => String(c).trim()).filter(Boolean);
        if (cells.length > 0) {
          flatRows.push({
            raw: cells.join(' | '),
            cells: cells
          });
        }
      }
    });

    if (flatRows.length === 0) return result;

    let currentSection = 'header';
    const asortiLines = [];
    const allFoundColors = [];

    for (let i = 0; i < flatRows.length; i++) {
      const { raw, cells } = flatRows[i];

      // 1. Article / Artıcle No
      if (/^(art[ıiIİ]cle|model|ürün\s*kodu|kod)/i.test(raw)) {
        const afterColon = raw.split(/[:：|]/).slice(1).join(':').trim();
        if (afterColon) {
          result.articleNo = afterColon;
        } else if (cells.length > 1) {
          result.articleNo = cells[1];
        }
        continue;
      }

      // 2. Color / Renk Header
      if (/^(color|renk|colors|renkler)\b/i.test(raw)) {
        const afterColon = raw.split(/[:：|]/).slice(1).join(':').trim();
        if (afterColon) {
          // If multiple colors are comma-separated on the same line, split them
          const inlineColors = afterColon.split(/[,/]/).map(s => s.trim()).filter(Boolean);
          allFoundColors.push(...inlineColors);
        }
        currentSection = 'colors';
        continue;
      }

      // 3. Asorti Header
      if (/^asort[ıiIİ]|^beden/i.test(raw)) {
        const afterColon = raw.split(/[:：|]/).slice(1).join(':').trim();
        if (afterColon) {
          asortiLines.push(afterColon);
        }
        currentSection = 'asorti';
        continue;
      }

      // 4. Toplam / Total
      if (/^(toplam|total)\b/i.test(raw)) {
        let afterColon = raw.split(/[:：|]/).slice(1).join(':').trim();
        if (!afterColon && cells.length > 1) {
          afterColon = cells[1];
        }
        if (!afterColon) {
          afterColon = raw.replace(/^(toplam|total)\s*/i, '').trim();
        }
        // Convert "4 adet" -> "4 Pcs"
        afterColon = afterColon
          .replace(/\badet\b/gi, 'Pcs')
          .replace(/\bpcs\b/gi, 'Pcs')
          .trim();
        if (afterColon && !/pcs/i.test(afterColon)) {
          afterColon += ' Pcs';
        }
        result.total = afterColon;
        currentSection = 'after_total';
        continue;
      }

      // 5. Composition / Karışım (explicit header or contains % or at the end)
      if (/^(composition|kumaş|içerik|karışım)\b/i.test(raw) || /%/.test(raw)) {
        const afterColon = /^(composition|kumaş|içerik|karışım)\s*[:：]/i.test(raw)
          ? raw.split(/[:：]/).slice(1).join(':').trim()
          : raw.replace(/\s*\|\s*/g, ' ').trim();
        result.composition = afterColon;
        continue;
      }

      // Section-based collection
      if (currentSection === 'colors') {
        const lineVal = cells[0];
        if (lineVal && !/^(asorti|toplam|total|composition|kumaş)/i.test(lineVal) && !/%/.test(lineVal)) {
          allFoundColors.push(lineVal);
        }
      } else if (currentSection === 'asorti') {
        const lineVal = cells.join(' ');
        if (lineVal && !/^(toplam|total|composition|kumaş)/i.test(lineVal) && !/%/.test(lineVal)) {
          asortiLines.push(lineVal);
        }
      } else if (currentSection === 'after_total') {
        // En sonda yazan karışım bilgisi (% olmasa bile son satırda kumaş yazıyorsa)
        const lineVal = cells.join(' ').trim();
        if (lineVal && !result.composition) {
          result.composition = lineVal;
        }
      }
    }

    // Fallback: En son satır henüz composition olarak atanmadıysa ve after_total'daysa kontrol et
    if (!result.composition && flatRows.length > 0) {
      const lastRow = flatRows[flatRows.length - 1].raw;
      if (/%|pamuk|naylon|polyester|elestan|elastan|akrilik|viskon|keten|yün|lycra|nylon|cotton/i.test(lastRow)) {
        result.composition = lastRow.replace(/^(composition|karışım|kumaş)\s*[:：]\s*/i, '').trim();
      }
    }

    // İlk yazılan renk Ana Renk (Color:), sonraki yazılan renkler Diğer Renkler
    if (allFoundColors.length > 0) {
      result.mainColor = allFoundColors[0];
      result.colors = allFoundColors.slice(1);
    }

    // Format Asorti
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
