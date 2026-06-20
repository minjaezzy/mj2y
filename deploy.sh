#!/usr/bin/env bash
# mj2y-web 배포 스크립트
# 레포의 파일을 nginx가 서빙하는 /var/www/{ms,mj2y} 로 복사합니다.
# 사용법:  ./deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MS="/var/www/ms"
WWW="/var/www/mj2y"

mkdir -p "$MS/assets" "$WWW/assets"

# ── ms.mj2y.com (군 생활 메이트) ──────────────────────────
cp -f "$ROOT/ms/index.html"       "$MS/index.html"
cp -f "$ROOT/ms/assets/ms.css"    "$MS/assets/ms.css"
cp -f "$ROOT/ms/assets/app.js"    "$MS/assets/app.js"

# ── mj2y.com (포트폴리오) ─────────────────────────────────
cp -f "$ROOT/www/index.html"      "$WWW/index.html"
cp -f "$ROOT/www/resume.html"     "$WWW/resume.html"
cp -f "$ROOT/www/assets/mj2y.css" "$WWW/assets/mj2y.css"
cp -f "$ROOT/www/assets/mj2y.js"  "$WWW/assets/mj2y.js"

# ── 공유 디자인 시스템 → 양쪽에 ───────────────────────────
cp -f "$ROOT/shared/scrapbook.css" "$MS/assets/scrapbook.css"
cp -f "$ROOT/shared/scrapbook.css" "$WWW/assets/scrapbook.css"

echo "✓ 배포 완료"
echo "  ms.mj2y.com   ← $MS"
echo "  mj2y.com      ← $WWW"
echo ""
echo "정적 파일이라 nginx 재시작 불필요. 브라우저에 바로 반영됩니다."
echo "(CSS/JS를 바꿨다면 index.html의 ?v=N 숫자를 올려 캐시를 무효화하세요.)"
