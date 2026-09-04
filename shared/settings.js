// Maps chrome.storage.sync keys onto a runtime object.
// Keep the existing per-key storage layout (quotas + existing user data).

function flagDefaultTrue(storage, key) {
  return storage[key] !== false;
}

function flagDefaultFalse(storage, key) {
  return !!storage[key];
}

function parseSettings(storage) {
  storage = storage || {};
  return {
    hideSegments: flagDefaultTrue(storage, "hideSegments"),
    summaryReplace: flagDefaultFalse(storage, "summaryReplace"),
    summaryAutoRun: flagDefaultFalse(storage, "summaryAutoRun"),
    openSharedPage: flagDefaultTrue(storage, "openSharedPage"),
    closeOldPage: flagDefaultFalse(storage, "closeOldPage"),
    enablePageCM: flagDefaultTrue(storage, "enable-pageCM"),
    enableLinkCM: flagDefaultTrue(storage, "enable-linkCM"),
    enableAutorunCM: flagDefaultTrue(storage, "enable-autorunCM"),
    scrollbar: flagDefaultFalse(storage, "scrollbar"),
    removeOrigContent: flagDefaultTrue(storage, "remove-orig-content"),
    backup: flagDefaultFalse(storage, "backup"),
    leavePres: flagDefaultFalse(storage, "leave-pres"),
    addOrigURL: flagDefaultFalse(storage, "addOrigURL"),
    addTimeEstimate: flagDefaultFalse(storage, "addTimeEstimate"),
    alwaysAddAR: flagDefaultFalse(storage, "alwaysAddAR"),
    autoscroll: flagDefaultFalse(storage, "autoscroll"),
    scrollSpeed:
      typeof storage["scroll-speed"] !== "undefined"
        ? storage["scroll-speed"]
        : 0.5,
    domainSelectors: storage.domainSelectors,
    summarizerOptions: storage["summarizer-options"],
    autorunSiteList: storage["auto-enable-site-list"],
    currentTheme:
      storage.currentTheme ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark-styles.css"
        : "default-styles.css",
    extensionLocale: normalizeExtensionLocale(storage.extensionLocale),
  };
}
