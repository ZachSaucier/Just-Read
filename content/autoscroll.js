// Auto-scroll functionality
function scrollPage() {
  if (
    JR.readerDocument &&
    !JR.readerDocument.body.classList.contains("paused")
  ) {
    let curTime = Date.now(),
      timePassed = curTime - JR.lastTime;

    if (timePassed > 16.6666667) {
      JR.nextMove += JR.scrollSpeed;
      JR.readerDocument.defaultView.scrollBy(0, JR.nextMove);

      JR.lastTime = curTime;

      if (JR.nextMove > 1) JR.nextMove = 0;
    }
  }

  requestAnimationFrame(scrollPage);
}

function toggleScroll() {
  JR.readerDocument.body.classList.toggle("paused");
  if (JR.readerDocument.body.classList.contains("paused")) {
    JR.pauseScrollBtn.innerText = t("startScroll");
  } else {
    JR.pauseScrollBtn.innerText = t("pauseScroll");
  }
}

function createPauseScrollButton() {
  JR.pauseScrollBtn = document.createElement("button");
  JR.pauseScrollBtn.className = "pause-scroll";
  JR.pauseScrollBtn.innerText = t("pauseScroll");
  JR.pauseScrollBtn.onclick = toggleScroll;

  return JR.pauseScrollBtn;
}

function handleScrollSpeedInput(e) {
  const speed = parseFloat(JR.scrollSpeedInput.value);
  if (speed) {
    JR.scrollSpeed = speed;
    chrome.storage.sync.set({ "scroll-speed": speed });
  }
}

function createScrollSpeedInput() {
  JR.scrollSpeedInput = document.createElement("input");
  JR.scrollSpeedInput.type = "number";
  JR.scrollSpeedInput.className = "scroll-input";
  JR.scrollSpeedInput.value = JR.scrollSpeed;
  JR.scrollSpeedInput.step = "0.1";
  JR.scrollSpeedInput.pattern = "^d*(.d{0,2})?$";
  JR.scrollSpeedInput.min = "0";
  JR.scrollSpeedInput.onchange = handleScrollSpeedInput;
  JR.scrollSpeedInput.onkeyup = handleScrollSpeedInput;

  return JR.scrollSpeedInput;
}
