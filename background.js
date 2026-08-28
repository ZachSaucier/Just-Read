function isEmpty(obj) {
  if (obj) return Object.keys(obj).length === 0;
  return true;
}

let injectingTabs = {};

// Classic content scripts, injected in order into the same isolated world.
// Add new content/*.js files here (init.js must stay last).
const CONTENT_SCRIPT_FILES = [
  "content/state.js",
  "shared/helpers.js",
  "shared/settings.js",
  "shared/stylesheets.js",
  "shared/premium.js",
  "shared/notifications.js",
  "shared/math-sanitize.js",
  "shared/math-extract.js",
  "content/helpers.js",
  "content/selection.js",
  "content/article.js",
  "content/ui.js",
  "content/summarizer.js",
  "content/theme-editor.js",
  "content/highlighter.js",
  "content/edit-bar.js",
  "content/comments.js",
  "content/autoscroll.js",
  "content/scrollbar.js",
  "content/math.js",
  "content/share.js",
  "content/hydrate.js",
  "content/overlay.js",
  "content/overlay-article.js",
  "content/overlay-create.js",
  "content/init.js",
];

const LIBRARY_FILES = [
  "/external-libraries/readability/readability.js",
  "/external-libraries/datGUI/dat.gui.min.js",
  "/external-libraries/DOMPurify/purify.min.js",
  "/external-libraries/Rangy/rangy.min.js",
  "/external-libraries/Rangy/rangy-classapplier.min.js",
  "/external-libraries/Rangy/rangy-highlighter.min.js",
];

function startJustRead(tab) {
  const run = (resolvedTab) => {
    if (!resolvedTab?.id) return;

    chrome.tabs.sendMessage(resolvedTab.id, { toggleJustRead: true }, () => {
      if (chrome.runtime.lastError) {
        injectReaderScripts(resolvedTab);
      }
    });
  };

  if (tab) {
    run(tab);
  } else {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabArray) => {
      if (tabArray.length) run(tabArray[0]);
    });
  }
}

function injectReaderScripts(tab) {
  const tabId = tab.id;
  if (injectingTabs[tabId]) return;

  injectingTabs[tabId] = true;
  setTimeout(() => delete injectingTabs[tabId], 10000);

  // Add a badge to signify the extension is in use
  chrome.action.setBadgeBackgroundColor({ color: [242, 38, 19, 230] });
  chrome.action.setBadgeText({ text: "on" });

  // Check if we need to add the site to JR's autorun list
  chrome.storage.sync.get("alwaysAddAR", function (result) {
    if (result && result["alwaysAddAR"]) {
      addSiteToAutorunList(null, tab);
    }
  });

  // Load our external scripts, then our content scripts
  chrome.scripting
    .executeScript({
      target: { tabId: tabId, allFrames: false },
      files: LIBRARY_FILES,
    })
    .then(() => {
      chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: false },
        files: CONTENT_SCRIPT_FILES,
      });

      setTimeout(function () {
        chrome.action.setBadgeText({ text: "" });
        chrome.storage.sync.set({ useText: false });
        chrome.storage.sync.set({ runOnLoad: false });
      }, 1000);
    });
}

function startSelectText() {
  chrome.storage.sync.set({ useText: true });
  startJustRead();
}

