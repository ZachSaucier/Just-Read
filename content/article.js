function checkElemForDate(elem, attrList, flagForRemoval) {
  let myDate = false;

  if (elem && checkAgainstBlacklist(elem, 3)) {
    attrList.some((attr) => {
      if (
        elem[attr] &&
        elem[attr] != "" && //  Make sure it's not empty
        elem[attr].split(" ").length < 10
      ) {
        // Make sure the date isn't absurdly long
        myDate = elem[attr];

        if (flagForRemoval) {
          elem.dataset.simpleDelete = true; // Flag it for removal later
        }

        return true;
      }
    });
  }

  return myDate;
}

function getJSONSchema(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON schema");
    return null;
  }
}

function getArticleDate() {
  // Make sure that the pageSelectedContainer isn't empty
  if (JR.pageSelectedContainer == null) JR.pageSelectedContainer = document.body;

  // Check to see if there's a date class
  let date = false;

  if (JR.dateSelector && document.querySelector(JR.dateSelector)) {
    const elem = document.querySelector(JR.dateSelector);
    date = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  }

  // Check schema first
  let jsonld;
  if (
    !date &&
    JR.pageSelectedContainer.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      JR.pageSelectedContainer.querySelector('script[type="application/ld+json"]')
        .innerText
    );
  } else if (
    !date &&
    document.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      document.querySelector('script[type="application/ld+json"]').innerText
    );
  }

  if (!date && jsonld) {
    if (jsonld.dateModified) {
      date = jsonld.dateModified;
    } else if (jsonld.datePublished) {
      date = jsonld.datePublished;
    }
  }

  let toCheck = [];
  if (!date) {
    toCheck = [
      [
        JR.pageSelectedContainer.querySelector('[itemprop="dateModified"]'),
        ["innerText"],
        true,
      ],
      [
        JR.pageSelectedContainer.querySelector('[itemprop="datePublished"]'),
        ["innerText"],
        true,
      ],
      [
        JR.pageSelectedContainer.querySelector('[class^="date"]'),
        ["innerText"],
        true,
      ],
      [
        JR.pageSelectedContainer.querySelector('[class*="-date"]'),
        ["innerText"],
        true,
      ],
      [
        JR.pageSelectedContainer.querySelector('[class*="_date"]'),
        ["innerText"],
        true,
      ],
      [
        document.body.querySelector('[itemprop="dateModified"]'),
        ["innerText"],
        false,
      ],
      [
        document.body.querySelector('[itemprop="datePublished"]'),
        ["innerText"],
        false,
      ],
      [document.body.querySelector('[class^="date"]'), ["innerText"], false],
      [document.body.querySelector('[class*="-date"]'), ["innerText"], false],
      [document.body.querySelector('[class*="_date"]'), ["innerText"], false],
      [document.head.querySelector('meta[name^="date"]'), ["content"], false],
      [document.head.querySelector('meta[name*="-date"]'), ["content"], false],
      [
        JR.pageSelectedContainer.querySelector("time"),
        ["datetime", "innerText"],
        true,
      ],
      [document.body.querySelector("time"), ["datetime", "innerText"], false],
      [
        JR.pageSelectedContainer.querySelector('[class *= "time"]'),
        ["datetime", "innerText"],
        true,
      ],
      [
        document.body.querySelector('[class *= "time"]'),
        ["datetime", "innerText"],
        false,
      ],
    ];
  }

  toCheck.some((checkObj) => {
    if (!date && checkObj[0]) {
      date = checkElemForDate(checkObj[0], checkObj[1], checkObj[2]);
      if (date) return true;
    }
  });

  if (date) {
    return date
      .replace(/on\s/gi, "")
      .replace(/(?:\r\n|\r|\n)/gi, "&nbsp;")
      .replace(/[<]br[^>]*[>]/gi, "&nbsp;"); // Replace <br>, \n, and "on"
  }

  return "Unknown date";
}

function getArticleTitle() {
  // Get the page's title
  let title;

  if (JR.titleSelector && document.querySelector(JR.titleSelector)) {
    const elem = document.querySelector(JR.titleSelector);
    title = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  } else if (document.head.querySelector("title")) {
    title = document.head.querySelector("title").innerText;

    // Get the part before the first — if it exists
    if (title.indexOf(" — ") > 0) {
      return title.substr(0, title.indexOf(" — "));
    }

    // Get the part before the first – if it exists
    if (title.indexOf(" – ") > 0) {
      return title.substr(0, title.indexOf(" – "));
    }

    // Get the part before the first - if it exists DIFFERENT THAN ABOVE CHARACTER
    if (title.indexOf(" - ") > 0) {
      return title.substr(0, title.indexOf(" - "));
    }

    // Get the part before the first | if it exists
    if (title.indexOf(" | ") > 0) {
      return title.substr(0, title.indexOf(" | "));
    }

    // Get the part before the first : if it exists
    if (title.indexOf(" : ") > 0) {
      return title.substr(0, title.indexOf(" : "));
    }
  } else {
    title = "Unknown title";
  }

  return title;
}

