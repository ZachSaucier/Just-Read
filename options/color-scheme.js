var optionsColorSchemeSaved = null;
var darkAceThemeLoaded = false;

var ACE_LIGHT_THEME = "ace/theme/crimson_editor";
var ACE_DARK_THEME = "ace/theme/cloud_editor_dark";

function optionsPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function optionsIsDarkMode() {
  if (optionsColorSchemeSaved === "dark") return true;
  if (optionsColorSchemeSaved === "light") return false;
  return optionsPrefersDark();
}

function ensureDarkAceTheme() {
  if (darkAceThemeLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(
      "external-libraries/ace/theme-cloud_editor_dark.js",
    );
    script.onload = () => {
      darkAceThemeLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Ace dark theme"));
    document.head.appendChild(script);
  });
}

function applyOptionsEditorTheme(dark) {
  if (typeof editor === "undefined") return;

  if (dark) {
    ensureDarkAceTheme()
      .then(() => editor.setTheme(ACE_DARK_THEME))
      .catch((err) => console.warn("Just Read: dark editor theme failed", err));
    return;
  }

  editor.setTheme(ACE_LIGHT_THEME);
}

function syncOptionsColorSchemeUI() {
  const dark = optionsIsDarkMode();

  if (optionsColorSchemeSaved) {
    document.documentElement.dataset.theme = optionsColorSchemeSaved;
  } else {
    delete document.documentElement.dataset.theme;
  }

  if (optionsThemeToggle) {
    const dark = optionsIsDarkMode();
    optionsThemeToggle.classList.toggle("is-dark", dark);
    optionsThemeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
    const labelKey = dark
      ? "optionsThemeSwitchLight"
      : "optionsThemeSwitchDark";
    setAccessibleLabel(optionsThemeToggle, labelKey);
  }

  applyOptionsEditorTheme(dark);
}

function initOptionsColorScheme() {
  chrome.storage.sync.get("optionsColorScheme", (result) => {
    const saved = result.optionsColorScheme;
    optionsColorSchemeSaved =
      saved === "light" || saved === "dark" ? saved : null;
    initI18nFromStorage().then(syncOptionsColorSchemeUI);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!optionsColorSchemeSaved) syncOptionsColorSchemeUI();
    });
}

initOptionsColorScheme();
