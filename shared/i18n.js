function t(key, substitutions) {
  if (substitutions != null) {
    return chrome.i18n.getMessage(key, substitutions);
  }
  return chrome.i18n.getMessage(key);
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

function buildShareLimitAlert() {
  const lead = document.createTextNode(t("shareLimitLead"));
  const link = document.createElement("a");
  link.href = "https://justread.link/dashboard";
  link.innerText = t("yourUserPage");
  const tail = document.createTextNode(t("shareLimitTail"));
  const frag = document.createDocumentFragment();
  frag.appendChild(lead);
  frag.appendChild(link);
  frag.appendChild(tail);
  return frag;
}
