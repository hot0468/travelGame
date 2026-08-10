# 장소 사진

장소 팝업 상단에 뜨는 사진을 여기에 둔다.

## 파일명

`<POI id>.jpg` — id 는 `data/busan.js` 의 `pois[].id` 다.

```
assets/photos/haeundae.jpg      해운대해수욕장
assets/photos/gamcheon.jpg      감천문화마을
assets/photos/jagalchi.jpg      자갈치시장
```

id 목록은 이렇게 뽑는다.

```bash
node -e "global.window=global;eval(require('fs').readFileSync('data/busan.js','utf8'));
  console.log(REGIONS.busan.pois.map(p=>p.id+'  '+p.name).join('\n'))"
```

## 없어도 된다

파일이 없는 장소는 사진 자리가 **아예 생기지 않는다**(`onerror` 로 요소를 지운다).
136곳을 한꺼번에 채울 필요 없이 있는 것부터 넣으면 된다.

## 규격

- **가로형**을 쓴다. 표시 영역이 236×104px 이고 `object-fit:cover` 라 가운데가 남는다.
- 폭 **600px 안팎**이면 충분하다. 원본을 그대로 넣으면 배포물만 무거워진다.
- `file://` 에서 여는 앱이라 외부 URL·CDN 은 못 쓴다. 반드시 이 폴더의 실제 파일이어야 한다.

## 라이선스

**배포물에 들어가므로 저작권을 확인하고 넣어야 한다.** 직접 찍은 사진이나
상업적 이용이 허용된 것만 쓴다(공공누리 1유형, CC0, 퍼블릭 도메인 등).
출처 표시가 필요한 사진을 쓴다면 앱에도 표기를 남겨야 한다 —
지도가 CC BY-SA 라 겪던 문제를 사진으로 되풀이하지 않도록 한다.

## 지금 들어있는 사진

25장은 `node tools/mkphoto.js` 로 한국관광공사 TourAPI 에서 받았다.
저작권 구분이 **공공누리 제1유형** 또는 **출처표시-변경금지** 인 것만 골랐다.
출처: 한국관광공사 (https://knto.or.kr) — 배포 시 출처 표기를 유지한다.

나머지 111곳은 TourAPI 에 없거나 이름이 안 맞아 못 받았다. **부산 주요 명소가
되레 많이 빠져 있다** — 해운대해수욕장·해동용궁사·오륙도·이기대·범어사는
API 목록 자체에 없다(부산 관광지 146건뿐). 그런 곳은 admin.html 로 직접 넣어야 한다.

## 크기 줄이기

`node tools/resize.js` — assets/photos 의 사진을 폭 600px, 236:104 로 잘라 다시 저장한다.
원본을 그대로 두면 배포물이 무거워진다(받은 직후 25장에 13MB → 줄인 뒤 1MB).
의존성 없이 헤드리스 Edge 의 캔버스를 빌려 처리한다.
