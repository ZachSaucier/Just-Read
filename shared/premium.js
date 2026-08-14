function refreshPremiumStatus(options) {
  const secret = options.secret;
  const lastChecked = options.lastChecked;
  const ready = (isPremium, readySecret) => {
    options.onReady({
      isPremium: !!isPremium,
      secret: readySecret || false,
    });
  };
  const needsRefresh =
    secret &&
    (typeof lastChecked === "undefined" ||
      lastChecked === "" ||
      Date.now() - lastChecked > 86400000);

  if (!needsRefresh) {
    ready(options.cachedIsPremium, secret);
    return;
  }

  jrFetch(options.domain + "checkPremium", {
    method: "POST",
    headers: { "Content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ jrSecret: secret }),
  })
    .then(function (response) {
      if (!response.ok) throw response;
      return response.text();
    })
    .then((response) => {
      const isPremium = String(response).trim() === "true";
      chrome.storage.sync.set({
        isPremium: isPremium,
        jrLastChecked: Date.now(),
      });
      ready(isPremium, secret);
    })
    .catch((err) => {
      console.error(`Fetch Error =\n`, err);
      ready(options.cachedIsPremium, secret);
    });
}
