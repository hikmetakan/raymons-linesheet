/**
 * RAYMONS LINESHEET STUDIO - EXCEL PARSER
 * Robust Garment & Textile Linesheet Parser
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

    // Flatten rows into non-empty string list for sequential inspection
    const flatRows = [];
    rows.forEach(row => {
      if (Array.isArray(row)) {
        const rowStr = row.map(c => String(c).trim()).filter(Boolean).join(' | ');
        if (rowStr) {
          flatRows.push({
            raw: rowStr,
            cells: row.map(c => String(c).trim()).filter(Boolean)
          });
        }
      }
    });

    let currentSection = 'header';
    const asortiLines = [];

    for (let i = 0; i < flatRows.length; i++) {
      const { raw, cells } = flatRows[i];
      const lower = raw.toLowerCase();

      // 1. Article No
      if (/art[ıi]cle|model|kod|stok\s*kod/i.test(raw)) {
        const parts = raw.split(/[:：|]/);
        if (parts.length > 1) {
          result.articleNo = parts[1].trim();
        } else if (cells.length > 1) {
          result.articleNo = cells[1];
        }
        continue;
      }

      // 2. Composition (Kumaş İçeriği)
      if (/%|kumaş|içerik|kompozisyon|composition/i.test(raw) && !/asorti/i.test(raw)) {
        if (/%/.test(raw) || /pamuk|naylon|polyester|elestan|akrilik|viskon|keten|yün|lycra|nylon/i.test(raw)) {
          const parts = raw.split(/[:：]/);
          result.composition = (parts.length > 1 ? parts[1] : raw).trim();
          continue;
        }
      }

      // 3. Color / Renk Header & Main Color
      if (/^(color|renk)\s*[:：]/i.test(raw) || /color\s*\|/i.test(raw)) {
        const parts = raw.split(/[:：|]/);
        if (parts.length > 1) {
          result.mainColor = parts[1].trim();
        }
        currentSection = 'colors';
        continue;
      }

      // 4. Asorti Header
      if (/asorti|beden\s*dağılım/i.test(raw)) {
        currentSection = 'asorti';
        continue;
      }

      // 5. Total / Toplam
      if (/toplam|total/i.test(raw)) {
        const parts = raw.split(/[:：|]/);
        if (parts.length > 1) {
          result.total = parts[1].trim();
        } else if (cells.length > 1) {
          result.total = cells[1];
        } else {
          result.total = raw;
        }
        currentSection = 'after_total';
        continue;
      }

      // Section-based extraction
      if (currentSection === 'colors') {
        // Collect color rows
        const colorName = cells[0];
        if (colorName && !/asorti|toplam|total|adet|adet:|%/i.test(colorName)) {
          // Check if this looks like a color name
          if (colorName.length <= 30) {
            result.colors.push(colorName);
          }
        }
      } else if (currentSection === 'asorti') {
        // Collect size breakdown rows e.g. "M - 1", "31:1", "L:2"
        if (!/toplam|total|%/i.test(raw)) {
          asortiLines.push(raw);
        }
      } else if (currentSection === 'after_total') {
        // Look for composition if it came after total
        if (/%|pamuk|naylon|elestan|akrilik|polyester|viskon/i.test(raw)) {
          result.composition = raw;
        }
      }
    }

    // Format Asorti string
    if (asortiLines.length > 0) {
      result.asorti = asortiLines.join(' / ');
    }

    // Clean up Article No
    if (result.articleNo) {
      result.articleNo = result.articleNo.replace(/^(art[ıi]cle\s*no?[:\s]*)/i, '').trim();
    }

    // Clean up Total string (standardize to e.g. "Total: 10 Pcs" or "Toplam: 4 Adet")
    if (result.total) {
      result.total = result.total.replace(/^(toplam|total)[:\s]*/i, '').trim();
      if (!/adet|pcs|pieces/i.test(result.total)) {
        result.total += ' Pcs';
      }
    }

    // Auto-detect fabric blend keywords from composition
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

    if (/naylon|nylon|polyamid|polyamide/i.test(comp)) {
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
    if (/polyester|poly/i.test(comp)) {
      icons.push('polyester');
    }
    if (/viskon|viscose|rayon/i.test(comp)) {
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

    // Default comfort / performance features if icons < 4
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
