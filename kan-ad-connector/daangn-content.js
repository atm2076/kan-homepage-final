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
"daangn_title",
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
const preparedBody = getValue(property, [
  "daangn_body",
  "adDescription"
]);
const homepageUrl = getValue(property, [
  "homepage_url",
  "homepageUrl",
  "detail_url",
  "detailUrl"
]);

if (preparedBody) {
  return preparedBody + (homepageUrl ? "\n\n홈페이지 매물 상세보기: " + homepageUrl : "");
}

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
const tradeType = normalizeText(
getValue(property, [
"trade_type",
"tradeType",
"transactionType"
])
);

const targetTrade =
tradeType.includes("매매")
? "매매"
: tradeType.includes("전세")
? "전세"
: "월세";

const tradeControls = Array.from(
document.querySelectorAll(
"input[type='checkbox'], input[type='radio']"
)
);

const tradeControl = tradeControls.find(
function (control) {
const label =
(
control.labels &&
control.labels.length > 0
)
? control.labels[0]
: control.closest("label") ||
control.parentElement;

const labelText = normalizeText(
  label
    ? label.innerText ||
      label.textContent ||
      ""
    : ""
);

let parent = control.parentElement;
let sectionText = "";
let depth = 0;

while (parent && depth < 6) {
  const currentText = normalizeText(
    parent.innerText ||
    parent.textContent ||
    ""
  );

  if (
    currentText.includes("거래 유형") ||
    currentText.includes("거래유형")
  ) {
    sectionText = currentText;
    break;
  }

  parent = parent.parentElement;
  depth += 1;
}

return (
  labelText.includes(targetTrade) &&
  (
    sectionText.includes("거래 유형") ||
    sectionText.includes("거래유형")
  )
);

}
);

if (
tradeControl &&
!tradeControl.checked
) {
tradeControl.click();
result.filled.push("거래유형");

setTimeout(function () {
autoFillProperty(property);
}, 700);

return result;
}

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
  "주소를 입력하세요",
  "주소 입력",
  "주소 검색어",
  "주소 검색창",
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
  strictDirect: false,
minimumScore: 40
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
      "전용 면적 입력",
      "m²",
"㎡"
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
      "연면적",
      "m²",
"㎡"
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
      "관리비 입력",
      "공용",
"공용 관리비",
"공용관리비",
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
  "매물 한줄 설명",
  "매물 한 줄 설명",
  "한줄 설명",
  "한 줄 설명",
  "한줄설명",
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

const photoFileCache = new Map();
let autoFillTimer = null;
let autoFillAttempt = 0;

function getPhotoUrls(property) {
  const values = Array.isArray(property && property.photos)
    ? property.photos
    : cleanText(property && property.photos).split(/\n|,/);

  return Array.from(new Set(values
    .map(cleanText)
    .filter(function (url) {
      return /^https?:\/\//i.test(url);
    })));
}

