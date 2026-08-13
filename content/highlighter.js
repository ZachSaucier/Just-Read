// Highlighter-related functionality
let highlighter;
const rangyOptions = { exclusive: false };
function initHighlighter() {
  highlighter = rangy.createHighlighter(JR.readerDocument);

  const rangeOptions = {
    onElementCreate: (elem) => {
      elem.id = "jr-" + Date.now();
      JR.hasSavedLink = false;
      JR.shareDropdown.classList.remove("active");
      setTimeout(() => updateSavedVersion(), 10);
    },
  };

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-yellow", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-blue", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-green", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-pink", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-purple", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-orange", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-highlight-red", rangeOptions)
  );

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-white", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-black", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-yellow", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-blue", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-green", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-pink", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-purple", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-orange", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-color-red", rangeOptions)
  );

  highlighter.addClassApplier(
    rangy.createClassApplier("jr-strike-through", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-underline", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-italicize", rangeOptions)
  );
  highlighter.addClassApplier(
    rangy.createClassApplier("jr-bolden", rangeOptions)
  );
}

let lastMessage;
let savedAnnotationRanges = [];
function handleSelectionPointerUp(e) {
  let isTouch = e.type === "touchend";

  if (typeof JR.editBar === "undefined") {
    JR.editBar = createEditBar();
    JR.editBar.style.display = "none";
    JR.readerDocument.body.appendChild(JR.editBar);

    if (isTouch) {
      JR.editBar.style.transform = "translateY(-100%)";
      JR.editBar.querySelectorAll(".jr-color-picker").forEach((picker) => {
        picker.style.top = "auto";
        picker.style.bottom = "100%";
      });
    }

    // Keep the article selection when clicking toolbar buttons.
    JR.editBar.addEventListener("mousedown", (e) => e.preventDefault());
    JR.editBar.addEventListener("click", hidePickers);

    JR.editBar.querySelector(".jr-bold").addEventListener("click", bolden);
    JR.editBar.querySelector(".jr-italics").addEventListener("click", italicize);
    JR.editBar.querySelector(".jr-underl").addEventListener("click", underline);
    JR.editBar
      .querySelector(".jr-strike")
      .addEventListener("click", strikeThrough);
    JR.editBar
      .querySelector(".jr-deleteSel")
      .addEventListener("click", deleteSelection);

    textPicker = JR.editBar.querySelector(".jr-text-picker");
    JR.editBar
      .querySelector(".jr-text-color")
      .addEventListener("click", function (e) {
        hidePickers();
        textPicker.style.display = "block";
        e.stopPropagation();
      });
    textPicker.querySelectorAll(".jr-color-swatch").forEach(function (swatch) {
      swatch.addEventListener("click", function (e) {
        colorSelectedText(swatch.dataset.color);
        e.stopPropagation();
      });
    });

    highlightPicker = JR.editBar.querySelector(".jr-highlight-picker");
    JR.editBar
      .querySelector(".jr-highlight-color")
      .addEventListener("click", function (e) {
        hidePickers();
        highlightSelectedText(JR.lastHighlightColor);
        highlightPicker.style.display = "block";
        e.stopPropagation();
      });
    highlightPicker
      .querySelectorAll(".jr-color-swatch")
      .forEach(function (swatch) {
        swatch.addEventListener("click", function (e) {
          highlightSelectedText(swatch.dataset.color);
          e.stopPropagation();
        });
      });

    JR.editBar
      .querySelector(".jr-remove-styles")
      .addEventListener("click", removeHighlightFromSelectedText);
  }

  const sel = rangy.getSelection(JR.readerDocument).toString();
  if (sel !== "" && sel !== lastMessage && isContentElem(e.target)) {
    JR.editorShortcutsEnabled = true;
    lastMessage = sel;
    savedAnnotationRanges = cloneSelectionRanges();

    JR.editBar.style.display = "block";
    const r = rangy
      .getSelection(JR.readerDocument)
      .nativeSelection.getRangeAt(0)
      .getBoundingClientRect();
    JR.editBar.style.top =
      r.top + JR.readerDocument.defaultView.pageYOffset - 60 + "px";
    JR.editBar.style.left =
      r.left +
      r.width / 2 +
      JR.readerDocument.defaultView.pageXOffset -
      105 +
      "px";
  } else if (!JR.editBar.contains(e.target)) {
    hideToolbar();

    if (
      JR.readerDocument.querySelector(".jr-adding") &&
      JR.readerDocument.querySelector(".jr-adding textarea").value === "" &&
      !JR.readerDocument.querySelector(".jr-adding").contains(e.target)
    ) {
      cancelComment(null, JR.readerDocument.querySelector(".jr-adding"));
    }
  }
}

let highlightPicker, textPicker;
function hidePickers() {
  textPicker.style.display = "none";
  highlightPicker.style.display = "none";
}

function hideToolbar() {
  JR.editorShortcutsEnabled = false;
  lastMessage = "";
  savedAnnotationRanges = [];

  if (JR.editBar) {
    JR.editBar.style.display = "none";
    hidePickers();
  }

  checkBreakpoints();
}

