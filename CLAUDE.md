# 여행설계사 (부산 여행 일정 설계 게임)

빌드·의존성 없는 단일 HTML 브라우저 게임. `index.html` 더블클릭으로 실행되며,
**file:// 에서 항상 동작해야 한다** (웹폰트·CDN·fetch·type=module 금지, classic script만).

## 구조

```
index.html      UI + 엔진 전부 인라인 (~1100줄). CSS → HTML → JS(엔진 → 상태 → 렌더 → 이벤트 → 자체점검)
data/busan.js   부산 데이터: REGIONS.busan = { mapImage, origins, starts, staminaTypes,
                sightTypes/foodTypes/ageTypes, pois(136), quests(6) }
assets/         지도 SVG (CC BY-SA — 아래 라이선스 참조)
tools/          검증·캡처 스크립트 (아래)
```

핵심 엔진 함수(index.html): `compute(state)` 일정 시뮬레이션(비용·시간·체력·위반),
`travel(a,b,mode,people,depart,weekend)` 이동시간(직선거리×1.35, 출퇴근 1.5배),
`drain()` 체력, `dowOf()` 요일. 상태는 전역 `S`, 렌더는 `render()` 하나로 전부 다시 그림.

## 검증 — 코드·데이터를 바꿨으면 반드시

```bash
node tools/all.js          # 스위트 9종 전부 (selftest/stam/buff/sub/dow/ret/day/rule/balance)
```

- **밸런스 재조정 절차**: POI·의뢰·엔진 수치를 바꾸면 `node tools/balance.js` 로 의뢰별
  탐색 상한을 재측정하고, `data/busan.js` 의 `par` 를 **상한의 62%**(`balance.js` 의 `PAR`)로
  맞춘다. 조정 후 all.js 재실행.
  - 별 기준은 `par×1.25`(★3)/`par`(★2)/`par×0.75`(★1)라 **par 를 상한에서 역산하는 순간
    `상한 ≥ par×1.25` 검사는 항상 참이 된다** — 동어반복이라 아무것도 못 걸러낸다.
    그래서 balance 는 **★3 선이 상한의 몇 %인가**(`CEIL`=85% 이하)로 판정한다.
    62% → ★3 선이 상한의 77.5%. 이전 78% 설정은 97.5%여서 사람 손에 닿지 않았다.
- balance 는 **시드 고정 + 반복수 고정(ITER=3000, 약 80초)**. 둘 다 상한값을 좌우하므로
  par 를 보정한 반복수를 바꾸면 보정이 무효가 된다. 빠른 확인만 원하면 `ITER=300 node tools/balance.js`.
  수단은 구간별 최적화 패스로 고른다 — 무작위로 굴리면 도보·지하철이 섞여 상한이 과소평가된다.
- 브라우저 자체점검: `index.html?test` 로 열면 콘솔에 동일 검사가 돈다.

## 화면 확인 (헤드리스 Edge)

```bash
node tools/mkcal.js -e "S.quest=REGIONS.busan.quests[0];S.xp=600;S.arriveId='ktx';render();" [--freeze]
powershell -NoProfile -File tools/shot.ps1 [-Out _shot.png -W 1600 -H 1000 -Scale 2]   # 스크린샷
powershell -NoProfile -File tools/probe.ps1                                            # DOM 값 읽기
```

- 프로브 패턴: 주입 코드에서 `document.title='PROBE '+JSON.stringify({...})` 로 값을 내보낸다.
- **헤드리스 함정**: `--virtual-time-budget` 아래에서는 CSS 애니메이션·smooth 스크롤이
  진행되지 않고 0% 프레임에 멈춘다. 등장 애니메이션 붙은 요소(dialog 등)가 안 보이면
  버그가 아니라 이것 — 캡처용으로만 `--freeze` 를 쓴다. `getBoundingClientRect` 는
  transform 중간값을 반환하므로 위치 검증은 `style.left`/`offsetWidth` 같은 레이아웃 값으로.
- 확인 끝나면 `_cal.html`, `_shot.png` 삭제 (gitignore 되어 있음).

## 규칙

- **이모지 금지.** 아이콘은 index.html 상단 Lucide 스프라이트(50여 종)를 `ic('이름')` 헬퍼로.
  새 아이콘: `curl -sfSL https://unpkg.com/lucide-static@latest/icons/이름.svg` 받아서
  `<symbol id="i-이름">` 으로 스프라이트에 추가.
