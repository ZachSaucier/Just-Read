const JR_SHARED_HOSTS = ["justread.link", "www.justread.link"];
const JR_RESERVED_PATHS = [
  "",
  "dashboard",
  "support",
  "summarizer",
  "signout",
];

function isJustReadSharedArticlePage() {
  if (!JR_SHARED_HOSTS.includes(window.location.hostname)) return false;

  const path = window.location.pathname.replace(/^\//, "").replace(/\/$/, "");
  if (!path || path.includes(".") || path.includes("/")) return false;
  if (JR_RESERVED_PATHS.includes(path)) return false;

  return !!document.querySelector(".simple-container .content-container");
}

function verifyPremiumThenHydrate() {
  refreshPremiumStatus({
    domain: JR.jrDomain,
    secret: JR.jrSecret,
    lastChecked: JR.jrLastChecked,
    cachedIsPremium: JR.isPremium,
    onReady: ({ isPremium, secret }) => {
      JR.isPremium = isPremium;
      JR.jrSecret = secret;
      if (!isPremium || !secret) {
        document.body.appendChild(
          createNotification(
            {
              textContent:
                "To edit a shared Just Read page, sign in with a <a href='https://justread.link/#get-Just-Read' target='_blank'>Premium account</a>.",
              url: "https://justread.link/#get-Just-Read",
              primaryText: "Learn more",
              secondaryText: "Maybe later",
            },
            document,
          ),
        );
        return;
      }
      checkOwnershipThenHydrate();
    },
  });
}

function checkOwnershipThenHydrate() {
  jrFetch(JR.jrDomain + "canEditEntry", {
    method: "POST",
    headers: { "Content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      jrSecret: JR.jrSecret,
      JRUrl: window.location.href,
    }),
  })
    .then((response) => {
      if (!response.ok) throw response;
      return response.json();
    })
    .then((data) => {
      if (!data || !data.owned) {
        document.body.appendChild(
          createNotification(
            {
              textContent:
                "You can only edit shared pages that you created with this Just Read account.",
              url: "https://justread.link/dashboard",
              primaryText: "Open dashboard",
              secondaryText: "OK",
            },
            document,
          ),
        );
        return;
      }
      hydrateSharedPage(data);
    })
    .catch((err) => console.error("canEditEntry error", err));
}

function hydrateSharedPage(data) {
  const container = document.querySelector(".simple-container");
  if (!container) return;

  JR.isHydratedSharedPage = true;
  document.documentElement.dataset.jrHydrated = "true";
  document.documentElement.dataset.jrDirty = "0";
  JR.sharedPageUrl = data.JRUrl || window.location.href.split(/[?#]/)[0];
  JR.sharedOrigURL = data.origURL || "";
  JR.hasSavedLink = true;
  JR.readerDocument = document;
  JR.readerIframe = undefined;
  JR.styleElem = container.querySelector("style");

  JR.comments = container.querySelector(".simple-comments");
  JR.compactComments = container.querySelector(".simple-compact-comments");

  injectHydrateStyles();
  injectHydrateToolbar(container);

  const addCommentContainer = createCommentChrome();
  if (!container.querySelector(".simple-add-comment-container")) {
    const comments = container.querySelector(".simple-comments");
    if (comments) {
      container.insertBefore(addCommentContainer, comments);
    } else {
      container.appendChild(addCommentContainer);
    }
  }
  if (JR.compactComments && !JR.compactComments.parentElement) {
    container.appendChild(JR.compactComments);
  }
  if (JR.comments && !JR.comments.parentElement) {
    container.appendChild(JR.comments);
  }

  rewireExistingComments();
  syncSidebarCommentsLayout();
  enableSharedMetaEditing();

  bindReaderControls();
  bindReaderKeyboardShortcuts();
  addInlineCommentFunctionality();

  JR.readerDocument.addEventListener("pointerup", handleSelectionPointerUp);
  JR.readerDocument.addEventListener("touchend", handleSelectionPointerUp);
  JR.readerDocument.addEventListener("pointermove", handlePointerMove);

  JR.readerDocument.querySelectorAll("a").forEach((a) => {
    a.onclick = linkListener;
  });

  setTimeout(checkBreakpoints, 10);

  updateShareButtonSaveState();

  // Shared pages typeset via self-hosted MathJax; still run for placeholders
  // that appear after hydrate or if page MathJax has not finished.
  if (typeof typesetMath === "function") {
    typesetMath(document);
  }
}

function injectHydrateStyles() {
  if (document.querySelector(".jr-hydrate-required-styles")) return;

  fetchExtensionCss("required-styles.css").then((css) => {
    const style = document.createElement("style");
    style.className = "jr-hydrate-required-styles";
    style.textContent = css;
    document.head.appendChild(style);
  });
}

function injectHydrateToolbar(container) {
  let ui = container.querySelector(".simple-ui-container");
  if (!ui) {
    ui = document.createElement("div");
    ui.className = "simple-ui-container";
    container.insertBefore(ui, container.firstChild);
  }

  if (!ui.querySelector(".simple-close")) {
    ui.insertBefore(addCloseButton(), ui.firstChild);
  }

  const printBtn = ui.querySelector(".simple-print");
  if (!ui.querySelector(".simple-share")) {
    const share = addShareButton();
    share.title = "Save changes to this shared page";
    if (printBtn && printBtn.nextSibling) {
      ui.insertBefore(share, printBtn.nextSibling);
    } else if (printBtn) {
      ui.appendChild(share);
    } else {
      ui.appendChild(share);
    }
  }

  ui.querySelectorAll(".simple-summarize").forEach((btn) => btn.remove());

  const delModeBtn = addDelModeButton();
  if (!ui.querySelector(".simple-delete")) {
    ui.appendChild(delModeBtn);
  }

  if (!ui.querySelector(".simple-undo")) {
    ui.appendChild(addUndoButton());
  }
}

function enableSharedMetaEditing() {
  [".simple-date", ".simple-author", ".simple-title"].forEach((sel) => {
    const el = JR.readerDocument.querySelector(sel);
    if (!el) return;
    el.setAttribute("contenteditable", true);
    el.addEventListener("input", () => updateSavedVersion());
  });
}

function unhydrateSharedPage() {
  if (hasUnsavedSharedEdits()) {
    if (!window.confirm(UNSAVED_SHARED_EDITS_MESSAGE + " Close without saving?")) {
      return;
    }
  }
  allowSharedPageUnload = true;
  window.location.reload();
}
