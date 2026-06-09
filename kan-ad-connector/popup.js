"use strict";

const HOME_URL = "https://kan-homepage-final.vercel.app/?admin=1";
const PROPERTY_STORAGE_KEY = "kanAdConnectorProperty";
const JOB_STORAGE_KEY = "kanAdConnectorJob";

const propertySummary = document.getElementById("propertySummary");
const openHomepageButton = document.getElementById("openHomepageButton");
const sendButton = document.getElementById("sendButton");
const statusMessage = document.getElementById("statusMessage");

let selectedProperty = null;

function setStatus(message, type) {
statusMessage.textContent = message;
statusMessage.classList.remove("success", "error");

if (type) {
statusMessage.classList.add(type);
}
}

function getValue(property, keys) {
for (const key of keys) {
if (
property &&
property[key] !== undefined &&
property[key] !== null &&
String(property[key]).trim() !== ""
) {
return String(property[key]).trim();
}
}

return "";
}

function createPriceText(property) {
const tradeType = getValue(property, [
"trade_type",
"tradeType",
"transactionType"
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

const salePrice = getValue(property, [
"sale_price",
"salePrice",
"price"
]);

if (tradeType === "매매" && salePrice) {
return "매매 " + salePrice;
}

if (deposit || rent) {
return (tradeType || "월세") + " " + (deposit || "0") + " / " + (rent || "0");
}

return tradeType || "가격 확인 필요";
}

function renderProperty(property) {
if (!property) {
propertySummary.textContent = "홈페이지에서 선택한 매물이 없습니다.";
sendButton.disabled = true;
setStatus("홈페이지 광고관리에서 매물을 먼저 선택해 주세요.");
return;
}

const title = getValue(property, [
"title",
"property_title",
"propertyTitle",
"adTitle"
]) || "제목 없는 매물";

const address = getValue(property, [
"address",
"road_address",
"roadAddress",
"location"
]) || "주소 확인 필요";

const category = getValue(property, [
"category",
"property_type",
"propertyType"
]);

const priceText = createPriceText(property);

propertySummary.textContent =
title + "\n" +
address + "\n" +
(category ? category + " · " : "") +
priceText;

sendButton.disabled = false;
setStatus("광고를 준비할 매체를 선택해 주세요.", "success");
}

async function readPropertyFromExtensionStorage() {
const result = await chrome.storage.local.get(PROPERTY_STORAGE_KEY);
return result[PROPERTY_STORAGE_KEY] || null;
}

async function readPropertyFromHomepageTab() {
const tabs = await chrome.tabs.query({
active: true,
currentWindow: true
});

const activeTab = tabs[0];

if (
!activeTab ||
!activeTab.id ||
!activeTab.url ||
!activeTab.url.startsWith("https://kan-homepage-final.vercel.app/")
) {
return null;
}

const results = await chrome.scripting.executeScript({
target: {
tabId: activeTab.id
},
func: function (storageKey) {
const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
},
args: [PROPERTY_STORAGE_KEY]

});

return results && results[0] ? results[0].result : null;
}

async function loadSelectedProperty() {
try {
selectedProperty = await readPropertyFromExtensionStorage();

if (!selectedProperty) {
  selectedProperty = await readPropertyFromHomepageTab();
}

if (selectedProperty) {
  await chrome.storage.local.set({
    [PROPERTY_STORAGE_KEY]: selectedProperty
  });
}

renderProperty(selectedProperty);

} catch (error) {
selectedProperty = null;
renderProperty(null);
setStatus("매물 정보를 불러오지 못했습니다.", "error");
}
}

function getSelectedChannels() {
const selectedInputs = document.querySelectorAll(
'.channel-card input[type="checkbox"]:checked'
);

return Array.from(selectedInputs).map(function (input) {
return input.value;
});
}

openHomepageButton.addEventListener("click", function () {
chrome.tabs.create({
url: HOME_URL
});
});

sendButton.addEventListener("click", async function () {
const channels = getSelectedChannels();

if (!selectedProperty) {
setStatus("홈페이지에서 매물을 먼저 선택해 주세요.", "error");
return;
}

if (channels.length === 0) {
setStatus("광고 매체를 한 곳 이상 선택해 주세요.", "error");
return;
}

const job = {
property: selectedProperty,
channels: channels,
createdAt: new Date().toISOString()
};

try {
await chrome.storage.local.set({
[JOB_STORAGE_KEY]: job
});

await chrome.runtime.sendMessage({
  type: "KAN_START_AD_PREP",
  payload: job
});

setStatus("선택한 광고 매체 준비를 시작했습니다.", "success");

} catch (error) {
setStatus("다음 단계인 background.js 연결이 필요합니다.", "error");
}
});

document.addEventListener("DOMContentLoaded", function () {
loadSelectedProperty();
});
