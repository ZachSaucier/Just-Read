// Add the theme editor button
function addThemeEditorButton() {
  const button = JR.readerDocument.createElement("button");

  button.className = "simple-control simple-edit-theme";
  button.title = "Edit your theme";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 626 626");

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", "translate(0,626) scale(0.1,-0.1)");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    "M6155 5867 c-116 -63 -356 -224 -645 -433 -85 -62 -168 -122 -185 -134 -53 -38 -255 -190 -458 -344 -109 -83 -208 -158 -220 -166 -12 -8 -90 -69 -173 -135 -83 -66 -222 -176 -309 -245 -87 -69 -191 -151 -229 -183 -39 -32 -89 -73 -110 -90 -22 -18 -53 -44 -70 -58 -17 -15 -99 -82 -182 -150 -480 -394 -983 -857 -1140 -1049 -29 -36 -100 -145 -158 -243 -88 -149 -103 -179 -91 -189 8 -7 50 -44 93 -83 98 -88 192 -200 259 -310 28 -47 53 -91 55 -97 5 -15 411 189 488 245 183 134 659 610 1080 1082 78 88 159 178 179 200 112 122 633 729 757 881 27 33 148 182 269 330 122 148 250 306 285 352 36 46 110 140 165 210 224 283 445 602 445 642 0 18 -24 10 -105 -33z"
  );

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    "M1600 2230 c-216 -57 -398 -199 -572 -447 -40 -57 -135 -228 -158 -283 -36 -90 -113 -248 -165 -335 -103 -175 -295 -391 -446 -502 -73 -54 -187 -113 -217 -113 -49 0 -6 -21 131 -64 484 -151 904 -174 1250 -66 435 135 734 469 901 1005 46 149 58 214 45 254 -54 167 -231 392 -408 519 l-64 46 -111 3 c-86 2 -128 -2 -186 -17z"
  );

  g.appendChild(path1);
  g.appendChild(path2);
  svg.appendChild(g);
  button.appendChild(svg);

  // button.innerText = "Edit styles"; // TODO fix
  button.onclick = openStyleEditor;

  return button;
}

// Helper functions for the GUI editor
let prevStyles = {},
  saved = false,
  bodySelector = ".jr-body";

const StyleEditor = function () {
  bodySelector = getStylesheetValue(JR.themeStylesheet, ".jr-body", "font-size")
    ? ".jr-body"
    : "body";

  this.theme = prevStyles.theme = JR.theme;
  this.fontSize = prevStyles.fontSize = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "font-size"
  );
  this.textColor = prevStyles.textColor = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "color"
  );
  this.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "background-color"
  );
  this.linkColor = prevStyles.linkColor = getStylesheetValue(
    JR.themeStylesheet,
    "a[href]",
    "color"
  );
  this.linkHoverColor = prevStyles.linkHoverColor = getStylesheetValue(
    JR.themeStylesheet,
    "a[href]:hover",
    "color"
  );
  this.maxWidth = prevStyles.maxWidth = getStylesheetValue(
    JR.themeStylesheet,
    ".simple-article-container",
    "max-width"
  );
  this.openFullStyles = openOptionsPage;
};

function updateEditorStyles(editor) {
  editor.fontSize = prevStyles.fontSize = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "font-size"
  );
  editor.textColor = prevStyles.textColor = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "color"
  );
  editor.backgroundColor = prevStyles.backgroundColor = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "background-color"
  );
  editor.linkColor = getStylesheetValue(JR.themeStylesheet, "a[href]", "color");
  editor.linkHoverColor = getStylesheetValue(JR.themeStylesheet, "a[href]:hover", "color");
  editor.maxWidth = getStylesheetValue(
    JR.themeStylesheet,
    ".simple-article-container",
    "max-width"
  );

  JR.datGUI.__controllers.forEach((controller) => controller.updateDisplay());
}

function openOptionsPage() {
  chrome.runtime.sendMessage("Open options");
}

function updatePrevStyles(newTheme) {
  prevStyles.theme = newTheme;
  prevStyles.fontSize = getStylesheetValue(JR.themeStylesheet, bodySelector, "font-size");
  prevStyles.textColor = getStylesheetValue(JR.themeStylesheet, bodySelector, "color");
  prevStyles.backgroundColor = getStylesheetValue(
    JR.themeStylesheet,
    bodySelector,
    "background-color"
  );
  prevStyles.linkColor = getStylesheetValue(JR.themeStylesheet, "a[href]", "color");
  prevStyles.linkHoverColor = getStylesheetValue(JR.themeStylesheet, "a[href]:hover", "color");
  prevStyles.maxWidth = getStylesheetValue(
    JR.themeStylesheet,
    ".simple-article-container",
    "max-width"
  );
  prevStyles.originalThemeCSS = JR.stylesheetObj[newTheme];
}