function getArticleAuthor() {
  // Make sure that the pageSelectedContainer isn't empty
  if (JR.pageSelectedContainer == null) JR.pageSelectedContainer = document.body;

  let author = null;

  let elem;
  if (JR.authorSelector && document.querySelector(JR.authorSelector)) {
    elem = document.querySelector(JR.authorSelector);
    author = elem.innerText;
    elem.dataset.simpleDelete = true; // Flag it for removal later
  }

  // Check schema first
  let jsonld;
  if (
    JR.pageSelectedContainer.querySelector('script[type="application/ld+json"]')
  ) {
    jsonld = getJSONSchema(
      JR.pageSelectedContainer.querySelector('script[type="application/ld+json"]')
        .innerText
    );
  } else if (document.querySelector('script[type="application/ld+json"]')) {
    jsonld = getJSONSchema(
      document.querySelector('script[type="application/ld+json"]').innerText
    );
  }

  if (author === null && jsonld) {
    if (jsonld.author) {
      if (typeof jsonld.author === "string") {
        author = jsonld.author;
      } else if (typeof jsonld.author.name === "string") {
        author = jsonld.author.name;
      }
    }
  }

  // Check to see if there's an author itemprop in the article
  elem = JR.pageSelectedContainer.querySelector('[itemprop="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  // Check to see if there's an author itemprop in the page
  elem = document.body.querySelector('[itemprop="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      author = elem.innerText;
    }
  }

  // Check to see if there's an author rel in the article
  elem = JR.pageSelectedContainer.querySelector('[rel*="author"]');
  if (author === null && elem) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  // Check to see if there's an author class
  elem = JR.pageSelectedContainer.querySelector('[class*="author"]');
  if (author === null && elem && checkAgainstBlacklist(elem, 3)) {
    if (
      elem.innerText.split(/\s+/).length < 5 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      elem.dataset.simpleDelete = true; // Flag it for removal later
      author = elem.innerText;
    }
  }

  elem = document.head.querySelector('meta[name*="author"]');
  // Check to see if there is an author available in the meta, if so get it
  if (author === null && elem) author = elem.getAttribute("content");

  // Check to see if there's an author rel in the body
  elem = document.body.querySelectorAll('[rel*="author"]');
  elem.forEach((e) => {
    if (author === null && e) {
      if (
        e.innerText.split(/\s+/).length < 5 &&
        e.innerText.replace(/\s/g, "") !== ""
      ) {
        author = e.innerText;
      }
    }
  });

  elem = document.body.querySelector('[class*="author"]');
  if (author === null && elem && checkAgainstBlacklist(elem, 3)) {
    if (
      elem.innerText.split(/\s+/).length < 6 &&
      elem.innerText.replace(/\s/g, "") !== ""
    ) {
      author = elem.innerText;
    }
  }

  if (author !== null && author) {
    // If it's all caps, try to properly capitalize it
    if (author === author.toUpperCase()) {
      const words = author.split(" "),
        wordsLength = words.length;
      for (let i = 0; i < wordsLength; i++) {
        if (words[i].length < 3 && i != 0 && i != wordsLength)
          words[i] =
            words[
              i
            ].toLowerCase(); // Assume it's something like "de", "da", "van" etc.
        else
          words[i] =
            words[i].charAt(0).toUpperCase() + words[i].substr(1).toLowerCase();
      }
      author = words.join(" ");
    }
    return author.replace(/by\s/gi, ""); // Replace "by"
  }

  return "Unknown author";
}

function getArticleContainer() {
  let selectedContainer;

  if (JR.contentSelector && document.querySelector(JR.contentSelector)) {
    selectedContainer = document.querySelector(JR.contentSelector);
  } else if (document.head.querySelector("meta[name='articleBody'")) {
    selectedContainer = document.createElement("div");
    selectedContainer.innerHTML = DOMPurify.sanitize(
      document.head
        .querySelector("meta[name='articleBody'")
        .getAttribute("content")
    );
  } else {
    const numWordsOnPage = document.body.innerText.match(/\S+/g).length;
    let ps = document.body.querySelectorAll("p");

    // Find the paragraphs with the most words in it
    let pWithMostWords = document.body,
      highestWordCount = 0;

    if (ps.length === 0) {
      ps = document.body.querySelectorAll("div");
    }

    ps.forEach((p) => {
      if (
        checkAgainstBlacklist(p, 3) && // Make sure it's not in our blacklist
        p.offsetHeight !== 0
      ) {
        //  Make sure it's visible on the regular page
        const myInnerText = p.innerText.match(/\S+/g);
        if (myInnerText) {
          const wordCount = myInnerText.length;
          if (wordCount > highestWordCount) {
            highestWordCount = wordCount;
            pWithMostWords = p;
          }
        }
      }

      // Remove elements in JR that were hidden on the original page
      if (p.offsetHeight === 0) {
        p.dataset.simpleDelete = true;
      }
    });

    // Keep selecting more generally until over 2/5th of the words on the page have been selected
    selectedContainer = pWithMostWords;
    let wordCountSelected = highestWordCount;

    while (
      wordCountSelected / numWordsOnPage < 0.4 &&
      selectedContainer != document.body &&
      selectedContainer.parentElement.innerText
    ) {
      selectedContainer = selectedContainer.parentElement;
      wordCountSelected = selectedContainer.innerText.match(/\S+/g).length;
    }

    // Make sure a single p tag is not selected
    if (selectedContainer.tagName === "P") {
      selectedContainer = selectedContainer.parentElement;
    }
  }

  return selectedContainer;
}
