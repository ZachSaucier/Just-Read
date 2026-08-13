// User-selected text functionality
let hoveredElement;
function startSelectElement(doc) {

  const pointerFunc = function (e) {
      const elem = e.target;

      if (hoveredElement != elem) {
        if (hoveredElement != null) {
          hoveredElement.classList.remove("jr-hovered");
        }

        hoveredElement = elem;
        elem.classList.add("jr-hovered");
      }
    },
    clickFunc = function (e) {
      JR.userSelected = e.target;

      exitFunc();
    },
    escFunc = function (e) {
      // Listen for the "Esc" key and exit if so
      if (e.key === "Escape") exitFunc(true);
    },
    exitFunc = function (avoidLaunch) {
      doc.removeEventListener("pointerover", pointerFunc);
      doc.removeEventListener("click", clickFunc);
      doc.removeEventListener("keydown", escFunc);

      if (doc.querySelector(".jr-hovered") != null)
        doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

      if (doc.getElementById("temp-style") != null)
        doc
          .getElementById("temp-style")
          .parentElement.removeChild(doc.getElementById("temp-style"));

      JR.useText = false;

      if (avoidLaunch) return;
      launch();
    };

  doc.addEventListener("pointerover", pointerFunc);
  doc.addEventListener("click", clickFunc);
  doc.addEventListener("keydown", escFunc);

  doc.documentElement.focus();

  // Add our styles temporarily
  const tempStyle = doc.createElement("style");
  tempStyle.id = "temp-style";
  tempStyle.innerText =
    ".jr-hovered, .jr-hovered * { cursor: pointer !important; color: black !important; background-color: #2095f2 !important; }";

  doc.head.appendChild(tempStyle);
}

// Same hover-to-select pattern, used for deletion once the article is open
function startDeleteElement(doc) {
  const pointerFunc = function (e) {
      const elem = e.target;

      if (
        !elem.classList.contains("simple-container") &&
        !elem.classList.contains("simple-ui-container") &&
        !elem.classList.contains("simple-control") &&
        !elem.classList.contains("simple-add-comment") &&
        !elem.classList.contains("simple-comments") &&
        elem.parentElement &&
        elem.parentElement.classList &&
        !(
          elem.parentElement.classList.contains("simple-add-comment") ||
          elem.parentElement.classList.contains("simple-control")
        ) &&
        doc.body != elem &&
        doc.documentElement != elem &&
        elem.tagName !== "path" &&
        elem.tagName !== "rect" &&
        elem.tagName !== "polygon" &&
        elem.tagName !== "PROGRESS"
      ) {
        if (hoveredElement != elem) {
          if (hoveredElement != null) {
            hoveredElement.classList.remove("jr-hovered");
          }

          hoveredElement = elem;
          elem.classList.add("jr-hovered");
        }
      }
    },
    clickFunc = function (e) {
      JR.selected = e.target;

      if (
        !JR.selected.classList.contains("simple-container") &&
        !JR.selected.classList.contains("simple-ui-container") &&
        !JR.selected.classList.contains("simple-control") &&
        !JR.selected.classList.contains("simple-add-comment") &&
        !JR.selected.classList.contains("simple-comments") &&
        JR.selected.parentElement.classList &&
        !(
          JR.selected.parentElement.classList.contains("simple-add-comment") ||
          JR.selected.parentElement.classList.contains("simple-control")
        ) &&
        doc.body != JR.selected &&
        doc.documentElement != JR.selected &&
        JR.selected.tagName !== "path" &&
        JR.selected.tagName !== "rect" &&
        JR.selected.tagName !== "polygon" &&
        JR.selected.tagName !== "PROGRESS"
      )
        recordAction("delete", JR.selected);

      e.preventDefault();
    },
    escFunc = function (e) {
      // Listen for the "Esc" key and exit if so
      if (e.key === "Escape") exitFunc();
    },
    exitFunc = function () {
      anchors.forEach(function (a) {
        a.removeEventListener("click", anchorFunc);
      });

      doc.removeEventListener("pointerover", pointerFunc);
      doc.removeEventListener("click", clickFunc);
      doc.removeEventListener("keydown", escFunc);

      [...iframes].forEach((elem) => (elem.style.pointerEvents = "auto"));

      if (doc.querySelector(".jr-hovered") != null)
        doc.querySelector(".jr-hovered").classList.remove("jr-hovered");

      doc.body.classList.remove("simple-deleting");

      JR.userSelected = null;

      sd.classList.remove("active");
      sd.onclick = function () {
        startDeleteElement(JR.readerDocument);
      };
    },
    anchorFunc = function (e) {
      e.preventDefault();
    };

  const anchors = doc.querySelectorAll("a");
  anchors.forEach(function (a) {
    a.addEventListener("click", anchorFunc);
  });

  doc.body.classList.add("simple-deleting");

  doc.addEventListener("pointerover", pointerFunc);
  doc.addEventListener("click", clickFunc);
  doc.addEventListener("keydown", escFunc);

  const iframes = doc.querySelectorAll("iframe");
  [...iframes].forEach((elem) => (elem.style.pointerEvents = "none"));

  const deleteModeButton = JR.readerDocument.querySelector(".simple-delete");

  deleteModeButton.classList.add("active");
  deleteModeButton.onclick = function () {
    exitFunc();
  };
}

const stack = [];
function recordAction(actionName, elem) {
  JR.hasSavedLink = false;
  JR.shareDropdown.classList.remove("active");

  let actionObj;
  if (actionName === "delete") {
    elem.classList.remove("jr-hovered");

    let parent = elem.parentElement;

    actionObj = {
      type: "delete",
      index: Array.from(parent.children).indexOf(elem),
      parent: parent,
      elem: parent.removeChild(elem),
    };
  }

  if (actionName) {
    stack.push(actionObj);
    JR.undoBtn.classList.add("shown");
  }

  updateSavedVersion();
  // REMOVE WHEN SWITCHING TO CSS SCROLL ANIMATION FOR SCROLLBAR
  updateScrollbarMetrics(); // Update the scrollbar sizing
}

function undoLastAction() {
  let actionObj = stack.pop();

  if (actionObj && actionObj.type === "delete") {
    actionObj.parent.insertBefore(
      actionObj.elem,
      actionObj.parent.children[actionObj.index]
    );
  } else if (actionObj && actionObj.type === "edit") {
    actionObj.elem.innerText = actionObj.text;
  }

  updateSavedVersion();

  // If empty, hide undo button
  if (stack.length === 0) {
    JR.undoBtn.classList.remove("shown");
  }

  // REMOVE WHEN SWITCHING TO CSS SCROLL ANIMATION FOR SCROLLBAR
  updateScrollbarMetrics(); // Update the scrollbar sizing
}

function updateSavedVersion() {
  if (JR.chromeStorage["backup"]) {
    const data = {
      url: window.location.href,
      content: DOMPurify.sanitize(
        JR.readerDocument.querySelector(".content-container").innerHTML
      ),
    };

    if (
      JR.readerDocument.querySelector(".simple-comments").innerHTML !== ""
    ) {
      data.savedComments = DOMPurify.sanitize(
        JR.readerDocument.querySelector(".simple-comments").innerHTML
      );
      data.savedCompactComments = DOMPurify.sanitize(
        JR.readerDocument.querySelector(".simple-compact-comments").innerHTML
      );
    }

    chrome.storage.local.set({ JRSavedPage: JSON.stringify(data) });
  }
}
