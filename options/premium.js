function allowPremiumStuff() {
  document.querySelector(".options-subtitle").style.display = "block";
  document.querySelector(".upgrade").style.display = "none";
  document
    .querySelectorAll(".disabled")
    .forEach((el) => el.classList.remove("disabled"));
}

function showPremiumNotification() {
  const notification = {
    textKey: "premiumUpsellGeneric",
    url: "https://justread.link/#get-Just-Read",
    primaryKey: "learnMore",
    secondaryKey: "maybeLater",
  };
  document.body.appendChild(createNotification(notification));
}
