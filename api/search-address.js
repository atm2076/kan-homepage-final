export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "GET 요청만 가능합니다.",
        results: [],
      });
    }

    const keyword = req.query.keyword;

    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({
        error: "검색어는 2글자 이상 입력해주세요.",
        results: [],
      });
    }

    const apiKey = process.env.JUSO_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "JUSO_API_KEY 환경변수가 설정되지 않았습니다.",
        results: [],
      });
    }

    const url = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    url.searchParams.set("confmKey", apiKey);
    url.searchParams.set("currentPage", "1");
    url.searchParams.set("countPerPage", "10");
    url.searchParams.set("keyword", keyword.trim());
    url.searchParams.set("resultType", "json");

    const response = await fetch(url.toString());
    const data = await response.json();

    const common = data?.results?.common;

    if (common?.errorCode !== "0") {
      return res.status(400).json({
        error: common?.errorMessage || "주소 검색 중 오류가 발생했습니다.",
        results: [],
      });
    }

    const results = data?.results?.juso || [];

    return res.status(200).json({
      results: results.map((item) => ({
        roadAddr: item.roadAddr,
        jibunAddr: item.jibunAddr,
        zipNo: item.zipNo,
        admCd: item.admCd,
        rnMgtSn: item.rnMgtSn,
        bdMgtSn: item.bdMgtSn,
        detBdNmList: item.detBdNmList,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: "주소 검색 서버 오류가 발생했습니다.",
      detail: error.message,
      results: [],
    });
  }
}
