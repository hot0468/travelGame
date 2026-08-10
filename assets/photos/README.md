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
