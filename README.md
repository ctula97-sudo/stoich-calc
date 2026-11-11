# 화학량론 계산기 (화학식 조성 → 원소별 칭량량)

화학식과 기준 원소 질량을 넣으면 나머지 원소의 칭량량(g, 0.0001 g 단위)을 계산한다.

- 웹: https://ctula97-sudo.github.io/stoich-calc/ (폰에서 열고 "홈 화면에 추가")
- 오프라인 단일 파일: `stoich-calc.html`
- 원자량: CIAAW Standard Atomic Weights 2024 (간격 원소는 IUPAC 관용값)

## 계산 방식
- 기준 원소 모드: 몰수 = 질량 / (몰비 × 원자량) → 나머지 원소 질량 = 몰수 × 몰비 × 원자량
- 총 질량 모드: 몰수 = 목표 질량 / 화학식량
- 결과 카드의 질량을 직접 고치면 그 원소를 새 기준으로 재계산

## 개발
```
node test.js                       # 계산·파서·원자량 회귀 테스트
python3 build_weights.py --check   # 내장 원자량 vs CIAAW 대조
./deploy.sh                        # 빌드 + 커밋 + GitHub Pages 배포
```
- `parse_ciaaw.py` 로 https://www.ciaaw.org/atomic-weights.htm 표를 JSON으로 파싱해 대조한다.
- `_smoke.html` 은 headless chromium 렌더·상호작용 스모크 테스트용 하네스다.