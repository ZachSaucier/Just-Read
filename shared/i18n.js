const EXTENSION_LOCALE_STORAGE_KEY = "extensionLocale";
const SITE_ORIGIN = "https://justread.link";

/** Extension _locales folder → jr-server URL locale (BCP 47). */
const EXTENSION_FOLDER_TO_WEBSITE = {
  en: "en",
  ru: "ru",
  es: "es",
  pt_BR: "pt-BR",
  zh_CN: "zh-CN",
  de: "de",
  fr: "fr",
  zh_TW: "zh-TW",
  ja: "ja",
  ko: "ko",
  it: "it",
  pt_PT: "pt-PT",
  uk: "uk",
  sv: "sv",
  pl: "pl",
  tr: "tr",
};

const WEBSITE_LOCALES = new Set(Object.values(EXTENSION_FOLDER_TO_WEBSITE));

/** Chrome _locales folder → native label for the options language select. */
const EXTENSION_LOCALE_LABELS = {
  en: "English",
  ru: "Русский",
  es: "Español",
  pt_BR: "Português (Brasil)",
  zh_CN: "简体中文",
  de: "Deutsch",
  fr: "Français",
  zh_TW: "繁體中文",
  ja: "日本語",
  ko: "한국어",
  it: "Italiano",
  pt_PT: "Português (Portugal)",
  uk: "Українська",
  sv: "Svenska",
  pl: "Polski",
  tr: "Türkçe",
};

let customMessages = null;
let activeLocale = null;
let i18nReady = null;

function normalizeExtensionLocale(locale) {
  if (!locale || locale === "auto") return "";
  return locale;
}

