---
name: verify
description: 코드·데이터 변경 후 검증 루프. 테스트 8종 실행, 밸런스 재조정, 헤드리스 스크린샷·DOM 프로브까지. "검증해", "테스트 돌려", "화면 확인", "스크린샷" 요청이나 index.html/data 수정을 마친 뒤 사용.
---

# 검증 루프

## 1. 테스트 (변경했으면 무조건)

```bash
node tools/all.js
```

실패 줄이 그대로 출력된다. 개별 실행: `node tools/balance.js` 등.

## 2. 밸런스 (POI·의뢰·엔진 수치를 바꿨으면)

`node tools/balance.js` 출력의 의뢰별 "최고" 점수가 탐색 상한.
`data/busan.js` 의 각 `par` 를 **상한 ≥ par×1.25** 로 맞춘다(★3 도달 가능 조건).
맞춘 뒤 1번 재실행.

## 3. 화면 확인 (UI를 건드렸으면)

```bash
# 상태를 주입한 미리보기 생성 (캡처용이면 --freeze 필수: 헤드리스는 애니메이션 0% 프레임에 멈춤)
node tools/mkcal.js -e "S.quest=REGIONS.busan.quests[0];S.xp=600;S.arriveId='ktx';render();" --freeze

powershell -NoProfile -File tools/shot.ps1              # → _shot.png (Read 도구로 열어 확인)
powershell -NoProfile -File tools/shot.ps1 -Scale 2     # 글자 검수용 2배
```

수치로 검증할 땐 주입 코드에 `document.title='PROBE '+JSON.stringify({...})` 를 넣고:

```bash
powershell -NoProfile -File tools/probe.ps1             # PROBE JSON 출력 (한글 안 깨짐)
```

주의: 위치·크기 검증은 `getBoundingClientRect` 대신 `style.left`/`offsetWidth`
(transform 애니메이션 중간값 함정). 끝나면 `rm -f _cal.html _shot.png`.

## 4. 마무리

커밋·푸시는 **사용자가 요청할 때만**.
