function allowPremiumStuff() {
  document.querySelector(".options-subtitle").style.display = "block";
  document.querySelector(".upgrade").style.display = "none";
  document
    .querySelectorAll(".disabled")
    .forEach((el) => el.classList.remove("disabled"));
}

function showPremiumNotification() {
  const notification = {
    textContent:
      "To access this feature, upgrade to <a href='https://justread.link/#get-Just-Read' target='_blank'>Just Read Premium</a>!",
    url: "https://justread.link/#get-Just-Read",
    primaryText: "Learn more",
    secondaryText: "Maybe later",
  };
  document.body.appendChild(createNotification(notification));
}
