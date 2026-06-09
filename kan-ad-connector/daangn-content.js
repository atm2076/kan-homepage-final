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

function normalizeText(value) {
return cleanText(value)
.toLowerCase()
.replace(/\s+/g, " ")
.trim();
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

function isEditableControl(element) {
if (!element || !isVisible(element) || element.disabled) {
return false;
}

const type = normalizeText(
  element.getAttribute("type")
);

if (
  [
    "hidden",
    "file",
    "button",
    "submit",
    "reset",
    "checkbox",
    "radio"
  ].includes(type)
) {
  return false;
}

return (
  element.matches("input, textarea") ||
  element.getAttribute("contenteditable") === "true" ||
  element.getAttribute("role") === "textbox"
);

}

function setNativeValue(element, value) {
if (!element || value === "") {
return false;
}

const finalValue = String(value);

try {
  element.focus();

  if (
    element.getAttribute("contenteditable") === "true" ||
    (
      !element.matches("input, textarea") &&
      element.getAttribute("role") === "textbox"
    )
  ) {
    element.textContent = finalValue;
  } else {
    const prototype =
      element.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

    const descriptor =
      Object.getOwnPropertyDescriptor(
        prototype,
        "value"
      );

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, finalValue);
    } else {
      element.value = finalValue;
    }
  }

  let inputEvent;

  try {
    inputEvent = new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: finalValue
    });
  } catch (error) {
    inputEvent = new Event("input", {
      bubbles: true
    });
  }

  element.dispatchEvent(inputEvent);

  element.dispatchEvent(
    new Event("change", {
      bubbles: true
    })
  );

  element.dispatchEvent(
    new KeyboardEvent("keyup", {
      bubbles: true
    })
  );

  element.blur();

  return true;
} catch (error) {
  return false;
}

}

function getDirectText(control) {
return normalizeText(
[
control.getAttribute("placeholder"),
control.getAttribute("aria-label"),
control.getAttribute("name"),
control.getAttribute("id"),
control.getAttribute("data-testid"),
control.getAttribute("autocomplete")
]
.filter(Boolean)
.join(" ")
);
}

function getLabelText(control) {
const texts = [];

if (control.labels) {
  Array.from(control.labels).forEach(
    function (label) {
      texts.push(
        label.innerText ||
        label.textContent ||
        ""
      );
    }
  );
}

const controlId = cleanText(
  control.getAttribute("id")
);

if (controlId) {
  Array.from(
    document.querySelectorAll("label")
  ).forEach(function (label) {
    if (label.htmlFor === controlId) {
      texts.push(
        label.innerText ||
        label.textContent ||
        ""
      );
    }
  });
}

const closestLabel = control.closest("label");

if (closestLabel) {
  texts.push(
    closestLabel.innerText ||
    closestLabel.textContent ||
    ""
  );
}

let previous = control.previousElementSibling;
let count = 0;

while (previous && count < 2) {
  texts.push(
    previous.innerText ||
    previous.textContent ||
    ""
  );

  previous = previous.previousElementSibling;
  count += 1;
}

return normalizeText(texts.join(" "));

}

function getNearbyContexts(control) {
const contexts = [];
let parent = control.parentElement;
let depth = 0;

while (parent && depth < 4) {
  const controls = parent.querySelectorAll(
    "input, textarea, " +
    "[contenteditable='true'], " +
    "[role='textbox']"
  );

  const text = normalizeText(
    parent.innerText ||
    parent.textContent ||
    ""
  );

  if (
    text &&
    text.length <= 300 &&
    controls.length <= 4
  ) {
    contexts.push({
      text: text,
      depth: depth,
      controlCount: controls.length
    });
  }

  parent = parent.parentElement;
  depth += 1;
}

return contexts;

}

function includesAny(text, words) {
return words.some(function (word) {
const normalizedWord = normalizeText(word);

  return (
    normalizedWord &&
    text.includes(normalizedWord)
  );
});

}