function createPageContextMenu() {
  // Create a right click menu option
  pageCMId = chrome.contextMenus.create(
    {
      title: "View this page using Just Read",
      id: "pageCM",
      contexts: ["page"],
    },
    chrome.runtime.lastError,
  );
}
function createLinkContextMenu() {
  // Create an entry to allow user to open a given link using Just read
  linkCMId = chrome.contextMenus.create(
    {
      title: "View the linked page using Just Read",
      id: "linkCM",
      contexts: ["link"],
    },
    chrome.runtime.lastError,
  );
}
function createAutorunContextMenu() {
  // Create an entry to allow user to open a given link using Just read
  autorunCMId = chrome.contextMenus.create(
    {
      title: "Add this site to Just Read's auto-run list",
      id: "autorunCM",
      contexts: ["page"],
    },
    chrome.runtime.lastError,
  );
}
function addSiteToAutorunList(info, tab) {
  chrome.storage.sync.get("auto-enable-site-list", function (result) {
    let url = new URL((info != null && info.pageUrl) || tab.url);
    let entry;
    if (url.pathname !== "/" && url.pathname !== "") {
      entry = url.hostname + "/.+";
    } else {
      entry = url.hostname;
    }

    let currentDomains = result["auto-enable-site-list"];

    if (!isEmpty(currentDomains)) {
      if (!currentDomains.includes(entry)) {
        chrome.storage.sync.set(
          {
            "auto-enable-site-list": [...currentDomains, entry],
          },
          function () {
            if (
              currentDomains.some((existing) => {
                const existingPattern = existing.split(">")[0];
                return (
                  existingPattern === url.hostname ||
                  existingPattern.startsWith(url.hostname + "/")
                );
              })
            ) {
              console.log(
                "Just Read auto-run entry added.\n\nWarning: An auto-run entry with the same hostname has already been added. Be careful to not add two duplicates.",
              );
            } else {
              console.log("Just Read auto-run entry added.");
            }
          },
        );
      } else {
        console.error(
          "Entry already exists inside of Just Read's auto-run list. Not adding new entry.",
        );
      }
    } else {
      chrome.storage.sync.set({ "auto-enable-site-list": [entry] });
    }
  });
}

let pageCMId = (linkCMId = autorunCMId = undefined);
function updateContextMenus() {
  chrome.storage.sync.get(
    ["enable-pageCM", "enable-linkCM", "enable-autorunCM"],
    function (result) {
      let size = 0;

      for (let key in result) {
        size++;

        if (key === "enable-pageCM") {
          if (result[key]) {
            if (typeof pageCMId == "undefined") createPageContextMenu();
          } else {
            if (typeof pageCMId != "undefined") {
              pageCMId = undefined;
            }
          }
        } else if (key === "enable-linkCM") {
          if (result[key]) {
            if (typeof linkCMId == "undefined") createLinkContextMenu();
          } else {
            if (typeof linkCMId != "undefined") {
              linkCMId = undefined;
            }
          }
        } else if (key === "enable-autorunCM") {
          if (result[key]) {
            if (typeof autorunCMId == "undefined") createAutorunContextMenu();
          } else {
            if (typeof autorunCMId != "undefined") {
              autorunCMId = undefined;
            }
          }
        }
      }

      if (size === 0) {
        createPageContextMenu();
        createLinkContextMenu();
        createAutorunContextMenu();
      }
    },
  );
}

// Listen for the extension's click
chrome.action.onClicked.addListener(startJustRead);

// Listen for the keyboard shortcut
chrome.commands.onCommand.addListener(function (command) {
  if (command == "open-just-read") startJustRead();
  if (command == "select-text") startSelectText();
});

function handleJrFetch(details, sendResponse) {
  let parsed;
  try {
    parsed = new URL(details.url);
  } catch (e) {
    sendResponse({ networkError: "Invalid URL" });
    return;
  }

  const extensionOrigin = chrome.runtime.getURL("");
  const allowed =
    details.url.startsWith(extensionOrigin) ||
    parsed.protocol === "https:" ||
    parsed.protocol === "http:";
  if (!allowed) {
    sendResponse({ networkError: "Blocked URL" });
    return;
  }

  const init = {
    method: details.method || "GET",
    headers: details.headers || {},
  };
  if (details.body != null && init.method !== "GET" && init.method !== "HEAD") {
    init.body = details.body;
  }

  fetch(details.url, init)
    .then(async (res) => {
      sendResponse({
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get("content-type"),
        text: await res.text(),
      });
    })
    .catch((err) => {
      sendResponse({ networkError: String(err) });
    });
}

