// Vercel 서버 함수: 기상청 API를 대신 불러 필요한 값만 돌려준다.
// 인증키는 서버 환경변수 KMA_SERVICE_KEY 에만 있고, 브라우저로는 절대 보내지 않는다.
import { REGION } from "../src/config.js";
import { baseDateTime, parseNcst, parseWarning, toIso } from "../lib/kma.js";

const NCST_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
// 기상특보 조회서비스의 특보 현황 조회. 엔드포인트는 공공데이터포털 문서로 확인 필요
const WARN_URL = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getPwnStatus";

const CACHE_MS = 10 * 60 * 1000;
// 공공데이터포털은 가끔 느려서 넉넉히 8초 (Vercel 무료 플랜 함수 제한 시간 안쪽)
const TIMEOUT_MS = 8000;
let cache = null; // { at, body }

function serviceKey() {
  const key = process.env.KMA_SERVICE_KEY;
  if (!key) return null;
  // Encoding 키를 넣었어도 동작하도록 한 번 풀어 둔다 (URLSearchParams 가 다시 인코딩함)
  return key.includes("%") ? decodeURIComponent(key) : key;
}

async function getJson(url, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}?${new URLSearchParams(params)}`, { signal: ctrl.signal });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      // 키 오류 등은 JSON 이 아니라 XML 로 오는 경우가 있다
      const msg = text.match(/<(?:returnAuthMsg|resultMsg)>([^<]*)</)?.[1];
      throw new Error(`JSON 이 아닌 응답 (HTTP ${res.status}${msg ? `, ${msg}` : ""})`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// 성공한 응답은 Vercel 앞단(CDN)에서도 10분 동안 재사용해, 접속자가 많아도
// 기상청 호출은 10분에 한 번 정도만 일어나게 한다 (무료 플랜 한도 대비).
// 실패한 응답은 1분만 재사용해, 키를 넣거나 기상청이 살아나면 곧 반영되게 한다.
const CACHE_OK = "public, s-maxage=600, stale-while-revalidate=60";
const CACHE_FAIL = "public, s-maxage=60";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", CACHE_OK);

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return res.status(200).json(cache.body);
  }

  const key = serviceKey();
  if (!key) {
    res.setHeader("Cache-Control", CACHE_FAIL);
    return res.status(200).json({ ok: false, error: "인증키가 설정되지 않았습니다 (Vercel 환경변수 KMA_SERVICE_KEY)" });
  }

  const { date, time } = baseDateTime();
  const common = { serviceKey: key, pageNo: "1", numOfRows: "100", dataType: "JSON" };

  const [ncst, warn] = await Promise.allSettled([
    getJson(NCST_URL, { ...common, base_date: date, base_time: time, nx: String(REGION.nx), ny: String(REGION.ny) }).then(parseNcst),
    getJson(WARN_URL, { ...common, numOfRows: "10" }).then((j) => parseWarning(j, REGION.warningArea)),
  ]);

  if (ncst.status === "rejected") {
    console.error(ncst.reason);
    res.setHeader("Cache-Control", CACHE_FAIL);
    // detail: 원인 확인용 (인증키는 들어가지 않는다)
    return res.status(200).json({ ok: false, error: "기상청 실황을 불러오지 못했습니다", detail: describe(ncst.reason) });
  }
  if (warn.status === "rejected") console.error(warn.reason);

  const body = {
    ...ncst.value,
    ...(warn.status === "rejected" && { warningDetail: describe(warn.reason) }),
    // 특보만 실패하면 강수량은 보여 주고 특보는 "unknown"(확인 불가)으로 둔다
    warning: warn.status === "fulfilled" ? warn.value : "unknown",
    observedAt: toIso(date, time),
    ok: true,
  };
  cache = { at: Date.now(), body };
  return res.status(200).json(body);
}

function describe(err) {
  if (err?.name === "AbortError") return `기상청 응답이 ${TIMEOUT_MS / 1000}초 안에 오지 않았습니다`;
  const code = err?.cause?.code;
  return String(err?.message ?? err) + (code ? ` (${code})` : "");
}