function getPhotoExtension(type, url) {
  const normalized = cleanText(type).toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("gif")) return "gif";
  const match = cleanText(url).match(/\.(jpe?g|png|webp|gif)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function photoUrlToFile(url, index, property) {
  if (photoFileCache.has(url)) return photoFileCache.get(url);

  const promise = fetch(url, {
    credentials: "omit",
    cache: "no-store"
  }).then(function (response) {
    if (!response.ok) throw new Error("사진 불러오기 실패 (" + response.status + ")");
    return response.blob();
  }).then(function (blob) {
    if (!blob.type || !blob.type.startsWith("image/")) {
      throw new Error("이미지 파일이 아닙니다.");
    }
    const listingNumber = getValue(property, ["listing_number", "listingNumber"]) || "PROPERTY";
    const extension = getPhotoExtension(blob.type, url);
    return new File(
      [blob],
      "K" + listingNumber + "_DAANGN_" + String(index + 1).padStart(2, "0") + "." + extension,
      { type: blob.type, lastModified: Date.now() }
    );
  });

  photoFileCache.set(url, promise);
  return promise;
}

function findPhotoInput() {
  const inputs = Array.from(document.querySelectorAll("input[type='file']"));
  let best = null;
  let bestScore = -1;

  inputs.forEach(function (input) {
    if (input.disabled) return;
    const accept = normalizeText(input.getAttribute("accept"));
    const context = normalizeText([
      getDirectText(input),
      getLabelText(input),
      input.parentElement && (input.parentElement.innerText || input.parentElement.textContent)
    ].filter(Boolean).join(" "));
    let score = 0;
    if (accept.includes("image") || accept.includes(".jpg") || accept.includes(".png")) score += 100;
    if (input.multiple) score += 50;
    if (includesAny(context, ["사진", "이미지", "photo", "image", "업로드", "첨부"])) score += 80;
    if (score > bestScore) {
      best = input;
      bestScore = score;
    }
  });

  return best;
}

async function attachPropertyPhotos(property) {
  const urls = getPhotoUrls(property);
  if (!urls.length) return { attached: 0, failed: 0, missingInput: false };

  const input = findPhotoInput();
  if (!input) return { attached: 0, failed: 0, missingInput: true };

  const signature = urls.join("|");
  if (input.dataset.kanDaangnPhotoSignature === signature && input.files && input.files.length === urls.length) {
    return { attached: input.files.length, failed: 0, missingInput: false };
  }

  const results = await Promise.allSettled(urls.map(function (url, index) {
    return photoUrlToFile(url, index, property);
  }));
  const files = results
    .filter(function (result) { return result.status === "fulfilled"; })
    .map(function (result) { return result.value; });

  if (!files.length) {
    return { attached: 0, failed: results.length, missingInput: false };
  }

  const transfer = new DataTransfer();
  files.forEach(function (file) { transfer.items.add(file); });
  input.files = transfer.files;
  input.dataset.kanDaangnPhotoSignature = signature;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  return {
    attached: files.length,
    failed: results.length - files.length,
    missingInput: false
  };
}

function clickButtonByText(text) {
  const normalizedTarget = normalizeText(text);
  const candidates = Array.from(document.querySelectorAll("button, [role='button']"));
  const button = candidates.find(function (candidate) {
    const text = normalizeText(candidate.innerText || candidate.textContent);
    return isVisible(candidate) && (text === normalizedTarget || text.includes(normalizedTarget));
  });
  if (!button) return false;
  button.click();
  return true;
}

function advanceToAdvertisementForm() {
  if (document.querySelector("input[type='file'], textarea, [contenteditable='true']")) return false;
  const pageText = normalizeText(document.body.innerText || document.body.textContent);

  if (pageText.includes("광고할 내용을 선택")) {
    if (clickButtonByText("새 소식 작성")) return true;
    if (clickButtonByText("새로 만들기")) return true;
  }
  return false;
}

async function runCompleteAutoFill(job, status) {
  const property = job && job.property;
  if (!property) return;

  try {
    if (advanceToAdvertisementForm()) {
      if (status) status.textContent = "당근 실제 작성 입력칸을 여는 중입니다.";
      return;
    }

    const firstResult = autoFillProperty(property);
    await new Promise(function (resolve) { window.setTimeout(resolve, 700); });
    const secondResult = autoFillProperty(property);
    const photoResult = await attachPropertyPhotos(property);
    const filled = Array.from(new Set(firstResult.filled.concat(secondResult.filled)));
    const expectedPhotos = getPhotoUrls(property).length;

    if (status) {
      if (photoResult.missingInput) {
        status.textContent = "제목·내용·링크 " + filled.length + "개 입력. 사진 업로드 영역을 찾는 중입니다 (" + expectedPhotos + "장 대기).";
      } else {
        status.textContent = "자동입력 완료: 제목·내용·링크 " + filled.length + "개, 사진 " + photoResult.attached + "/" + expectedPhotos + "장 첨부" + (photoResult.failed ? " (실패 " + photoResult.failed + "장)" : "") + ". 최종 게시 전 내용만 확인하세요.";
      }
    }
  } catch (error) {
    if (status) status.textContent = "자동입력 실패: " + (error && error.message ? error.message : "알 수 없는 오류");
  }
}

function scheduleCompleteAutoFill(job, status) {
  if (!job || !job.property) return;
  window.clearTimeout(autoFillTimer);
  autoFillTimer = window.setTimeout(async function () {
    await runCompleteAutoFill(job, status);
    autoFillAttempt += 1;
    if (autoFillAttempt < 60) scheduleCompleteAutoFill(job, status);
  }, autoFillAttempt === 0 ? 250 : 1000);
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
  "자동등록 다시 실행" +
  "</button>" +
  "<p class='kan-status' " +
  "id='kanDaangnFillStatus'>" +
  "사진 URL을 불러와 제목·내용·링크·사진을 자동입력하고 있습니다." +
  "</p>";

const button = document.getElementById(
  "kanDaangnFillButton"
);

const status = document.getElementById(
  "kanDaangnFillStatus"
);

button.addEventListener("click", function () {
  autoFillAttempt = 0;
  status.textContent = "자동등록을 다시 실행하고 있습니다.";
  scheduleCompleteAutoFill(job, status);
});

autoFillAttempt = 0;
scheduleCompleteAutoFill(job, status);

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

const pageObserver = new MutationObserver(function () {
  if (currentJob && !document.getElementById(PANEL_ID)) {
    renderPanel(currentJob);
  }
});

pageObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
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