function checkBreakpoints() {
  if (JR.readerDocument) {
    let container = JR.readerDocument.querySelector(
      ".simple-article-container"
    );
    if (window.innerWidth - container.offsetWidth < 320) {
      // Too small to show regular comments
      JR.readerDocument.body.classList.add("simple-compact-view");
    } else {
      JR.readerDocument.body.classList.remove("simple-compact-view");
    }
  }
}

function addHighlighterNotification() {
  const notification = {
    textContent:
      "To annotate this article, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>! Annotations are just <em>one</em> of the additional features included.",
    url: "https://justread.link/#get-Just-Read",
    primaryText: "Learn more",
    secondaryText: "Maybe later",
  };
  JR.readerDocument.body.appendChild(
    createNotification(notification, JR.readerDocument)
  );
}

function highlightSelectedText(colorName) {
  JR.lastHighlightColor = colorName;
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-highlight-" + colorName, {
      exclusive: true,
    });
  } else {
    addHighlighterNotification();
  }
}

function colorSelectedText(colorName) {
  JR.lastFontColor = colorName;
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-color-" + colorName, rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function bolden() {
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-bolden", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function italicize() {
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-italicize", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function underline() {
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-underline", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function strikeThrough() {
  if (JR.isPremium) {
    highlighter.highlightSelection("jr-strike-through", rangyOptions);
  } else {
    addHighlighterNotification();
  }
}

function toggleContentEditing() {
  const content_container = JR.readerDocument.querySelector(".content-container");
  const is_already_editable = content_container.getAttribute("contenteditable") === "true";

  if (is_already_editable) {
    content_container.setAttribute("contenteditable", false);
    content_container.onblur = false;
    updateSavedVersion();
  } else {
    content_container.setAttribute("contenteditable", true);
    content_container.onblur = toggleContentEditing;
  }
}

function deleteSelection() {
  if (JR.isPremium) {
    const sel = rangy.getSelection(JR.readerDocument);
    if (sel.rangeCount > 0) {
      for (let i = 0; i < sel.rangeCount; i++) {
        sel.getRangeAt(i).deleteContents();
      }
      hideToolbar();
      updateSavedVersion();
    }
  } else {
    addHighlighterNotification();
  }
}

function cloneSelectionRanges() {
  const ranges = [];
  const nativeSel = JR.readerDocument.getSelection();
  if (nativeSel && nativeSel.rangeCount > 0) {
    for (let i = 0; i < nativeSel.rangeCount; i++) {
      ranges.push(nativeSel.getRangeAt(i).cloneRange());
    }
  }
  return ranges;
}

function rangesForAnnotationRemoval() {
  const live = cloneSelectionRanges().filter((range) => !range.collapsed);
  if (live.length) return live;
  return savedAnnotationRanges.filter((range) => {
    try {
      return range.startContainer && range.startContainer.isConnected;
    } catch (e) {
      return false;
    }
  });
}

function annotationElementsInRange(range) {
  const root =
    JR.readerDocument.querySelector(".content-container") ||
    JR.readerDocument.body;
  const selector = [
    "[class*='jr-highlight-']",
    "[class*='jr-color-']",
    ".jr-strike-through",
    ".jr-underline",
    ".jr-italicize",
    ".jr-bolden",
  ].join(",");

  const matches = [];
  root.querySelectorAll(selector).forEach((el) => {
    if (rangeIntersectsNode(range, el)) matches.push(el);
  });
  return matches;
}

function rangeIntersectsNode(range, node) {
  try {
    if (typeof range.intersectsNode === "function") {
      return range.intersectsNode(node);
    }
  } catch (e) {
    // Fall through to boundary comparison
  }

  const nodeRange = JR.readerDocument.createRange();
  try {
    nodeRange.selectNode(node);
  } catch (e) {
    return false;
  }
  return (
    range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0 &&
    range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0
  );
}

function unwrapElement(el) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  parent.normalize();
}

function removeHighlightFromSelectedText() {
  // Rangy's unhighlightSelection() only knows highlights created this
  // session, and it always clears the selection — even when it unwraps
  // nothing. Collect and unwrap matching spans first, including those
  // persisted on a shared page, then let Rangy drop any session state.
  const toUnwrap = [];
  rangesForAnnotationRemoval().forEach((range) => {
    annotationElementsInRange(range).forEach((el) => {
      if (!toUnwrap.includes(el)) toUnwrap.push(el);
    });
  });

  toUnwrap
    .sort((a, b) => {
      const depth = (el) => {
        let d = 0;
        for (let n = el; n; n = n.parentElement) d++;
        return d;
      };
      return depth(b) - depth(a);
    })
    .forEach(unwrapElement);

  if (highlighter) {
    try {
      highlighter.unhighlightSelection();
    } catch (e) {
      // Highlighter has no record of this selection
    }
  }

  savedAnnotationRanges = [];
  updateSavedVersion();
  lastMessage = "";
  hideToolbar();
}
