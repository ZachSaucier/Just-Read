function refreshPremiumStatus(options) {
  const secret = options.secret;
  const lastChecked = options.lastChecked;
  const needsRefresh =
    secret &&
    (typeof lastChecked === "undefined" ||
      lastChecked === "" ||
      Date.now() - lastChecked > 86400000);

  if (!needsRefresh) {
    options.onReady({
      isPremium: !!options.cachedIsPremium,
      secret: secret || false,
    });
    return;
  }

  chrome.storage.sync.set({ jrLastChecked: Date.now() });

  fetch(options.domain + "checkPremium", {
    mode: "cors",
    method: "POST",
    headers: { "Content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ jrSecret: secret }),
  })
    .then(function (response) {
      if (!response.ok) throw response;
      return response.text();
    })
    .then((response) => {
      const isPremium = response === "true";
      chrome.storage.sync.set({ isPremium: isPremium });
      options.onReady({
        isPremium: isPremium,
        secret: secret,
      });
    })
    .catch((err) => console.error(`Fetch Error =\n`, err));
}
