# Raymons • Linesheet Studio 🧵✨

Tekstil ve hazır giyim koleksiyonları için **Otomatik Linesheet Oluşturma Sistemi**. 
Müşteriden gelen Excel dosyalarını otomatik ayrıştırır, kumaş karışım ikonlarını interaktif olarak yerleştirir, model/ürün görsellerini akıllı olarak eşleştirir, renk varyantlarını sıralar ve **WhatsApp için optimize edilmiş hafif PDF** veya **300 DPI Matbaa Baskı PDF** çıktısı üretir.

---

## 🚀 Öne Çıkan Özellikler

1. **📊 Otomatik Excel Ayrıştırıcı (Smart Excel Parser)**
   - Müşteriden gelen `.xlsx` ve `.xls` formatındaki dosyaları (örn: `müşteriden gelen excel.xlsx`) sürükle-bırak yöntemiyle sisteme yükleyin.
   - `Article No` (Ürün Kodu), `Composition` (Kumaş İçeriği), `Color` (Ana Renk), `Colors` (Tüm Renk Varyantları), `Asorti` ve `Total` (Toplam Adet) bilgilerini otomatik olarak algılar ve şablondaki yerlerine yerleştirir.
   - Kumaş içeriğindeki lifleri (Pamuk, Naylon/Polyamid, Likra, Akrilik, Keten, Viskon, vb.) otomatik analiz ederek uygun karışım ikonlarını kendiliğinden seçer.

2. **🏷️ İnteraktif Karışım İkonları Seçici (Fabric Blend & Feature Icons)**
   - Paneldeki kumaş lifi veya konfor özelliği ikonuna (Polyamid, Likra, Pamuk, Akrilik, Polyester, Nefes Alabilir, Yumuşak Doku, 4 Yönlü Esnek, Su İtici, Hızlı Kuruma vb.) tek tıkla tıklayarak linesheet başlığına anında ekleyebilir veya çıkarabilirsiniz.
   - İkonlar vektörel ve yüksek çözünürlüklü olarak alt etiketleriyle birlikte yerleşir.

3. **📸 Akıllı Görsel Eşleştirme ve Slot Yönetimi**
   - Tüm ürün fotoğraflarını toplu olarak sürükleyip bırakabilirsiniz.
   - **⚡ Akıllı Eşleştir:** Dosya isimlerini analiz eder (Örn: `P1059-Vizon-İmaj.jpg` -> Sağ Büyük Hero Görseli; `Model-Ön` -> Detay 1 ve 2; `Ghost-Ön` -> Detay 4; `Siyah`, `Lacivert`, `Kahve`, `Haki` -> İlgili renk varyantı slotlarına) ve otomatik yerleştirir.
   - Şablon üzerindeki herhangi bir görsele tıklayarak anında görsel değiştirebilirsiniz.

4. **🎨 Renk Sıralaması ve Dinamik Izgara (Multi-Color Flow)**
   - Panelden renk varyantlarını sürükle-bırak (⋮⋮) veya yukarı/aşağı butonlarıyla kolayca sıralayabilirsiniz.
   - 4 renkten 18 renge kadar renk sayısı arttığında şablon otomatik olarak düzenli ve estetik 5-6 sütunlu grid yapısına geçer.

5. **💬 PDF Çıktı Kalite Seçenekleri (WhatsApp & Baskı)**
   - **🟢 WhatsApp PDF (Hızlı & Hafif):** WhatsApp üzerinden müşteriye anında iletilebilen, dosya kotası yemeyen ve akıllı telefonlarda saniyeler içinde açılan optimize edilmiş hafif PDF (~800KB).
   - **🔵 Baskı PDF (300 DPI HQ):** Matbaa baskısı, fuar ve büyük ekran sunumları için kristal netliğinde yüksek çözünürlüklü vektör & raster PDF.
   - **🖼️ WhatsApp Görseli (JPG):** Belge açmadan direkt resim olarak WhatsApp sohbetine göndermek isteyenler için tek tıkla görsel indirme.

---

## 💻 Canlı Demo ve GitHub Pages Kurulumu

Bu proje hiçbir harici sunucuya (backend) bağımlı değildir; tamamen tarayıcı üzerinde (client-side) çalışır. Bu sayede **GitHub Pages** üzerinde ücretsiz ve anında canlıya alınabilir!

### GitHub'a Yükleme ve Yayına Alma:

1. **GitHub'da Yeni Repo Oluşturun:**
   - [github.com/new](https://github.com/new) adresine gidin.
   - Depo adı olarak örn: `raymons-linesheet` yazın ve **Create repository** deyin.

2. **Terminalden Kodları Gönderin:**
   ```bash
   git init
   git add .
   git commit -m "feat: Raymons Linesheet Studio canlı versiyon"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADINIZ/raymons-linesheet.git
   git push -u origin main
   ```

3. **GitHub Pages'i Açın:**
   - GitHub reponuzda **Settings** > **Pages** menüsüne gidin.
   - **Build and deployment** kısmında Source: **Deploy from a branch** seçin.
   - Branch: `main` ve folder: `/ (root)` seçip **Save** butonuna tıklayın.
   - 1-2 dakika içinde `https://KULLANICI_ADINIZ.github.io/raymons-linesheet/` adresinde canlı yayına geçecektir!

---

## 🖥️ Bilgisayarınızda Yerel Test Etme

Sistem yerel olarak da hemen test edilebilir:

```bash
# Node.js ile (Hemen açık ve çalışır durumda):
node server.js
# Tarayıcınızda açın: http://127.0.0.1:3000

# VEYA Python ile:
python3 -m http.server 3000
```

---

## 📂 Dosya Yapısı

```
Raymons linesheet/
├── index.html                   # Ana uygulama arayüzü (Tek sayfa web uygulaması)
├── server.js                    # Yerel test HTTP sunucusu (Node.js)
├── css/
│   └── style.css                # Raymons Life lüks studio arayüzü ve piksel-hassas linesheet tasarımı
├── js/
│   ├── app.js                   # Ana uygulama yönetimi, durum senkronizasyonu ve zoom kontrolleri
│   ├── excel-parser.js          # Müşteri Excel dosyasını (tek sütun / çok sütun) çözen akıllı ayrıştırıcı
│   ├── icon-manager.js          # Karışım ikon kataloğu ve interaktif seçim yöneticisi
│   ├── image-manager.js         # Toplu görsel yükleme, akıllı dosya adı eşleştirme ve slot kontrolü
│   ├── color-manager.js         # Renk varyantları sürükle-bırak sıralama ve grid düzenleyici
│   └── export-manager.js        # WhatsApp ve 300 DPI baskı PDF derleyicisi
├── assets/
│   ├── logo.png                 # Orijinal Raymons Life vektörel logosu
│   ├── footer.png               # Orijinal Raymons web/instagram/QR footer görseli
│   ├── icons/                   # Naylon, Likra, Pamuk, Akrilik, Nefes Alabilir vb. 18+ kumaş ikonu
│   ├── samples/                 # P1059 örnek ürün ve manken çekimleri
│   └── ornek_musteri_excel.xlsx # 18 renkli test müşteri Excel dosyası
└── libs/                        # Çevrimdışı ve hızlı çalışan kütüphaneler (SheetJS, jsPDF, html2canvas, SortableJS)
```

---
© Raymons Life — Linesheet Automation Studio
