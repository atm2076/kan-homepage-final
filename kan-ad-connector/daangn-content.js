"use strict";

(function () {
const JOB_STORAGE_KEY = "kanAdConnectorJob";
const PANEL_ID = "kan-daangn-fill-panel";
const STYLE_ID = "kan-daangn-fill-style";

let currentJob = null;

function cleanText(value) {
if (value === undefined || value === null) {
return "";
}

return String(value).trim();

}

function getValue(property, keys) {
for (const key of keys) {
const value = cleanText(property && property[key]);

  if (value) {
    return value;
  }
}

return "";

}

function numberOnly(value) {
return cleanText(value)
.replace(/,/g, "")
.replace(/[^\d.]/g, "");
}

function isVisible(element) {
if (!element) {
return false;
}

const style = window.getComputedStyle(element);

return (
  style.display !== "none" &&
  style.visibility !== "hidden" &&
  element.getClientRects().length > 0
);

}

function setNativeValue(element, value) {
if (!element || value === "") {
return false;
}

const prototype =
  element.tagName === "TEXTAREA"
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;

const descriptor = Object.getOwnPropertyDescriptor(
  prototype,
  "value"
);

if (descriptor && descriptor.set) {
  descriptor.set.call(element, value);
} else {
  element.value = value;
}

element.dispatchEvent(
  new Event("input", {
    bubbles: true
  })
);

element.dispatchEvent(
  new Event("change", {
    bubbles: true
  })
);

element.dispatchEvent(
  new Event("blur", {
    bubbles: true
  })
);

return true;

}

function findByPlaceholder(words, selector) {
const elements = Array.from(
document.querySelectorAll(selector || "input, textarea")
);

return (
  elements.find(function (element) {
    if (!isVisible(element)) {
      return false;
    }

    const placeholder = cleanText(
      element.getAttribute("placeholder")
    );

    return words.some(function (word) {
      return placeholder.includes(word);
    });
  }) || null
);

}

function findFieldByLabel(words, selector) {
const controls = Array.from(
document.querySelectorAll(selector || "input, textarea")
).filter(isVisible);

for (const control of controls) {
  const placeholder = cleanText(
    control.getAttribute("placeholder")
  );

  const ariaLabel = cleanText(
    control.getAttribute("aria-label")
  );

  if (
    words.some(function (word) {
      return (
        placeholder.includes(word) ||
        ariaLabel.includes(word)
      );
    })
  ) {
    return control;
  }

  let parent = control.parentElement;
  let depth = 0;

  while (parent && depth < 4) {
    const context = cleanText(parent.innerText).slice(0, 120);

    if (
      words.some(function (word) {
        return context.includes(word);
      })
    ) {
      return control;
    }

    parent = parent.parentElement;
    depth += 1;
  }
}

return null;

}

function fillField(words, value, selector) {
const finalValue = cleanText(value);

if (!finalValue) {
  return false;
}

const field =
  findByPlaceholder(words, selector) ||
  findFieldByLabel(words, selector);

return setNativeValue(field, finalValue);

}

function createAdTitle(property) {
const title = getValue(property, ["title"]);

if (title) {
  return title;
}

const category =
  getValue(property, ["category"]) || "부동산";

const tradeType =
  getValue(property, ["trade_type", "tradeType"]) || "월세";

const deposit = getValue(property, ["deposit"]);
const rent = getValue(property, ["rent"]);

return [
  category,
  tradeType,
  deposit && rent ? deposit + "/" + rent : ""
]
  .filter(Boolean)
  .join(" ");

}

function createAdBody(property) {
const title = createAdTitle(property);
const address = getValue(property, [
"address",
"road_address",
"location"
]);

const deposit = getValue(property, ["deposit"]);
const rent = getValue(property, ["rent"]);
const maintenance = getValue(property, [
  "maintenance_fee",
  "maintenanceFee"
]);

const summary = getValue(property, ["summary"]);
const description = getValue(property, ["description"]);

const options = Array.isArray(property.convenience)
  ? property.convenience.join(", ")
  : getValue(property, ["convenienceText"]);

const moveIn = getValue(property, [
  "move_in",
  "moveIn"
]);

return [
  "🏠 " + title,
  address ? "📍 " + address : "",
  deposit || rent
    ? "💰 보증금 " +
      (deposit || "0") +
      "만원 / 월세 " +
      (rent || "0") +
      "만원"
    : "",
  maintenance
    ? "관리비: " + maintenance
    : "",
  moveIn ? "입주: " + moveIn : "",
  "",
  summary,
  description,
  options ? "옵션: " + options : "",
  "",
  "칸공인중개사사무소",
  "문의 010-5323-3883"
]
  .filter(function (line, index, lines) {
    if (line !== "") {
      return true;
    }

    return (
      index > 0 &&
      index < lines.length - 1 &&
      lines[index - 1] !== ""
    );
  })
  .join("\n");

}

function autoFillProperty(property) {
let filledCount = 0;

const address = getValue(property, [
  "address",
  "road_address",
  "location"
]);

const exclusiveArea = numberOnly(
  getValue(property, ["area", "exclusive_area"])
);

const supplyArea = numberOnly(
  getValue(property, [
    "total_area",
    "building_area",
    "supply_area",
    "area"
  ])
);

const deposit = numberOnly(
  getValue(property, ["deposit"])
);

const rent = numberOnly(
  getValue(property, ["rent"])
);

const salePrice = numberOnly(
  getValue(property, ["sale_price", "salePrice"])
);

const maintenance = numberOnly(
  getValue(property, [
    "maintenance_fee",
    "maintenanceFee"
  ])
);

const title = createAdTitle(property);
const body = createAdBody(property);

if (
  fillField(
    ["주소를 입력", "주소"],
    address,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["전용면적"],
    exclusiveArea,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["공급면적"],
    supplyArea,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["보증금"],
    deposit,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["월세"],
    rent,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["매매가", "매매 가격"],
    salePrice,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["관리비"],
    maintenance,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["제목"],
    title,
    "input"
  )
) {
  filledCount += 1;
}

if (
  fillField(
    ["상세 설명", "매물 설명", "내용"],
    body,
    "textarea"
  )
) {
  filledCount += 1;
}

return filledCount;

}

function addStyles() {
if (document.getElementById(STYLE_ID)) {
return;
}

const style = document.createElement("style");
style.id = STYLE_ID;
style.textContent =
  "#" +
  PANEL_ID +
  "{" +
  "position:fixed;" +
  "right:18px;" +
  "top:90px;" +
  "width:280px;" +
  "padding:16px;" +
  "background:#ffffff;" +
  "border:2px solid #173f73;" +
  "border-radius:16px;" +
  "box-shadow:0 12px 30px rgba(0,0,0,.18);" +
  "z-index:2147483647;" +
  "font-family:Arial,sans-serif;" +
  "color:#172033;" +
  "}" +
  "#" +
  PANEL_ID +
  " h3{" +
  "margin:0 0 8px;" +
  "font-size:18px;" +
  "}" +
  "#" +
  PANEL_ID +
  " p{" +
  "margin:6px 0;" +
  "font-size:13px;" +
  "line-height:1.5;" +
  "}" +
  "#" +
  PANEL_ID +
  " button{" +
  "width:100%;" +
  "margin-top:12px;" +
  "padding:12px;" +
  "border:0;" +
  "border-radius:10px;" +
  "background:#173f73;" +
  "color:#ffffff;" +
  "font-size:15px;" +
  "font-weight:700;" +
  "cursor:pointer;" +
  "}" +
  "#" +
  PANEL_ID +
  " .kan-status{" +
  "margin-top:10px;" +
  "padding:9px;" +
  "border-radius:8px;" +
  "background:#f3f6fa;" +
  "}";

document.head.appendChild(style);

}

function renderPanel(job) {
addStyles();
  
let panel = document.getElementById(PANEL_ID);

if (!panel) {
  panel = document.createElement("div");
  panel.id = PANEL_ID;
  document.body.appendChild(panel);
}

const property = job && job.property;

if (!property) {
  panel.innerHTML =
    "<h3>칸 광고 연동기</h3>" +
    "<p>선택된 매물 정보가 없습니다.</p>";

  return;
}

const title = createAdTitle(property);
const address = getValue(property, ["address"]);

panel.innerHTML =
  "<h3>칸 광고 연동기</h3>" +
  "<p><strong>" +
  title +
  "</strong></p>" +
  "<p>" +
  (address || "주소 확인 필요") +
  "</p>" +
  "<button type='button' id='kanDaangnFillButton'>" +
  "현재 화면 자동입력" +
  "</button>" +
  "<p class='kan-status' id='kanDaangnFillStatus'>" +
  "매물 등록 화면에서 버튼을 눌러주세요." +
  "</p>";

const button = document.getElementById(
  "kanDaangnFillButton"
);

const status = document.getElementById(
  "kanDaangnFillStatus"
);

button.addEventListener("click", function () {
  const filledCount = autoFillProperty(property);

  if (filledCount > 0) {
    status.textContent =
      filledCount +
      "개 항목을 자동입력했습니다. 내용을 확인해 주세요.";
  } else {
    status.textContent =
      "현재 화면에서 입력 가능한 항목을 찾지 못했습니다.";
  }
});


}

async function loadJob() {
const result = await chrome.storage.local.get(
JOB_STORAGE_KEY
);

currentJob = result[JOB_STORAGE_KEY] || null;
renderPanel(currentJob);

}

chrome.storage.onChanged.addListener(function (
changes,
areaName
) {
if (
areaName === "local" &&
changes[JOB_STORAGE_KEY]
) {
currentJob =
changes[JOB_STORAGE_KEY].newValue || null;

  renderPanel(currentJob);
}

});

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
loadJob
);
} else {
loadJob();
}
})();
