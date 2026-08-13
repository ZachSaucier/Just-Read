function setDomains(domains) {
  let domainString = "";
  for (let i = 0; i < domains.length; i++) {
    domainString += domains[i] + "\n";
  }

  domainList.value = domainString;
}

function applySettingsToOptionsForm(settings) {
  hideSegments.checked = settings.hideSegments;
  summaryReplace.checked = settings.summaryReplace;
  summaryAutoRun.checked = settings.summaryAutoRun;
  openSharedPage.checked = settings.openSharedPage;
  closeOldPage.checked = settings.closeOldPage;
  pageCM.checked = settings.enablePageCM;
  linkCM.checked = settings.enableLinkCM;
  autorunCM.checked = settings.enableAutorunCM;
  scrollbar.checked = settings.scrollbar;
  removeOrig.checked = settings.removeOrigContent;
  backup.checked = settings.backup;
  leavePres.checked = settings.leavePres;
  addOrigURL.checked = settings.addOrigURL;
  addTimeEstimate.checked = settings.addTimeEstimate;
  alwaysAddAR.checked = settings.alwaysAddAR;
  autoscroll.checked = settings.autoscroll;
  scrollSpeed.value = settings.scrollSpeed;

  if (settings.domainSelectors) {
    domainSelectors.value = JSON.stringify(settings.domainSelectors, null, 4);
  }
  if (settings.summarizerOptions) {
    summarizerOptions.value = settings.summarizerOptions;
  }
  if (settings.autorunSiteList) {
    setDomains(settings.autorunSiteList);
  }

  currTheme = settings.currentTheme;
}

function applyStorageToOptionsForm(storage) {
  collectStylesheetsFromStorage(storage, stylesheetObj);
  applySettingsToOptionsForm(parseSettings(storage));

  if (storage.jrSecret) {
    hasAccount = true;
    jrSecret = storage.jrSecret;
  }
  if (typeof storage.isPremium !== "undefined") {
    isPremium = storage.isPremium;
  }
  if (typeof storage.jrLastChecked !== "undefined") {
    jrLastChecked = storage.jrLastChecked;
  }
}

function removeStyleFromStorage(stylesheet) {
  chrome.storage.sync.remove(stylesheet);
}
