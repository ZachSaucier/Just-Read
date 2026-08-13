let timer = null;
function scheduleSearch() {
  if (timer) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(doSearch, 100);
}

function cancelSearch() {
  // Remove existing highlights
  const range = rangy.createRange();
  const searchScopeRange = rangy.createRange();
  searchScopeRange.selectNodeContents(
    JR.simpleArticleIframe.querySelector(".content-container")
  );

  range.selectNodeContents(
    JR.simpleArticleIframe.querySelector(".content-container")
  );
  searchResultApplier.undoToRange(range);
}

function doSearch() {
  if (find.classList.contains("active")) {
    // Remove existing highlights
    const range = rangy.createRange();
    const searchScopeRange = rangy.createRange();
    searchScopeRange.selectNodeContents(
      JR.simpleArticleIframe.querySelector(".content-container")
    );

    const options = {
      caseSensitive: false,
      wholeWordsOnly: false,
      withinRange: searchScopeRange,
      direction: "forward", // This is redundant because "forward" is the default
    };

    range.selectNodeContents(
      JR.simpleArticleIframe.querySelector(".content-container")
    );
    searchResultApplier.undoToRange(range);

    // Create search term
    const searchTerm = findInput.value;

    if (searchTerm !== "") {
      // Iterate over matches
      while (range.findText(searchTerm, options)) {
        // range now encompasses the first text match
        searchResultApplier.applyToRange(range);

        // Collapse the range to the position immediately after the match
        range.collapse(false);
      }

      findCount.innerText =
        JR.simpleArticleIframe.querySelectorAll(".simple-found").length;
      findCount.classList.add("active");

      // Jump to the first found instance
      if (JR.simpleArticleIframe.querySelector(".simple-found"))
        JR.simpleArticleIframe.querySelector(".simple-found").scrollIntoView();
    } else {
      findCount.classList.remove("active");
    }

    timer = null;
  }
}