function saveStyles() {
  JR.usedGUI = true;

  // Save styles to the stylesheet
  let newTheme = false;
  if (JR.theme === "default-styles.css" || JR.theme === "dark-styles.css") {
    JR.theme = checkFileName(JR.theme, JR.stylesheetObj);
    chrome.storage.sync.set({ currentTheme: JR.theme });
    newTheme = true;
  }

  let CSSString = "";
  Array.from(JR.themeStylesheet.cssRules).forEach((rule) => (CSSString += rule.cssText + "\n"));

  JR.stylesheetObj[JR.theme] = CSSString;
  saveStylesheetsToStorage(JR.stylesheetObj);
  if (newTheme) {
    let selectElem = document.querySelector(".dg select");
    selectElem.innerHTML = DOMPurify.sanitize(
      selectElem.innerHTML +
        "<option value='" +
        JR.theme +
        "'>" +
        JR.theme +
        "</option>"
    );
    selectElem.selectedIndex = selectElem.length - 1;
  }

  updatePrevStyles(JR.theme);

  saved = true;

  closeStyleEditor();
}

function closeStyleEditor() {
  if (!saved) {
    changeStylesheetRule(JR.themeStylesheet, bodySelector, "font-size", prevStyles.fontSize);
    changeStylesheetRule(
      JR.themeStylesheet,
      ".simple-article-container",
      "max-width",
      prevStyles.maxWidth
    );
    changeStylesheetRule(JR.themeStylesheet, bodySelector, "color", prevStyles.textColor);
    changeStylesheetRule(
      JR.themeStylesheet,
      bodySelector,
      "background-color",
      prevStyles.backgroundColor
    );
    changeStylesheetRule(JR.themeStylesheet, ".simple-author", "color", prevStyles.linkColor);
    changeStylesheetRule(JR.themeStylesheet, "a[href]", "color", prevStyles.linkColor);
    changeStylesheetRule(
      JR.themeStylesheet,
      "a[href]:hover",
      "color",
      prevStyles.linkHoverColor
    );
    JR.styleElem.innerHTML = DOMPurify.sanitize(prevStyles.originalThemeCSS);
  }

  JR.datGUI.domElement.style.display = "none";

  saved = false;
}

function openStyleEditor() {
  JR.themeStylesheet = JR.readerDocument.styleSheets[2];

  if (JR.datGUI) {
    JR.datGUI.domElement.style.display = "block";
    JR.datGUI.closed = false;
    const closeBtn = document.querySelector(".dg .close-button");
    closeBtn.innerText = "Save and close";
  } else {
    const editor = new StyleEditor();

    JR.datGUI = new dat.GUI();

    const themeList = JR.datGUI.add(editor, "theme", Object.keys(JR.stylesheetObj));
    editor.theme = JR.theme;

    prevStyles.originalThemeCSS = JR.stylesheetObj[JR.theme];
    themeList.onChange((value) => {
      saved = true;
      JR.styleElem.innerHTML = DOMPurify.sanitize(JR.stylesheetObj[value]);
      JR.themeStylesheet = JR.readerDocument.styleSheets[2];
      updateEditorStyles(editor);

      JR.theme = value;
      chrome.storage.sync.set({ currentTheme: JR.theme });
      updatePrevStyles(JR.theme);
    });
    const fontSize = JR.datGUI.add(editor, "fontSize", 8, 25);
    fontSize.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, bodySelector, "font-size", value);
    });
    const maxWidth = JR.datGUI.add(editor, "maxWidth");
    maxWidth.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, ".simple-article-container", "max-width", value);
    });
    const textColor = JR.datGUI.addColor(editor, "textColor");
    textColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, bodySelector, "color", value);
    });
    const backgroundColor = JR.datGUI.addColor(editor, "backgroundColor");
    backgroundColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, bodySelector, "background-color", value);
    });
    const linkColor = JR.datGUI.addColor(editor, "linkColor");
    linkColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, ".simple-author", "color", value);
      changeStylesheetRule(JR.themeStylesheet, "a[href]", "color", value);
    });
    const linkHoverColor = JR.datGUI.addColor(editor, "linkHoverColor");
    linkHoverColor.onChange((value) => {
      saved = false;
      changeStylesheetRule(JR.themeStylesheet, "a[href]:hover", "color", value);
    });
    JR.datGUI.add(editor, "openFullStyles");

    // Add the save and close buttons
    let closeBtn = document.querySelector(".dg .close-button");

    // Switch the variables to match DOM order
    const clone = closeBtn.cloneNode(true);
    closeBtn.parentElement.appendChild(clone);
    const saveAndClose = closeBtn;
    closeBtn = clone;

    saveAndClose.className += " saveAndClose";

    saveAndClose.innerText = "Save and close";
    closeBtn.innerText = "Close without saving";

    saveAndClose.onclick = saveStyles;
    closeBtn.onclick = closeStyleEditor;
  }
}

function getStylesheetValue(stylesheet, selector, property) {
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();

  // Return it if it exists
  for (let rule of Array.from(stylesheet.cssRules)) {
    if (rule.selectorText === selector && rule.style[property]) {
      return convertCssVariableToReadableValue(rule.style[property]);
    }
  }

  return null;
}

function changeStylesheetRule(stylesheet, selector, property, value) {
  // Make the strings lowercase
  selector = selector.toLowerCase();
  property = property.toLowerCase();
  value = value.toLowerCase();

  // Change it if it exists
  for (let rule of Array.from(stylesheet.cssRules)) {
    if (rule.selectorText === selector && rule.style[property]) {
      rule.style[property] = value;
      return;
    }
  }

  // Add it if it does not
  stylesheet.insertRule(selector + "{" + property + ":" + value + "}", 0);
}
