"use strict";

(function () {
  var PROPERTY_STORAGE_KEY = "kanAdConnectorProperty";
  var JOB_STORAGE_KEY = "kanAdConnectorJob";
  var BOX_ID = "kan-direct-daangn-box";
  var STYLE_ID = "kan-direct-daangn-style";

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent =
      "#" + BOX_ID + "{" +
      "margin:16px 0;padding:16px;border:2px solid #173f73;" +
      "border-radius:18px;background:#f3f7ff;" +
      "box-sizing:border-box;" +
      "}" +
      "#" + BOX_ID + " strong{" +
      "display:block;margin-bottom:8px;color:#0f2a44;font-size:16px;" +
      "}" +
      "#" + BOX_ID + " p{" +
      "margin:0 0 12px;color:#405166;font-size:13px;line-height:1.5;" +
      "}" +
      "#" + BOX_ID + " button{" +
      "width:100%;padding:14px;border:0;border-radius:14px;" +
      "background:#173f73;color:#fff;font-size:16px;font-weight:800;cursor:pointer;" +
      "}" +
      "#" + BOX_ID + " .status{" +
      "margin-top:10px;padding:10px;border-radius:10px;background:#fff;" +
      "font-size:13px;line-height:1.5;color:#333;" +
      "}";

    document.head.appendChild(style);
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

  function findDaangnButton() {
    var buttons = Array.prototype.slice.call(
      document.querySelectorAll("button, a")
    );

    for (var i = 0; i < buttons.length; i++) {
      var text = buttons[i].innerText || buttons[i].textContent || "";

      if (text.indexOf("당근용 광고 만들기") !== -1) {
        return buttons[i];
      }
    }

    return null;
  }

  function sendToDaangn(status, button) {
    var property = getProperty();

    if (!property) {
      status.textContent =
        "매물 정보가 아직 준비되지 않았습니다. 매물 상세 화면을 다시 열고 광고관리 탭에서 다시 눌러주세요.";
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
            status.textContent =
              "당근 연결 실패: background.js 연결을 확인하세요.";
            return;
          }

          if (response && response.ok) {
            status.textContent =
              "당근 화면을 열었습니다. 당근 화면에서 현재 화면 자동입력을 누르세요.";
          } else {
            status.textContent =
              "당근 연결 실패: 연동기 권한 또는 background.js를 확인하세요.";
          }
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
      "<strong>광고 바로 보내기</strong>" +
      "<p>현재 매물을 당근 등록 화면으로 바로 보냅니다.</p>" +
      "<button type='button'>당근으로 바로 보내기</button>" +
      "<div class='status'>버튼을 누르면 당근 화면이 열립니다.</div>";

    var parent = daangnButton.parentElement;

    if (parent) {
      parent.insertBefore(box, daangnButton);
    } else {
      document.body.appendChild(box);
    }

    var button = box.querySelector("button");
    var status = box.querySelector(".status");

    button.addEventListener("click", function () {
      sendToDaangn(status, button);
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