function uiLanguageToWebsiteLocale(uiLang) {
  if (!uiLang) return "en";
  const normalized = uiLang.replace(/_/g, "-");
  if (WEBSITE_LOCALES.has(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  for (const locale of WEBSITE_LOCALES) {
    if (locale.toLowerCase() === lower) return locale;
  }

  const base = normalized.split("-")[0];
  const match = [...WEBSITE_LOCALES].find(
    (locale) => locale === base || locale.startsWith(base + "-"),
  );
  return match || "en";
}

function getWebsiteLocale() {
  if (activeLocale && EXTENSION_FOLDER_TO_WEBSITE[activeLocale]) {
    return EXTENSION_FOLDER_TO_WEBSITE[activeLocale];
  }
  return uiLanguageToWebsiteLocale(chrome.i18n.getUILanguage());
}

/** Path on justread.link for the active extension language (English unprefixed). */
function sitePath(path) {
  const locale = getWebsiteLocale();
  let normalized = path || "/";
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  if (locale === "en") return normalized;
  if (normalized === "/") return `/${locale}/`;
  return `/${locale}${normalized}`;
}

function siteUrl(path) {
  return SITE_ORIGIN + sitePath(path);
}

function localizeSiteUrls(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(
    /https:\/\/(?:www\.)?justread\.link(\/?[^\s"'<>]*)/gi,
    (_match, pathPart) => siteUrl(pathPart || "/"),
  );
}

function applySiteLinks(root) {
  const scope = root || (typeof document !== "undefined" ? document : null);
  if (!scope || !scope.querySelectorAll) return;

  scope.querySelectorAll("a[href^='https://justread.link']").forEach((anchor) => {
    try {
      const url = new URL(anchor.href);
      anchor.href = siteUrl(url.pathname + url.hash);
    } catch (_err) {
      // leave unchanged
    }
  });
}

function applySubstitutions(message, entry, substitutions) {
  let result = message;
  if (substitutions == null) return result;

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];

  if (entry.placeholders) {
    for (const [name, ph] of Object.entries(entry.placeholders)) {
      const token = "$" + name.toUpperCase() + "$";
      const index = parseInt(ph.content.replace(/\D/g, ""), 10) - 1;
      if (index >= 0 && index < subs.length) {
        result = result.split(token).join(String(subs[index]));
      }
    }
  }

  subs.forEach((sub, i) => {
    result = result.split("$" + (i + 1)).join(String(sub));
  });

  return result;
}

function t(key, substitutions) {
  let result;
  if (customMessages && customMessages[key]) {
    const entry = customMessages[key];
    result = applySubstitutions(entry.message, entry, substitutions) || "";
  } else if (substitutions != null) {
    result = chrome.i18n.getMessage(key, substitutions);
  } else {
    result = chrome.i18n.getMessage(key);
  }
  return localizeSiteUrls(result);
}

function isExtensionContext() {
  if (typeof location === "undefined") return true;
  return (
    location.protocol === "chrome-extension:" ||
    location.protocol === "moz-extension:"
  );
}

function fetchLocaleMessagesFile(locale) {
  const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to load locale ${locale}`);
    return res.json();
  });
}

function loadCustomMessages(locale) {
  if (isExtensionContext()) {
    return fetchLocaleMessagesFile(locale);
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ getLocaleMessages: locale }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Failed to load locale messages"));
        return;
      }
      resolve(response.messages);
    });
  });
}

function initI18n(locale) {
  locale = normalizeExtensionLocale(locale);
  if (!locale) {
    customMessages = null;
    activeLocale = null;
    return Promise.resolve();
  }

  if (locale === activeLocale && customMessages) {
    return Promise.resolve();
  }

  return loadCustomMessages(locale)
    .then((messages) => {
      customMessages = messages;
      activeLocale = locale;
    })
    .catch((err) => {
      console.warn("Just Read: falling back to browser locale", err);
      customMessages = null;
      activeLocale = null;
    });
}

function resetI18nCache() {
  i18nReady = null;
  customMessages = null;
  activeLocale = null;
}

function initI18nFromStorage() {
  if (i18nReady) return i18nReady;

  i18nReady = new Promise((resolve) => {
    chrome.storage.sync.get(EXTENSION_LOCALE_STORAGE_KEY, (result) => {
      initI18n(result[EXTENSION_LOCALE_STORAGE_KEY]).then(resolve);
    });
  });

  return i18nReady;
}

function populateExtensionLocaleSelect(selectEl) {
  if (!selectEl) return;

  selectEl.textContent = "";

  const auto = document.createElement("option");
  auto.value = "";
  auto.textContent = t("optionsLanguageAuto");
  selectEl.appendChild(auto);

  Object.keys(EXTENSION_LOCALE_LABELS)
    .sort((a, b) =>
      EXTENSION_LOCALE_LABELS[a].localeCompare(
        EXTENSION_LOCALE_LABELS[b],
        undefined,
        { sensitivity: "base" },
      ),
    )
    .forEach((locale) => {
      const option = document.createElement("option");
      option.value = locale;
      option.textContent = EXTENSION_LOCALE_LABELS[locale];
      selectEl.appendChild(option);
    });
}

function setAccessibleLabel(el, messageKey) {
  const label = t(messageKey);
  el.setAttribute("aria-label", label);
  el.title = label;
}

function isMacPlatform() {
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}

function platformKey(baseKey) {
  return t(isMacPlatform() ? baseKey + "Mac" : baseKey + "Win");
}

function commentLeftOnPrefix() {
  return t("commentLeftOnPrefix");
}

function formatMinuteRead(count) {
  const key = count === 1 ? "minuteReadSingular" : "minuteReadPlural";
  return t(key, [String(count)]);
}

function sanitizeLocalizedHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const frag = document.createDocumentFragment();

  function appendSanitized(node, parent) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(child.textContent));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const tag = child.tagName;
      if (tag === "A") {
        const href = child.getAttribute("href");
        if (!href || /^javascript:/i.test(href.trim())) continue;
        const anchor = document.createElement("a");
        anchor.href = href;
        const target = child.getAttribute("target");
        if (target) anchor.target = target;
        const rel = child.getAttribute("rel");
        if (rel) anchor.rel = rel;
        appendSanitized(child, anchor);
        parent.appendChild(anchor);
      } else if (tag === "I" || tag === "EM") {
        const italic = document.createElement("i");
        appendSanitized(child, italic);
        parent.appendChild(italic);
      } else if (tag === "CODE") {
        const code = document.createElement("code");
        appendSanitized(child, code);
        parent.appendChild(code);
      } else if (tag === "BR") {
        parent.appendChild(document.createElement("br"));
      } else if (tag === "BODY") {
        appendSanitized(child, frag);
      } else {
        appendSanitized(child, parent);
      }
    }
  }

  appendSanitized(doc.body, frag);
  return frag;
}

function setLocalizedHtml(el, key) {
  const html = t(key);
  if (!html) return;
  el.textContent = "";
  el.appendChild(sanitizeLocalizedHtml(html));
}

function buildShareLimitAlert() {
  return sanitizeLocalizedHtml(t("shareLimitMessage"));
}
