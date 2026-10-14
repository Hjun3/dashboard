// 시범 지역, 빗물받이 목록, 판정 기준값을 모두 이 파일 한 곳에 모은다.

// ── 시범 지역 ─────────────────────────────────────────────
// TODO: 실제 시범 지역으로 바꿀 것 (지금 값은 임시 좌표)
// center: 지도 중심 위경도
// nx, ny: 기상청 격자 좌표. 공공데이터포털 활용가이드 압축파일의 격자 엑셀에서 찾아 넣는다.
// warningArea: 기상특보 문구에서 시범 지역을 찾을 때 쓰는 지역 이름 (예: "서울", "경기도")
//   화면에는 표시하지 않고 서버에서 특보 판별에만 쓴다.
export const REGION = {
  label: "시범 지역",
  center: { lat: 37.5665, lng: 126.978 },
  zoom: 16,
  nx: 60,
  ny: 127,
  warningArea: "서울",
};

// ── 가상 빗물받이 6개 ──────────────────────────────────────
// lat/lng 는 지도 중심에서 조금씩 떨어진 위치 (가상)
const c = REGION.center;
export const DRAINS = [
  { id: "A", name: "시범 1번", lat: c.lat + 0.0012, lng: c.lng - 0.0016 },
  { id: "B", name: "시범 2번", lat: c.lat + 0.0013, lng: c.lng + 0.0010 },
  { id: "C", name: "시범 3번", lat: c.lat - 0.0002, lng: c.lng - 0.0021 },
  { id: "D", name: "시범 4번", lat: c.lat - 0.0003, lng: c.lng + 0.0019 },
  { id: "E", name: "시범 5번", lat: c.lat - 0.0014, lng: c.lng - 0.0008 },
  { id: "F", name: "시범 6번", lat: c.lat - 0.0012, lng: c.lng + 0.0007 },
];

// ── 판정 기준값 ───────────────────────────────────────────
// 모든 숫자는 예시값이다. 실측 후 보정한다.
// 시간 단위는 분, 수위(level)는 구조물 기준선에 대한 상대 값
//   0 = 바닥, 1 = 배수관 상단, 2 = 바스켓 바닥, 3 = 그레이팅 바로 아래
export const TH = {
  collectLoad: 70, // 수거 필요: 적재량(%) 이상 (실측 후 보정)

  pipeTop: 1, // 배수관 상단 기준선
  bottomHoldMin: 35, // 하부 막힘: 비 그친 뒤 배수관 위 수위가 유지되는 시간 (실측 후 보정)

  floodWarn: 2, // 침수 주의: 바스켓 바닥 기준선 (실측 후 보정)
  floodDanger: 2.8, // 침수 위험: 그레이팅 바로 아래(3)에 가까운 값 (실측 후 보정)
  floodLoadDrop: 15, // 비 오는 중 30분 안에 적재량이 이만큼(%p) 줄면 물에 뜨는 힘으로 봄 (실측 후 보정)
  levelSurge: 0.6, // 30분 안에 수위가 이만큼 오르면 급상승 (실측 후 보정)

  coverRainMin: 100, // 덮임 의심: 비가 이 시간 이상 왔는데 (실측 후 보정)
  coverLevelRange: 0.15, // 수위 변화폭이 이보다 작고 (실측 후 보정)
  coverLoadRange: 3, // 적재량 변화폭(%p)이 이보다 작으면 (실측 후 보정)
  coverKeepMin: 180, // 비가 그친 뒤에도 이 시간 동안은 덮임 의심을 유지 (실측 후 보정)

  rssiGradualDrop: 15, // 신호가 서서히 이만큼(dB) 약해지면 "덮임 가능성 높음" (실측 후 보정)
  rssiSuddenDrop: 15, // 한 번에 이만큼(dB) 떨어지면 급락 = 차량 등 일시 가림 (실측 후 보정)
  vehicleMaxMin: 60, // 일시 가림으로 보고 지켜보는 최대 통신 끊김 시간 (실측 후 보정)
  vehicleNoteMin: 60, // 일시 가림 기록을 근거 문장에 남기는 시간 (실측 후 보정)

  batteryLow: 15, // 배터리(%) 이하면 저하 (실측 후 보정)
  cleanZero: 5, // 청소 감지: 적재량이 이 값 아래로 (실측 후 보정)
  cleanDrop: 25, // 한 번에 이만큼(%p) 이상 떨어지면 청소로 봄 (실측 후 보정)
  cleanNoteMin: 120, // 청소 기록을 근거 문장에 남기는 시간
  seatDiff: 20, // 청소 후 좌우 무게 차이(%)가 이보다 크면 안착 불량 (실측 후 보정)
  freezeTempC: 0, // 기온이 이 값 이하면 결빙 가능 → 적재량 판정 보류
};

// 시나리오: 화면 1초 = 실제 5분
export const SCENARIO = {
  lengthSec: 60,
  minPerSec: 5,
};

// 실시간 모드: 가상 센서 측정 간격(분)과 처음에 채워 둘 과거 기록(분)
export const LIVE = {
  sampleEveryMin: 1,
  backfillMin: 120,
  weatherRefreshMin: 10,
};