- **큰 파일 수정**: index.html 은 정확한 문자열 치환으로. node 스크립트에서
  치환 수가 **정확히 1인지** 확인하고(0이면 미적용, 2 이상이면 엉뚱한 곳까지 바뀜),
  수정 후 항상 `new Function(스크립트부)` 문법 체크. CRLF 경고는 무해.
  - **먼 앵커까지 `slice` 금지.** `s.slice(s.indexOf(A), s.indexOf(B))` 로 함수 하나를 떼려다
    사이의 350줄을 통째로 날린 적이 있다. 바꿀 문자열만 좁게 잡아 치환한다.
  - `git checkout` 으로 복원하면 CRLF 로 돌아와 `\n` 기준 치환이 전부 실패한다. LF 로 정규화 후 진행.
- **`.ps1` 은 UTF-8 BOM 으로 저장.** Windows PowerShell 5.1 은 BOM 이 없으면 한글을 ANSI 로
  오독해 문자열 종결자를 잃고 파싱이 깨진다(`TerminatorExpectedAtEndOfString`).
  `[IO.File]::WriteAllText($p, $txt, [Text.UTF8Encoding]::new($true))`.
- **주석·커밋 메시지는 한국어.**
- **git 커밋·푸시는 사용자가 요청할 때만.** 임의로 올리지 않는다.
- 임시 스크립트는 작업 후 삭제.

## 라이선스 (배포물이므로 지켜야 함)

- 지도 `assets/busan-map-geo.svg`: 위키미디어 부산 행정구역도, © 밥풀떼기, **CC BY-SA 4.0**.
  원본에서 지명 레이어만 제거한 파생물 — 앱 하단·README 의 저작자/라이선스/수정 표기를
  지울 수 없다. SVG를 index.html 에 인라인하지 말 것(코드까지 SA에 묶일 소지).
  재보정 근거: 기장 북단 y=6px=35.3866, 태종대 y=692px=35.0517, 경도축척=위도축척×cos(35.1°).
- Lucide 아이콘: ISC. 스프라이트 상단 주석 유지.

## 게임 규칙 요약 (수치 바꿀 때 참고)

- 이동: 도보4.5/버스18/지하철26/택시24/렌터카28 km/h. 출퇴근(07:30-09:30, 18:00-20:00) 버스·택시·
  렌터카 최대 1.5배, 도보·지하철 무관, 주말 무관. 교통패스 버프는 버스+지하철 일 6천원 상한.
  각 수단은 주행시간에 `walk`(정류장까지 도보)+`wait`(배차·주차) 를 더한다 — 버스5+3, 지하철4+2,
  택시0+2, 렌터카3+7분. `travel()` 이 `walkMin`/`waitMin` 로 내보내 UI 에 따로 표시한다.
  **실제 노선·정류장 데이터는 없다.** 거리는 직선×1.35 근사이므로 버스 번호·환승 안내는 불가.
- 체력: 이동 소모(도보.45/버스.25/지하철.20/택시.10/렌터카.13 분당), 관광 .16, 식사 -.15(카페 절반).
  수면<8h → 다음날 한계 감소. 타입: 아침형(23시 넘기면 페널티)/야행성(새벽 1.6배)/
  에너자이저(×0.7)/멀미(이동 ×2).
- 요일: `startDow` 기준, `closed:[요일]` 휴무, 금·토 체크인 숙박 1.4배.
- 숙소 등급: `SLEEP_TIER` 로 다음날 체력 한계가 달라진다(게스트하우스 ×.94 / 모텔 ×1 / 호텔 ×1.08).
  숙박비는 `ceil(인원/2)` 객실이라 **4인 의뢰에선 최고급 호텔이 예산에 안 들어간다** — 최고급 5곳이
  쓰이는 곳은 2인·고예산인 q6 뿐이다. 비싼 숙소를 더 넣으려면 2인 의뢰를 함께 넣어야 한다.
- 귀가 마감: 의뢰별 `endBy`(자정 기준 분). 마지막 날 그 시각까지 출발지에 도착해야 제출 가능.
- 도시간 교통편: 귀가편을 지정하면 요금·소요시간을 **왕복으로** 계산한다(요금 ×2, 도착편 `min`
  만큼 이동시간 가산). 마감 판정은 출발지점 도착 기준이라 이 구간은 제외. 체력은 올 때만
  `origins[].drain` 으로 깎는다.
- 선호: `ageTypes[연령].likes` 에 든 관광지 sub 는 만족도 +3.
- 점수 = 만족도×10 − 이동분 + 예산잔여%×100. 별: par×1.25↑=3, par↑=2, par×0.75↑=1.
