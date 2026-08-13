function createNotification(options, doc) {
  doc = doc || document;

  const oldNotification = doc.querySelector(".jr-notifier");
  if (oldNotification)
    oldNotification.parentElement.removeChild(oldNotification);

  const notifier = doc.createElement("div");
  notifier.className = "jr-tooltip jr-notifier";

  const notificationText = doc.createElement("p");
  if (typeof DOMPurify !== "undefined") {
    notificationText.innerHTML = DOMPurify.sanitize(options.textContent);
  } else {
    notificationText.innerHTML = options.textContent;
  }

  const btnContainer = doc.createElement("div");
  btnContainer.className = "right-align-buttons";

  const removeNotification = () => {
    if (notifier.parentElement) notifier.parentElement.removeChild(notifier);
  };

  const secondaryBtn = doc.createElement("button");
  secondaryBtn.className = "jr-secondary";
  secondaryBtn.addEventListener("click", removeNotification, { once: true });
  secondaryBtn.innerText = options.secondaryText;

  const primaryLink = doc.createElement("a");
  primaryLink.href = options.url;
  primaryLink.target = "_blank";

  const primaryBtn = doc.createElement("button");
  primaryBtn.className = "jr-primary";
  primaryBtn.innerText = options.primaryText;
  primaryBtn.addEventListener("click", removeNotification, { once: true });

  primaryLink.appendChild(primaryBtn);
  btnContainer.appendChild(secondaryBtn);
  btnContainer.appendChild(primaryLink);

  notifier.appendChild(notificationText);
  notifier.appendChild(btnContainer);

  return notifier;
}