function matchScore(
text,
words,
exactScore,
partialScore
) {
let score = 0;

words.forEach(function (word) {
  const normalizedWord = normalizeText(word);

  if (!normalizedWord || !text) {
    return;
  }

  if (text === normalizedWord) {
    score = Math.max(score, exactScore);
  } else if (text.includes(normalizedWord)) {
    score = Math.max(score, partialScore);
  }
});

return score;

}

function scoreControl(
control,
specification,
usedControls
) {
if (
!isEditableControl(control) ||
usedControls.has(control)
) {
return -9999;
}

const directText = getDirectText(control);
const labelText = getLabelText(control);
const contexts = getNearbyContexts(control);

const negativeWords =
  specification.negativeWords || [];

const type = normalizeText(
  control.getAttribute("type")
);

const inputMode = normalizeText(
  control.getAttribute("inputmode")
);

let score = 0;
let directMatched = false;

const directScore = matchScore(
  directText,
  specification.words,
  240,
  170
);

const labelScore = matchScore(
  labelText,
  specification.words,
  210,
  140
);

if (directScore > 0 || labelScore > 0) {
  directMatched = true;
}

score += directScore;
score += labelScore;

contexts.forEach(function (context) {
  let contextScore = 0;

  if (context.controlCount === 1) {
    contextScore = matchScore(
      context.text,
      specification.words,
      100,
      70
    );
  } else {
    contextScore = matchScore(
      context.text,
      specification.words,
      45,
      25
    );
  }

  if (context.depth > 1) {
    contextScore = Math.floor(
      contextScore / 2
    );
  }

  score += contextScore;
});

if (
  specification.strictDirect &&
  !directMatched
) {
  score -= 500;
}

if (includesAny(directText, negativeWords)) {
  score -= 1500;
}

if (includesAny(labelText, negativeWords)) {
  score -= 1200;
}

contexts.forEach(function (context) {
  if (
    includesAny(
      context.text,
      negativeWords
    )
  ) {
    if (context.controlCount === 1) {
      score -= 500;
    } else {
      score -= 80;
    }
  }
});

if (
  specification.rejectTelephone &&
  (
    type === "tel" ||
    directText.includes("telephone") ||
    directText.includes("phone") ||
    directText.includes("mobile") ||
    directText.includes("연락처") ||
    directText.includes("전화")
  )
) {
  score -= 3000;
}

if (
  specification.preferNumeric &&
  (
    type === "number" ||
    inputMode === "numeric" ||
    inputMode === "decimal"
  )
) {
  score += 30;
}

if (
  specification.preferMultiline &&
  control.matches(
    "textarea, [contenteditable='true']"
  )
) {
  score += 80;
}

if (
  specification.rejectMultiline &&
  control.matches(
    "textarea, [contenteditable='true']"
  )
) {
  score -= 300;
}

return score;

}

function findBestField(
specification,
selector,
usedControls
) {
const controls = Array.from(
document.querySelectorAll(
selector ||
"input, textarea, " +
"[contenteditable='true'], " +
"[role='textbox']"
)
);

let bestControl = null;
let bestScore =
  specification.minimumScore || 60;

controls.forEach(function (control) {
  const score = scoreControl(
    control,
    specification,
    usedControls
  );

  if (score > bestScore) {
    bestScore = score;
    bestControl = control;
  }
});

return bestControl;

}

function fillField(
fieldName,
specification,
value,
selector,
usedControls,
result
) {
const finalValue = cleanText(value);

if (!finalValue) {
  return;
}

const field = findBestField(
  specification,
  selector,
  usedControls
);

if (
  field &&
  setNativeValue(field, finalValue)
) {
  usedControls.add(field);
  result.filled.push(fieldName);
} else {
  result.missing.push(fieldName);
}

}

