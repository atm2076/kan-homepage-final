"use strict";

const JOB_STORAGE_KEY = "kanAdConnectorJob";

const CHANNEL_CONFIG = {
daangn: {
label: "당근",
queryUrls: [
"https://*.daangn.com/*"
],
openUrl: "https://www.daangn.com/"
},

"naver-blog": {
label: "네이버 블로그",
queryUrls: [
"https://blog.naver.com/*",
"https://m.blog.naver.com/*"
],
openUrl: "https://blog.naver.com/"
},

instagram: {
label: "인스타그램",
queryUrls: [
"https://www.instagram.com/*"
],
openUrl: "https://www.instagram.com/"
}
};

async function findExistingTab(urlPatterns) {
const tabs = await chrome.tabs.query({
url: urlPatterns
});

return tabs.find(function (tab) {
return typeof tab.id === "number";
}) || null;
}

async function openOrFocusChannel(channelKey, makeActive) {
const config = CHANNEL_CONFIG[channelKey];

if (!config) {
throw new Error("지원하지 않는 광고 매체입니다: " + channelKey);
}

const existingTab = await findExistingTab(config.queryUrls);

if (existingTab && typeof existingTab.id === "number") {
await chrome.tabs.update(existingTab.id, {
active: makeActive
});


return {
  channel: channelKey,
  label: config.label,
  tabId: existingTab.id,
  reused: true
};


}

const newTab = await chrome.tabs.create({
url: config.openUrl,
active: makeActive
});

return {
channel: channelKey,
label: config.label,
tabId: newTab.id,
reused: false
};
}

async function startAdPreparation(job) {
if (!job || !job.property) {
throw new Error("선택된 매물 정보가 없습니다.");
}

if (!Array.isArray(job.channels) || job.channels.length === 0) {
throw new Error("선택된 광고 매체가 없습니다.");
}

await chrome.storage.local.set({
[JOB_STORAGE_KEY]: job
});

const openedChannels = [];

for (let index = 0; index < job.channels.length; index += 1) {
const channelKey = job.channels[index];

const result = await openOrFocusChannel(
  channelKey,
  index === 0
);

openedChannels.push(result);

}

return openedChannels;
}

chrome.runtime.onMessage.addListener(function (
message,
sender,
sendResponse
) {
if (!message || message.type !== "KAN_START_AD_PREP") {
return false;
}

startAdPreparation(message.payload)
.then(function (openedChannels) {
sendResponse({
ok: true,
openedChannels: openedChannels
});
})
.catch(function (error) {
sendResponse({
ok: false,
error: error.message
});
});

return true;
});
