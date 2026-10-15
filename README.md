# 빗물받이 막힘 감지 대시보드

빗물받이 막힘 감지 시스템의 시연용 웹 대시보드입니다. 날씨는 기상청 실제 데이터를 쓰고, 센서는 브라우저에서 만드는 가상 데이터를 씁니다. DB는 쓰지 않습니다.

## 내 컴퓨터에서 실행하기

```bash
npm install        # 처음 한 번
npm run dev        # http://localhost:5173 에서 열림
npm test           # 판정 로직·기상청 응답 처리 테스트
npm run scenario   # 시나리오 A~F 상태 변화를 콘솔에 출력
```

기상청 날씨까지 보려면 `.env.example` 을 복사해 `.env.local` 을 만들고 인증키를 넣습니다. `.env.local` 은 git에 올라가지 않습니다.

## Vercel 배포

1. vercel.com 에서 GitHub 저장소를 Import 합니다. 프로젝트 이름이 주소가 됩니다 (예: `이름.vercel.app`).
2. Settings → Environment Variables 에 `KMA_SERVICE_KEY` 를 추가합니다 (공공데이터포털의 Decoding 키).
3. 다시 배포(Redeploy)하면 날씨 카드에 실제 값이 나옵니다.

## 공공데이터포털 활용신청 (2개)

- 기상청_단기예보 조회서비스 (초단기실황 `getUltraSrtNcst`)
- 기상청_기상특보 조회서비스 (특보 현황 `getPwnStatus`)

특보 서비스의 엔드포인트와 응답 형식(`t6` 문구)은 아직 공식 문서로 확인하지 못했습니다. 키를 받은 뒤 실제 응답을 보고 `lib/kma.js` 의 `parseWarning` 을 맞춰야 할 수 있습니다. 특보 조회만 실패하면 화면에는 "확인 불가"로 나오고, 강수량은 그대로 보입니다.

날씨를 못 불러오면 날씨 카드 아래에 원인이 한 줄 나옵니다. `https://주소/api/weather` 를 직접 열어 봐도 됩니다.

## 바꿔야 할 곳

- `src/config.js` 의 `REGION`: 시범 지역(충북대학교 일대) 좌표, 기상청 격자(nx 68, ny 106), 특보 지역 이름. 격자는 위경도로 계산한 값이라 격자 엑셀과 한 번 대조하세요.
- `src/config.js` 의 `TH`: 판정 기준값. 모두 예시값이며 실측 후 보정합니다.
