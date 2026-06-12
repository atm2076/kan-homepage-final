"use strict";

(function () {
  var PROPERTY_STORAGE_KEY = "kanAdConnectorProperty";
  var JOB_STORAGE_KEY = "kanAdConnectorJob";
  var BOX_ID = "kan-direct-daangn-box";
  var STYLE_ID = "kan-direct-daangn-style";

  function clean(value) {
    return value === undefined || value === null ? "" : String(value).trim();
  }

  function list(value) {
    if (Array.isArray(value)) return value.map(clean).filter(Boolean);
    return clean(value).split(/\n|,/).map(clean).filter(Boolean);
  }

  function money(value) {
    var text = clean(value);
    if (!text) return "확인 필요";
    return /^\d+(\.\d+)?$/.test(text) ? text + "만원" : text;
  }

  function numberOnly(value) {
    return clean(value)
      .replace(/,/g, "")
      .replace(/만원|원|약/g, "")
      .replace(/[^0-9.]/g, "");
  }

  function isSale(property) {
    return clean(property.category).indexOf("매매") !== -1 || clean(property.trade_type) === "매매";
  }

  function getProperty() {
    try {
      var raw = window.localStorage.getItem(PROPERTY_STORAGE_KEY);
      if (!raw) return null;

      var property = JSON.parse(raw);

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
      ].forEach(function (key) {
        delete property[key];
      });

      return property;
    } catch (error) {
      return null;
    }
  }

  function getRoomBath(property) {
    var text = clean(property.room_bath);
    var room = text.match(/방\s*(\d+)/);
    var bath = text.match(/욕실\s*(\d+)/);
    var simple = text.match(/(\d+)\s*\/\s*(\d+)/);

    return {
      room: room ? room[1] : simple ? simple[1] : "1",
      bath: bath ? bath[1] : simple ? simple[2] : "1"
    };
  }

  function priceLine(property) {
    if (isSale(property)) return "매매가 " + money(property.sale_price || property.price);
    if (clean(property.trade_type) === "전세") return "전세 " + money(property.deposit);
    return "보증금 " + money(property.deposit) + " / 월세 " + money(property.rent);
  }

  function buildQuickInput(property) {
    var roomBath = getRoomBath(property);
    var options = list(property.convenience).slice(0, 15);
    var maintenanceItems = list(property.maintenance_includes);
    var sale = isSale(property);

    var lines = [
      "♡♡♡ 매물정보 ♡♡♡",
      "",
      "▶ 구분 : " + [property.category, property.trade_type].filter(Boolean).join(" "),
      "▶ 가격 : " + priceLine(property),
      "▶ 관리비 : " + (property.maintenance_fee || "확인 필요"),
      "▶ 주소 : " + (property.address || "확인 필요"),
      "▶ 면적 : " + (property.area || property.building_area || property.total_area || "확인 필요"),
      "▶ 건축물 용도 : " + (property.main_use || "확인 필요"),
      "▶ 사용승인일 : " + (property.approval_date || "확인 필요"),
      "▶ 방/욕실 : 방 " + roomBath.room + " / 욕실 " + roomBath.bath,
      "▶ 층수 : " + (property.floor_info || property.total_floor_info || "확인 필요"),
      "▶ 방향 : " + (property.direction || "확인 필요"),
      "▶ 주차 : " + (property.parking || "확인 필요"),
      "▶ 입주 : " + (property.move_in || "협의 가능"),
      options.length ? "▶ 옵션 : " + options.join(", ") : "",
      maintenanceItems.length ? "▶ 관리비 포함항목 : " + maintenanceItems.join(", ") : "",
      ""
    ];

    if (sale) {
      lines = lines.concat([
        property.acquisition_price ? "▶ 실인수가 : " + money(property.acquisition_price) : "",
        property.total_monthly_rent ? "▶ 월세수입 : " + money(property.total_monthly_rent) : "",
        property.net_profit ? "▶ 월순수익 : " + money(property.net_profit) : "",
        property.return_rate ? "▶ 수익률 : " + property.return_rate : "",
        property.total_units ? "▶ 총 세대수 : " + property.total_units : "",
        property.land_area ? "▶ 대지면적 : " + property.land_area : "",
        property.building_area ? "▶ 연면적 : " + property.building_area : "",
        ""
      ]);
    }

    lines = lines.concat([
      property.description || property.summary || "구미 생활권에 위치한 확인 매물입니다. 조건은 계약 전 최종 확인 후 안내드립니다.",
      "",
      property.location_description ? "생활권: " + property.location_description : "",
      property.recommended_for ? "추천대상: " + property.recommended_for : "",
      "",
      "※ 보증금, 월세, 관리비, 면적, 사용승인일 등은 계약 전 최종 확인합니다.",
      "※ 등기부등본, 건축물대장, 임대차 현황 확인 후 자세히 안내드립니다.",
      "",
      "칸공인중개사사무소",
      "대표 정점식",
      "등록번호 제47190-2023-00014",
      "문의 010-5323-3883"
    ]);

    return lines.filter(function (line, index, arr) {
      return line !== "" || (index > 0 && arr[index - 1] !== "");
    }).join("\n");
  }

  function csvEscape(value) {
    return '"' + clean(value).replace(/\r?\n/g, " ").replace(/"/g, '""') + '"';
  }

  function buildCsv(property) {
    var roomBath = getRoomBath(property);
    var sale = isSale(property);
    var floor = clean(property.floor_info).match(/(\d+)\s*층/);
    var totalFloor = clean(property.total_floor_info || property.floor_info).match(/총\s*(\d+)\s*층|지상\s*(\d+)\s*층/);
    var year = clean(property.approval_date).match(/(19|20)\d{2}/);

    var columns = [
      "매물유형",
      "거래유형",
      "보증금/매매가(만원)",
      "월세(만원)",
      "주소",
      "상세주소",
      "면적(㎡)",
      "방 수",
      "욕실 수",
      "층",
      "총 층",
      "향",
      "입주가능일",
      "관리비 유형",
      "총 관리비(만원)",
      "관리비 포함항목",
      "관리비 기준",
      "관리비 실비근거",
      "관리비 확인불가 사유",
      "주차",
      "반려동물",
      "대출",
      "옵션",
      "건축년도",
      "매물 설명",
      "메모",
      "토지 지목",
      "용도지역",
      "권리금(만원)",
      "건물용도"
    ];

    var row = [
      property.category || "원룸",
      sale ? "매매" : property.trade_type || "월세",
      sale ? numberOnly(property.sale_price || property.price) : numberOnly(property.deposit),
      sale ? "" : numberOnly(property.rent),
      property.address || "",
      "",
      numberOnly(property.area || property.building_area || property.total_area),
      roomBath.room,
      roomBath.bath,
      floor ? floor[1] : "",
      totalFloor ? totalFloor[1] || totalFloor[2] : clean(property.floor_count),
      property.direction || "확인필요",
      property.move_in || "협의가능",
      clean(property.maintenance_fee).indexOf("포함") !== -1 ? "정액 관리비" : "확인 필요",
      numberOnly(property.maintenance_fee),
      list(property.maintenance_includes).join(", "),
      "직접 월 기준",
      "세대별 사용량 또는 임대인 고지 기준",
      property.maintenance_fee ? "" : "계약 전 확인 필요",
      property.parking || "확인필요",
      "확인필요",
      "확인필요",
      list(property.convenience).join(", "),
      year ? year[0] : "",
      buildQuickInput(property),
      "홈페이지에서 자동 생성. 사진은 당근 화면에서 직접 업로드 필요.",
      "",
      "",
      "",
      property.main_use || ""
    ];

    return "\ufeff" + columns.map(csvEscape).join(",") + "\n" + row.map(csvEscape).join(",");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      var ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    }
  }

  function downloadFile(filename, content) {
    var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function safeName(value) {
    return clean(value || "daangn-property")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 60) || "daangn-property";
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent =
      "#" + BOX_ID + "{margin:16px 0;padding:16px;border:2px solid #173f73;border-radius:18px;background:#f3f7ff;box-sizing:border-box}" +
      "#" + BOX_ID + " strong{display:block;margin-bottom:8px;color:#0f2a44;font-size:16px}" +
      "#" + BOX_ID + " p{margin:0 0 12px;color:#405166;font-size:13px;line-height:1.5}" +
      "#" + BOX_ID + " .kan-button-row{display:grid;grid-template-columns:1fr;gap:8px}" +
      "#" + BOX_ID + " button{width:100%;padding:14px;border:0;border-radius:14px;background:#173f73;color:#fff;font-size:15px;font-weight:800;cursor:pointer}" +
      "#" + BOX_ID + " button.secondary{background:#fff;color:#173f73;border:1px solid #173f73}" +
      "#" + BOX_ID + " button.light{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}" +
      "#" + BOX_ID + " .status{margin-top:10px;padding:10px;border-radius:10px;background:#fff;font-size:13px;line-height:1.5;color:#333;white-space:pre-line}";

    document.head.appendChild(style);
  }

  function findDaangnButton() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button, a"));

    for (var i = 0; i < buttons.length; i++) {
      var text = buttons[i].innerText || buttons[i].textContent || "";
      if (text.indexOf("당근용 광고 만들기") !== -1) return buttons[i];
    }

    return null;
  }

  function openDaangn(status, button) {
    var property = getProperty();

    if (!property) {
      status.textContent = "매물 정보가 없습니다. 광고관리 탭에서 매물을 다시 선택해주세요.";
      return;
    }

    var job = {
      property: property,
      channels: ["daangn"],
      createdAt: new Date().toISOString(),
      source: "admin-direct-button"
    };

    var saveData = {};
    saveData[PROPERTY_STORAGE_KEY] = property;
    saveData[JOB_STORAGE_KEY] = job;

    button.disabled = true;
    status.textContent = "당근 화면을 여는 중입니다.";

    chrome.storage.local.set(saveData, function () {
      chrome.runtime.sendMessage(
        {
          type: "KAN_START_AD_PREP",
          payload: job
        },
        function (response) {
          button.disabled = false;

          if (chrome.runtime.lastError) {
            status.textContent = "당근 연결 실패: background.js 연결을 확인하세요.";
            return;
          }

          status.textContent = response && response.ok
            ? "당근 화면을 열었습니다. 복사된 문구를 간편 매물 등록에 붙여넣으세요."
            : "당근 연결 실패: 연동기 권한 또는 background.js를 확인하세요.";
        }
      );
    });
  }

  function ensureButton() {
    if (document.getElementById(BOX_ID)) return;

    var daangnButton = findDaangnButton();
    if (!daangnButton) return;

    addStyle();

    var box = document.createElement("div");
    box.id = BOX_ID;

    box.innerHTML =
      "<strong>당근 한 번에 보내기</strong>" +
      "<p>홈페이지 매물자료를 당근 간편입력 문구와 엑셀용 CSV로 만듭니다.</p>" +
      "<div class='kan-button-row'>" +
      "<button type='button' data-action='quick'>간편입력 복사 + 당근 열기</button>" +
      "<button type='button' class='secondary' data-action='csv'>당근 엑셀 CSV 다운로드</button>" +
      "<button type='button' class='light' data-action='photo'>사진 URL 복사</button>" +
      "<button type='button' class='secondary' data-action='open'>기존 자동입력 화면 열기</button>" +
      "</div>" +
      "<div class='status'>1번 버튼부터 누르세요. 문구가 복사되고 당근이 열립니다.</div>";

    var parent = daangnButton.parentElement;

    if (parent) parent.insertBefore(box, daangnButton);
    else document.body.appendChild(box);

    var status = box.querySelector(".status");
    var quickButton = box.querySelector("[data-action='quick']");
    var csvButton = box.querySelector("[data-action='csv']");
    var photoButton = box.querySelector("[data-action='photo']");
    var openButton = box.querySelector("[data-action='open']");

    quickButton.addEventListener("click", async function () {
      var property = getProperty();

      if (!property) {
        status.textContent = "매물 정보가 없습니다. 광고관리 탭에서 매물을 다시 선택해주세요.";
        return;
      }

      var copied = await copyText(buildQuickInput(property));

      if (!copied) {
        status.textContent = "간편입력 문구 복사 실패. 클립보드 권한을 확인하세요.";
        return;
      }

      status.textContent = "간편입력 문구 복사 완료. 당근 화면을 엽니다.";
      openDaangn(status, quickButton);
    });

    csvButton.addEventListener("click", function () {
      var property = getProperty();

      if (!property) {
        status.textContent = "매물 정보가 없습니다. 광고관리 탭에서 매물을 다시 선택해주세요.";
        return;
      }

      downloadFile(
        safeName(property.title || property.address) + "_당근등록.csv",
        buildCsv(property)
      );

      status.textContent = "당근 엑셀용 CSV 파일을 만들었습니다. 당근 엑셀 매물 등록에서 첨부하세요.";
    });

    photoButton.addEventListener("click", async function () {
      var property = getProperty();
      var photos = property ? list(property.photos) : [];

      if (!photos.length) {
        status.textContent = "등록된 사진 URL이 없습니다. 홈페이지 사진등록부터 확인하세요.";
        return;
      }

      var copied = await copyText(photos.join("\n"));

      status.textContent = copied
        ? "사진 URL " + photos.length + "개 복사 완료. 사진 파일 업로드는 당근 화면에서 직접 선택해야 합니다."
        : "사진 URL 복사 실패.";
    });

    openButton.addEventListener("click", function () {
      openDaangn(status, openButton);
    });
  }

  function start() {
    ensureButton();

    var observer = new MutationObserver(function () {
      ensureButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
