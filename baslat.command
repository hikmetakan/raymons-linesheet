#!/bin/bash
cd "$(dirname "$0")"
echo "==================================================="
echo "  RAYMONS LINESHEET STUDIO - YEREL SUNUCU"
echo "==================================================="
echo ""

if command -v node >/dev/null 2>&1; then
    echo "[OK] Node.js tespit edildi."
    echo "Sunucu açılıyor: http://localhost:3000"
    open "http://localhost:3000"
    node server.js
elif command -v python3 >/dev/null 2>&1; then
    echo "[OK] Python3 tespit edildi."
    echo "Sunucu açılıyor: http://localhost:3000"
    open "http://localhost:3000"
    python3 -m http.server 3000
else
    echo "[HATA] Sistemde Node.js veya Python bulunamadı."
fi
