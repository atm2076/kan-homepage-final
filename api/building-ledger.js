const SERVICE_BASE_URL = "https://apis.data.go.kr/1613000/BldRgstHubService";

function pad4(value, fallback = "0") {
  const raw = String(value ?? fallback).trim();
  if (!raw) return String(fallback).padStart(4, "0");
  return raw.padStart(4, "0");
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeItems(data) {
  const item = data?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function makeSummary(item) {
  if (!item) return null;

  const parkingCount =
    toNumber(item.indrMechUtcnt) +
    toNumber(item.oudrMechUtcnt) +
    toNumber(item.indrAutoUtcnt) +
    toNumber(item.oudrAutoUtcnt);

  return {
    대지위치: item.platPlc || "",
    도로명주소: item.newPlatPlc || "",
    건물명: item.bldNm || "",
    주용도: item.mainPurpsCdNm || "",
    구조: item.strctCdNm || "",
    사용승인일: item.useAprDay || "",
    지상층수: item.grndFlrCnt || "",
    지하층수: item.ugrndFlrCnt || "",
    연면적: item.totArea || "",
    건축면적: item.archArea || "",
    대지면적: item.platArea || "",
    용적률산정연면적: item.vlRatEstmTotArea || "",
    세대수: item.hhldCnt || "",
    가구수: item.fmlyCnt || "",
    주차대수: parkingCount ? String(parkingCount) : "",
    건폐율: item.bcRat || "",
    용적률: item.vlRat || ""
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "GET 방식만 지원합니다."
    });
  }

  try {
    const apiKey = process.env.BUILDING_HUB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        message: "BUILDING_HUB_API_KEY 환경변수가 없습니다."
      });
    }

    const {
      admCd,
      sigunguCd: inputSigunguCd,
      bjdongCd: inputBjdongCd,
      platGbCd: inputPlatGbCd,
      mtYn,
      bun: inputBun,
      ji: inputJi,
      lnbrMnnm,
      lnbrSlno,
      pageNo = "1",
      numOfRows = "10"
    } = req.query;

    let sigunguCd = inputSigunguCd;
    let bjdongCd = inputBjdongCd;

    if ((!sigunguCd || !bjdongCd) && admCd && String(admCd).length >= 10) {
      const code = String(admCd);
      sigunguCd = code.slice(0, 5);
      bjdongCd = code.slice(5, 10);
    }

    const bun = pad4(inputBun || lnbrMnnm);
    const ji = pad4(inputJi || lnbrSlno || "0");
    const platGbCd = inputPlatGbCd || (String(mtYn) === "1" ? "1" : "0");

    if (!sigunguCd || !bjdongCd || !bun) {
      return res.status(400).json({
        ok: false,
        message: "조회에 필요한 값이 부족합니다. admCd 또는 sigunguCd/bjdongCd, bun 또는 lnbrMnnm 값이 필요합니다.",
        example1: "/api/building-ledger?admCd=4719011700&lnbrMnnm=991&lnbrSlno=4&mtYn=0",
        example2: "/api/building-ledger?sigunguCd=47190&bjdongCd=11700&bun=0991&ji=0004&platGbCd=0"
      });
    }

    const apiUrl = new URL(`${SERVICE_BASE_URL}/getBrTitleInfo`);

    apiUrl.searchParams.set("serviceKey", apiKey);
    apiUrl.searchParams.set("sigunguCd", sigunguCd);
    apiUrl.searchParams.set("bjdongCd", bjdongCd);
    apiUrl.searchParams.set("platGbCd", platGbCd);
    apiUrl.searchParams.set("bun", bun);
    apiUrl.searchParams.set("ji", ji);
    apiUrl.searchParams.set("pageNo", pageNo);
    apiUrl.searchParams.set("numOfRows", numOfRows);
    apiUrl.searchParams.set("_type", "json");

    const response = await fetch(apiUrl.toString());
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        ok: false,
        message: "공공데이터 응답을 JSON으로 변환하지 못했습니다.",
        status: response.status,
        raw: text
      });
    }

    const header = data?.response?.header;
    const body = data?.response?.body;
    const items = normalizeItems(data);
    const firstItem = items[0] || null;

    return res.status(200).json({
      ok: true,
      resultCode: header?.resultCode || "",
      resultMsg: header?.resultMsg || "",
      totalCount: body?.totalCount || items.length,
      request: {
        sigunguCd,
        bjdongCd,
        platGbCd,
        bun,
        ji
      },
      summary: makeSummary(firstItem),
      items
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "건축물대장 조회 중 오류가 발생했습니다.",
      error: error.message
    });
  }
}