function createAdTitle(property) {
const title = getValue(property, [
"title",
"property_title",
"propertyTitle",
"adTitle"
]);

if (title) {
  return title;
}

const category =
  getValue(property, [
    "category",
    "property_type",
    "propertyType"
  ]) || "부동산";

const tradeType =
  getValue(property, [
    "trade_type",
    "tradeType",
    "transactionType"
  ]) || "월세";

const deposit = getValue(property, [
  "deposit",
  "deposit_price",
  "depositPrice"
]);

const rent = getValue(property, [
  "rent",
  "monthly_rent",
  "monthlyRent"
]);

return [
  category,
  tradeType,
  deposit && rent
    ? deposit + "/" + rent
    : ""
]
  .filter(Boolean)
  .join(" ");

}

function createAdBody(property) {
const title = createAdTitle(property);

const address = getValue(property, [
  "address",
  "road_address",
  "roadAddress",
  "location"
]);

const deposit = getValue(property, [
  "deposit",
  "deposit_price",
  "depositPrice"
]);

const rent = getValue(property, [
  "rent",
  "monthly_rent",
  "monthlyRent"
]);

const maintenance = getValue(property, [
  "maintenance_fee",
  "maintenanceFee"
]);

const summary = getValue(property, [
  "summary",
  "short_description",
  "shortDescription"
]);

const description = getValue(property, [
  "description",
  "detail_description",
  "detailDescription",
  "adDescription"
]);

const options = Array.isArray(
  property.convenience
)
  ? property.convenience.join(", ")
  : getValue(property, [
      "convenienceText",
      "optionsText"
    ]);

const moveIn = getValue(property, [
  "move_in",
  "moveIn",
  "move_in_date",
  "moveInDate"
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
  .filter(function (
    line,
    index,
    lines
  ) {
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
const usedControls = new Set();

const result = {
  filled: [],
  missing: []
};

const address = getValue(property, [
  "address",
  "road_address",
  "roadAddress",
  "location"
]);

const exclusiveArea = numberOnly(
  getValue(property, [
    "area",
    "exclusive_area",
    "exclusiveArea",
    "private_area",
    "privateArea"
  ])
);

const supplyArea = numberOnly(
  getValue(property, [
    "total_area",
    "totalArea",
    "building_area",
    "buildingArea",
    "supply_area",
    "supplyArea"
  ])
);

const deposit = numberOnly(
  getValue(property, [
    "deposit",
    "deposit_price",
    "depositPrice"
  ])
);

const rent = numberOnly(
  getValue(property, [
    "rent",
    "monthly_rent",
    "monthlyRent"
  ])
);

const salePrice = numberOnly(
  getValue(property, [
    "sale_price",
    "salePrice",
    "price"
  ])
);

const maintenance = numberOnly(
  getValue(property, [
    "maintenance_fee",
    "maintenanceFee"
  ])
);

const title = createAdTitle(property);
const body = createAdBody(property);

fillField(
  "주소",
  {
    words: [
      "매물 주소",
      "도로명 주소",
      "도로명주소",
      "지번 주소",
      "지번주소",
      "주소 검색",
      "주소를 입력",
      "주소"
    ],
    negativeWords: [
      "집주인 전화번호",
      "전화번호",
      "전화",
      "휴대폰",
      "연락처",
      "담당자",
      "소유자"
    ],
    rejectTelephone: true,
    rejectMultiline: true,
    strictDirect: true,
    minimumScore: 100
  },
  address,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "전용면적",
  {
    words: [
      "전용면적",
      "전용 면적",
      "전용면적 입력",
      "전용 면적 입력"
    ],
    negativeWords: [
      "공급면적",
      "대지면적",
      "연면적"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  exclusiveArea,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "공급면적",
  {
    words: [
      "공급면적",
      "공급 면적",
      "계약면적",
      "계약 면적",
      "연면적"
    ],
    negativeWords: [
      "전용면적",
      "대지면적"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  supplyArea,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "보증금",
  {
    words: [
      "보증금",
      "보증금 입력",
      "임대 보증금"
    ],
    negativeWords: [
      "월세",
      "관리비",
      "매매가",
      "권리금"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  deposit,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "월세",
  {
    words: [
      "월세",
      "월세 입력",
      "월 임대료",
      "월차임"
    ],
    negativeWords: [
      "보증금",
      "관리비",
      "매매가"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  rent,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "매매가",
  {
    words: [
      "매매가",
      "매매 가격",
      "매매금액",
      "매매 금액"
    ],
    negativeWords: [
      "보증금",
      "월세",
      "관리비"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  salePrice,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "관리비",
  {
    words: [
      "관리비",
      "월 관리비",
      "관리비 입력"
    ],
    negativeWords: [
      "보증금",
      "월세",
      "매매가"
    ],
    preferNumeric: true,
    rejectMultiline: true
  },
  maintenance,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "제목",
  {
    words: [
      "광고 제목",
      "매물 제목",
      "제목을 입력",
      "제목"
    ],
    negativeWords: [
      "집주인",
      "전화",
      "연락처",
      "주소",
      "상세 설명",
      "매물 설명"
    ],
    rejectMultiline: true
  },
  title,
  "input, [role='textbox']",
  usedControls,
  result
);

fillField(
  "상세설명",
  {
    words: [
      "상세 설명",
      "상세설명",
      "매물 설명",
      "광고 내용",
      "내용을 입력",
      "설명"
    ],
    negativeWords: [
      "집주인",
      "전화",
      "주소",
      "제목"
    ],
    preferMultiline: true,
    minimumScore: 40
  },
  body,
  "textarea, " +
  "[contenteditable='true'], " +
  "[role='textbox']",
  usedControls,
  result
);

return result;

}

function addStyles() {
if (document.getElementById(STYLE_ID)) {
return;
}

const style =
  document.createElement("style");

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
  "word-break:keep-all;" +
  "}";

document.head.appendChild(style);

}

function renderPanel(job) {
addStyles();

let panel =
  document.getElementById(PANEL_ID);

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

const address = getValue(property, [
  "address",
  "road_address",
  "roadAddress",
  "location"
]);

panel.innerHTML =
  "<h3>칸 광고 연동기</h3>" +
  "<p><strong>" +
  title +
  "</strong></p>" +
  "<p>" +
  (address || "주소 확인 필요") +
  "</p>" +
  "<button type='button' " +
  "id='kanDaangnFillButton'>" +
  "현재 화면 자동입력" +
  "</button>" +
  "<p class='kan-status' " +
  "id='kanDaangnFillStatus'>" +
  "입력칸이 보이는 화면에서 버튼을 눌러주세요." +
  "</p>";

const button = document.getElementById(
  "kanDaangnFillButton"
);

const status = document.getElementById(
  "kanDaangnFillStatus"
);

button.addEventListener(
  "click",
  function () {
    const result =
      autoFillProperty(property);

    if (result.filled.length > 0) {
      status.textContent =
        "자동입력 " +
        result.filled.length +
        "개: " +
        result.filled.join(", ") +
        (
          result.missing.length > 0
            ? " / 현재 화면에서 못 찾음: " +
              result.missing.join(", ")
            : ""
        ) +
        ". 내용을 확인해 주세요.";
    } else {
      status.textContent =
        "현재 화면에서 입력 가능한 항목을 " +
        "찾지 못했습니다. 입력칸이 보이는 " +
        "단계에서 다시 눌러주세요.";
    }
  }
);

}

async function loadJob() {
const result =
await chrome.storage.local.get(
JOB_STORAGE_KEY
);

currentJob =
  result[JOB_STORAGE_KEY] || null;

renderPanel(currentJob);

}

chrome.storage.onChanged.addListener(
function (changes, areaName) {
if (
areaName === "local" &&
changes[JOB_STORAGE_KEY]
) {
currentJob =
changes[JOB_STORAGE_KEY].newValue ||
null;

    renderPanel(currentJob);
  }
}

);

if (document.readyState === "loading") {
document.addEventListener(
"DOMContentLoaded",
loadJob
);
} else {
loadJob();
}
})();
