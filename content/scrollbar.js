// Progress bar functionality
// REMOVE WHEN SWITCHING TO CSS SCROLL ANIMATION FOR SCROLLBAR
let progressBar,
  ticking = false;
let winheight, docheight, trackLength;
function getDocHeight() {
  let D = JR.readerDocument;
  return Math.max(
    D.body.scrollHeight,
    D.documentElement.scrollHeight,
    D.body.offsetHeight,
    D.documentElement.offsetHeight,
    D.body.clientHeight,
    D.documentElement.clientHeight
  );
}
function updateScrollbarMetrics() {
  if (JR.settings.scrollbar) {
    let D = JR.readerDocument;
    winheight =
      D.defaultView.innerHeight || (D.documentElement || D.body).clientHeight;
    docheight = getDocHeight();
    trackLength = docheight - winheight;
    scheduleProgressBarUpdate();
  }
}
function scheduleProgressBarUpdate() {
  if (!ticking) {
    requestAnimationFrame(updateProgressBar);
    ticking = true;
  }
}
function updateProgressBar() {
  if (progressBar && JR.readerDocument) {
    const D = JR.readerDocument;
    const scrollTop =
      D.defaultView.pageYOffset ||
      (D.documentElement || D.body.parentElement || D.body).scrollTop;
    const pctScrolled = (scrollTop / trackLength) * 100 || 0;

    progressBar.value = pctScrolled;
  }

  ticking = false;
}
// END STUFF TO REMOVE

function initScrollbar() {
  JR.readerDocument.body.classList.add("hideScrollbar");

  progressBar = document.createElement("progress");
  progressBar.classList.add("simple-progress");
  progressBar.max = 100;
  JR.readerDocument
    .querySelector(".content-container")
    .appendChild(progressBar);

  // REMOVE WHEN SWITCHING TO CSS SCROLL ANIMATION FOR SCROLLBAR
  updateScrollbarMetrics();
  JR.readerDocument.defaultView.addEventListener(
    "scroll",
    scheduleProgressBarUpdate,
    false
  );
  JR.readerDocument.defaultView.addEventListener(
    "resize",
    updateScrollbarMetrics,
    false
  );
  // END STUFF TO REMOVE

  return progressBar;
}
