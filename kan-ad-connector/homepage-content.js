"use strict";

(function () {
  const PROPERTY_STORAGE_KEY = "kanAdConnectorProperty";
  const JOB_STORAGE_KEY = "kanAdConnectorJob";
  const DIRECT_BOX_ID = "kan-direct-send-box";
  const STYLE_ID = "kan-direct-send-style";
  const OFFICE_PHONE = "010-5323-3883";

  function cleanText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  function toTextList(value) {
    if (Array.isArray(value)) {
      return value.map(cleanText).filter(Boolean);
    }

    return cleanText(value)
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function removePrivateFields(property) {
    const copy = { ...(property || {}) };

    [
      "private_memo",
      "real_unit",
      "entrance_password",
      "key_location",
      "owner_name",
      "owner_phone",
      "client_info",
      "request_method",
      "staff_memo",
      "internal_tags"
    ].forEach((key) => {
      delete copy[key];
    });

    return copy;
  }

  function readPropertyFromPage() {
    try {
      const rawValue = window.localStorage.getItem(PROPERTY_STORAGE_KEY);
      if (!rawValue) return null;
      return removePrivateFields(JSON.parse(rawValue));
    } catch (error) {
      return null;
    }
  }

  function normalizeMoney(value) {
    const text = cleanText(value);
    if (!text) return "가격협의";
    if (text.includes("만원") || text.includes("억") || text.includes("원")) return text;
    return `${text}만원`;
  }

  function getPriceText(property) {
    const tradeType = cleanText(property.trade_type) || "월세";
    const isSale =
      cleanText(property.category).includes("매매") || tradeType === "매매";

    if (isSale) {
      return `매매 ${normalizeMoney(property.sale_price)}`;
    }

    if (tradeType === "전세") {
      return `전세 ${normalizeMoney(property.deposit)}`;
    }

    return `보증금 ${normalizeMoney(property.deposit)} / 월세 ${normalizeMoney(property.rent)}`;
  }

  function buildDaangnAd(property) {
    const propertyType = [property.category, property.trade_type]
      .map(cleanText)
      .filter(Boolean)
      .join(" ");

    const price = getPriceText(property);
    const options = toTextList(property.convenience).slice(0, 12).join(", ");

    const titleBase =
      cleanText(property.title) ||
      [cleanText(property.address) || "구미", propertyType].filter(Boolean).join(" ");

    const title = `${titleBase}｜${price}`.replace(/\s+/g, " ").slice(0, 60);

    const body = [
      `🏠 ${propertyType || "구미 부동산 매물"}`,
      cleanText(property.address) ? `📍 ${property.address}` : "📍 구미시",
      `💰 ${price}`,
      `관리비: ${property.maintenance_fee || "확인 필요"}`,
      "",
      cleanText(property.summary),
      cleanText(property.description),
      "",
      `구조: ${property.room_bath || property.structure || "확인 필요"}`,
      `면적: ${property.area || "확인 필요"}`,
      `층수: ${property.floor_info || property.total_floor_info || "확인 필요"}`,
      `방향: ${property.direction || "확인 필요"}`,
      `입주가능일: ${property.move_in || "협의 가능"}`,
      `주차: ${property.parking || "확인 필요"}`,
      options ? `옵션: ${options}` : "",
      cleanText(property.location_description)
        ? `생활권: ${property.location_description}`
        : "",
      "",
      "✅ 실사진 직접 확인 매물",
      "✅ 허위매물 없이 확인 후 안내드립니다.",
      "",
      `문의: ${OFFICE_PHONE}`
    ]
      .filter((line) => line !== "")
      .join("\n");

    return { title, body };
  }

  function buildConnectorProperty(property) {
    const publicProperty = removePrivateFields(property);
    const daangnAd = buildDaangnAd(publicProperty);

    return {
      ...publicProperty,
      title: daangnAd.title,
      description: daangnAd.body,
      daangnTitle: daangnAd.title,
      daangnBody: daangnAd.body,
      adTitle: daangnAd.title,
      adDescription: daangnAd.body
    };
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "#" + DIRECT_BOX_ID + "{" +
      "margin:16px 0 18px;" +
      "padding:16px;" +
      "border:2px solid #173f73;" +
      "border-radius:18px;" +
      "background:#f3f7ff;" +
      "box-shadow:0 10px 22px rgba(23,63,115,.12);" +
      "}" +
      "#" + DIRECT_BOX_ID + " strong{" +
      "display:block;" +
      "font-size:16px;" +
      "margin-bottom:6px;" +
      "color:#0f2a44;" +
      "}" +
      "#" + DIRECT_BOX_ID + " p{" +
      "margin:0 0 12px;" +
      "font-size:13px;" +
      "line-height:1.5;" +
      "color:#405166;" +
      "}" +
      "#" + DIRECT_BOX_ID + " button{" +
      "width:100%;" +
      "padding:14px 16px;" +
      "border:0;" +
      "border-radius:14px;" +
      "background:#173f73;" +
      "color:#fff;" +
      "font-size:16px;" +
      "font-weight:800;" +
      "cursor:pointer;" +
      "}" +
      "#" + DIRECT_BOX_ID + " button:disabled{" +
      "opacity:.55;" +
      "cursor:not-allowed;" +
      "}" +
      "#" + DIRECT_BOX_ID + " .kan-direct-status{" +
      "margin-top:10px;" +
      "padding:10px;" +
      "border-radius:10px;" +
      "background:#fff;" +
      "font-size:13px;" +
      "line-height:1.5;" +
      "color:#172033;" +
      "}";

    document.head.appendChild(style);
  }

  function findAdPanel() {
    const panels = Array.from(
      document.querySelectorAll(".admin-property-tabs, .admin-detail-panel, section, div")
    );

    return (
      panels.find((panel) => {
        const text = panel.innerText || panel.textContent || "";
        return (
          text.includes("게시 상태") &&
          text.includes("광고 노출") &&
          text.includes("당근")
        );
      }) ||
      panels.find((panel) => {
        const text = panel.innerText || panel.textContent || "";
        return text.includes("광고관리") && text.includes("게시 상태");
      })
    );
  }

  async function sendToDaangn(statusElement, button) {
    const pageProperty = readPropertyFromPage();

    if (!pageProperty) {
      statusElement.textContent = "먼저 관리자모드에서 매물을 선택하고 광고관리 탭을 열어주세요.";
      return;
    }

    const connectorProperty = buildConnectorProperty(pageProperty);

    const job = {
      property: connectorProperty,
      channels: ["daangn"],
      createdAt: new Date().toISOString(),
      source: "admin-direct-button"
    };

    try {
      button.disabled = true;
      statusElement.textContent = "당근 화면을 여는 중입니다...";

      await chrome.storage.local.set({
        [PROPERTY_STORAGE_KEY]: connectorProperty,
        [JOB_STORAGE_KEY]: job
      });

      const response = await chrome.runtime.sendMessage({
        type: "KAN_START_AD_PREP",
        payload: job
      });

      if (response && response.ok) {
        statusElement.textContent =
          "당근 화면을 열었습니다. 당근 등록 화면에서 오른쪽 '현재 화면 자동입력' 버튼을 누르세요.";
      } else {
        statusElement.textContent =
          "당근 화면 연결 실패: " +
          ((response && response.error) || "연동기 background 연결을 확인해 주세요.");
      }
    } catch (error) {
      statusElement.textContent =
        "연동기 실행 실패: 확장프로그램을 새로고침한 뒤 다시 눌러주세요.";
    } finally {
      button.disabled = false;
    }
  }

  function ensureDirectButton() {
    const pageProperty = readPropertyFromPage();
    const panel = findAdPanel();

    if (!pageProperty || !panel) return;

    let box = document.getElementById(DIRECT_BOX_ID);

    if (!box) {
      addStyles();

      box = document.createElement("div");
      box.id = DIRECT_BOX_ID;
      box.innerHTML =
        "<strong>광고 바로 보내기</strong>" +
        "<p>연동기 팝업을 열지 않고 현재 매물을 당근 등록 화면으로 바로 보냅니다.</p>" +
        "<button type='button' id='kanDirectDaangnButton'>당근으로 바로 보내기</button>" +
        "<div class='kan-direct-status' id='kanDirectDaangnStatus'>버튼을 누르면 당근 화면이 열립니다.</div>";

      panel.insertBefore(box, panel.firstChild);

      const button = document.getElementById("kanDirectDaangnButton");
      const statusElement = document.getElementById("kanDirectDaangnStatus");

      button.addEventListener("click", function () {
        sendToDaangn(statusElement, button);
      });
    }
  }

  function startObserver() {
    ensureDirectButton();

    const observer = new MutationObserver(function () {
      ensureDirectButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();
