function setDomains(domains) {
  let domainString = "";
  for (let i = 0; i < domains.length; i++) {
    domainString += domains[i] + "\n";
  }

  domainList.value = domainString;
}

function applyStorageToOptionsForm(storage) {
  collectStylesheetsFromStorage(storage, stylesheetObj);

  for (let key in storage) {
    if (key === "auto-enable-site-list") {
      setDomains(storage[key]);
    } else if (key === "hideSegments") {
      hideSegments.checked = storage[key];
    } else if (key === "summaryReplace") {
      summaryReplace.checked = storage[key];
    } else if (key === "summaryAutoRun") {
      summaryAutoRun.checked = storage[key];
    } else if (key === "openSharedPage") {
      openSharedPage.checked = storage[key];
    } else if (key === "closeOldPage") {
      closeOldPage.checked = storage[key];
    } else if (key === "enable-pageCM") {
      pageCM.checked = storage[key];
    } else if (key === "enable-linkCM") {
      linkCM.checked = storage[key];
    } else if (key === "enable-autorunCM") {
      autorunCM.checked = storage[key];
    } else if (key === "scrollbar") {
      scrollbar.checked = storage[key];
    } else if (key === "remove-orig-content") {
      removeOrig.checked = storage[key] !== false;
    } else if (key === "backup") {
      backup.checked = storage[key];
    } else if (key === "leave-pres") {
      leavePres.checked = storage[key];
    } else if (key === "addOrigURL") {
      addOrigURL.checked = storage[key];
    } else if (key === "addTimeEstimate") {
      addTimeEstimate.checked = storage[key];
    } else if (key === "alwaysAddAR") {
      alwaysAddAR.checked = storage[key];
    } else if (key === "autoscroll") {
      autoscroll.checked = storage[key];
    } else if (key === "scroll-speed") {
      scrollSpeed.value = storage[key];
    } else if (key === "domainSelectors") {
      domainSelectors.value = JSON.stringify(storage[key], null, 4);
    } else if (key === "summarizer-options") {
      summarizerOptions.value = storage[key];
    } else if (key === "currentTheme") {
      currTheme = storage[key];
    } else if (key === "jrSecret") {
      hasAccount = true;
      jrSecret = storage[key];
    } else if (key === "isPremium") {
      isPremium = storage[key];
    } else if (key === "jrLastChecked") {
      jrLastChecked = storage[key];
    }
  }
}

function removeStyleFromStorage(stylesheet) {
  chrome.storage.sync.remove(stylesheet);
}