// Listen for messages
let lastClosed = Date.now();
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.jrFetch) {
    handleJrFetch(request.jrFetch, sendResponse);
    return true;
  }
  if (request.jrLoadMathJax) {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: "no tab id" });
      return true;
    }
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: [
          "shared/mathjax-bootstrap.js",
          "external-libraries/mathjax/tex-mml-chtml.js",
        ],
      },
      () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      },
    );
    return true;
  }
  if (request === "Open options") {
    chrome.runtime.openOptionsPage();
  } else if (request.updateContextMenus) {
    updateContextMenus();
  } else if (request.closeTab === "true") {
    chrome.tabs.query(
      {
        active: true,
        lastFocusedWindow: true,
      },
      function (tabs) {
        const tab = tabs[0];
        setTimeout(function () {
          chrome.tabs.remove(tab.id);
        }, 100);
      },
    );
  } else if (request.lastClosed) {
    lastClosed = request.lastClosed;
  }
  // For JRP
  else if (request.jrSecret) {
    chrome.storage.sync.set({ jrSecret: request.jrSecret });
  } else if (request.resetJRLastChecked) {
    chrome.storage.sync.set({ jrLastChecked: "" });
  } else if (request.tabOpenedJR) {
    const tabURL = request.tabOpenedJR.split("?")[0];
    for (const tabId in injectingTabs) {
      chrome.tabs.get(parseInt(tabId), (tab) => {
        if (tab.url.split("?")[0] === tabURL) {
          setTimeout(() => delete injectingTabs[tabId], 1000);
        }
      });
    }
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "selectContentCM") {
    startSelectText();
  } else if (info.menuItemId === "pageCM") {
    startJustRead();
  } else if (info.menuItemId === "linkCM") {
    chrome.tabs.create({ url: info.linkUrl, active: false }, function (newTab) {
      chrome.storage.sync.set({ runOnLoad: true });
      startJustRead(newTab);
    });
  } else if (info.menuItemId === "autorunCM") {
    addSiteToAutorunList(info, tab);
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (injectingTabs[tabId]) return;

  const change = Date.now() - lastClosed;
  if (changeInfo.status === "complete" && change > 300) {
    // Auto enable on sites specified
    chrome.storage.sync.get(
      ["auto-enable-site-list", "jrClosedUrl", "jrClosedAt"],
      function (siteListObj) {
        let siteList;
        if (siteListObj) {
          // Skip autorun if this page was just closed via content removal (within 2s)
          // to prevent an infinite reload loop when both autorun and remove-orig-content are enabled
          const tabUrl = new URL(tab.url);
          const tabUrlPath = tabUrl.origin + tabUrl.pathname;
          if (
            siteListObj.jrClosedUrl === tabUrlPath &&
            Date.now() - siteListObj.jrClosedAt < 2000
          ) {
            return;
          }

          siteList = siteListObj["auto-enable-site-list"];
          const url = tab.url;

          if (typeof siteList !== "undefined") {
            for (let i = 0; i < siteList.length; i++) {
              // Allows the format `text.npr.org>5000` to autorun JR after 5 seconds on text.npr.org
              const entry = siteList[i];
              const splitEntry = entry.split(">");
              const entryRegex = splitEntry[0];
              const urlRegex = new RegExp(entryRegex, "i");

              if (url.match(urlRegex)) {
                chrome.storage.sync.set({ runOnLoad: true });
                const delay = parseInt(splitEntry[1], 10) || 0;
                if (delay > 0) {
                  setTimeout(() => startJustRead(tab), delay);
                } else {
                  startJustRead(tab);
                }
                return;
              }
            }
          }

          // Check if jr=on is set, autorun if so
          if (new URL(url).searchParams.get("jr") === "on") {
            startJustRead(tab);
          }
        }
      },
    );
  }
});

// Add our context menus
chrome.contextMenus.removeAll(function () {
  chrome.contextMenus.create(
    {
      title: "Select content to read",
      contexts: ["action"],
      id: "selectContentCM",
    },
    chrome.runtime.lastError,
  );
  updateContextMenus();
});

function clearBundledThemeCache() {
  chrome.storage.sync.remove([
    "jr-default-styles.css",
    "jr-dark-styles.css",
    "stylesheet-version",
  ]);
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    clearBundledThemeCache();
  }
});
