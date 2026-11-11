#!/usr/bin/env bash
# 앱을 빌드해 GitHub Pages로 배포한다. 수정 후 이 스크립트만 실행하면 폰에서 새로고침 시 반영된다.
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/6] 테스트"
node test.js

echo "[2/6] 아이콘 생성"
python3 generate_icons.py

echo "[3/6] 단일 파일 빌드 -> index.html"
python3 build_single.py --out index.html --keep-manifest

echo "[4/6] 서비스워커 캐시 버전 갱신"
python3 bump_sw.py

echo "[5/6] 커밋"
git add -A
if git diff --cached --quiet; then
  echo "변경 없음 — 배포 생략"
  exit 0
fi
git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M')"

echo "[6/6] 푸시"
git push -q origin main
echo "배포 완료: https://ctula97-sudo.github.io/stoich-calc/"