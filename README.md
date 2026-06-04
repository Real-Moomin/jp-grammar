# N1 Practice Site

정적 HTML/CSS/JS로 만든 JLPT N1 문법, 어휘, 발음 문제 풀이 사이트입니다.

이 사이트는 Bunpro나 JLPT 기출의 실제 문항을 추출하거나 복제하지 않습니다. 포함된 문제는 N1 출제 포인트를 바탕으로 새로 작성한 오리지널 문제입니다.

## 구성

- 문법: 200문항
- 어휘: 200문항
- 발음/한자 읽기: 200문항
- 전체: 600문항

## 열기

`index.html`을 브라우저로 열면 바로 동작합니다.

풀이 기록과 해설 열림 상태는 브라우저의 IndexedDB에 저장됩니다.

## 데이터 교체

문제는 `data.js`의 `window.N1_QUESTIONS` 배열에 있습니다. `scripts/generate-data.js`를 수정한 뒤 `node scripts/generate-data.js`를 실행하면 `data.js`가 다시 생성됩니다. 직접 작성했거나 사용 허가를 받은 문제로 이 배열을 바꿔도 됩니다.

필수 필드:

- `id`: 고유 ID
- `category`: `grammar`, `vocabulary`, `reading`
- `typeLabel`: 화면에 표시할 유형 이름
- `title`: 문제 지시문
- `prompt`: 본문 또는 문장
- `choices`: 4지선다 선택지
- `answer`: 정답 번호, 1부터 시작
- `explanation`: 해설

선택 필드:

- `speakText`: 발음 문제에서 브라우저 TTS로 읽을 일본어 문장
