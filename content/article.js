const ARTICLE_JSONLD_TYPES =
  /NewsArticle|BlogPosting|ScholarlyArticle|TechArticle|Report|SocialMediaPosting|Article/i;
const UNLIKELY_META_RE =
  /comment|recirc|related-article|related-post|sidebar|cookie|newsletter|subscribe|modal|popup|most-read|most-popular|trending|recommended|share-tools|social-share|unauthorized/i;
const BYLINE_PREFIX_RE =
  /^(by|von|par|por|autor(?:e|in)?|author|written\s+by)\s*[:\-–—]?\s+/i;
const NAME_PARTICLES = /^(de|da|del|della|van|von|der|den|di|du|la|le|el)$/i;
const JUNK_AUTHOR_RE = /^(admin|webmaster|user|null|undefined|anonymous)$/i;
const DATE_CLASS_TOKENS = [
  "date",
  "published",
  "pubdate",
  "dateline",
  "timestamp",
];
const AUTHOR_CLASS_TOKENS = [
  "author",
  "byline",
  "byline-name",
  "writer",
  "contributor",
];

function unescapeHtmlEntities(str) {
  if (!str || str.indexOf("&") === -1) return str;
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (_, hex, num) =>
      String.fromCharCode(parseInt(hex || num, hex ? 16 : 10))
    );
}

function collapseWs(value) {
  return unescapeHtmlEntities(
    String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function wordCount(text) {
  return collapseWs(text).split(" ").filter(Boolean).length;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikeUrl(text) {
  return /^(https?:\/\/|www\.)/i.test(collapseWs(text));
}

function textSimilarity(a, b) {
  const tokensA = new Set(
    collapseWs(a)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  );
  const tokensB = new Set(
    collapseWs(b)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  );
  if (!tokensA.size || !tokensB.size) return 0;
  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection += 1;
  });
  return intersection / (tokensA.size + tokensB.size - intersection);
}

function articleRoot() {
  if (JR.pageSelectedContainer == null) JR.pageSelectedContainer = document.body;
  return JR.pageSelectedContainer;
}

function flagForRemoval(elem) {
  const root = articleRoot();
  if (elem && root && root.contains(elem) && elem !== root) {
    elem.dataset.simpleDelete = true;
  }
}

function elementTokenString(elem) {
  const className = typeof elem.className === "string" ? elem.className : "";
  return `${className} ${elem.id || ""}`.toLowerCase();
}

function hasClassToken(elem, names) {
  const raw = elementTokenString(elem);
  return names.some((name) =>
    new RegExp(`(?:^|[\\s_-])${escapeRegExp(name)}(?:$|[\\s_-])`).test(raw)
  );
}

function isUnlikelyMetaNode(elem) {
  let current = elem;
  for (let i = 0; i < 4 && current && current !== document.body; i++) {
    if (UNLIKELY_META_RE.test(elementTokenString(current))) return true;
    current = current.parentElement;
  }
  return !checkAgainstBlacklist(elem, 3);
}

function proximityPenalty(elem, heading) {
  if (!heading || !elem.getBoundingClientRect) return 0;
  const headingBox = heading.getBoundingClientRect();
  const elemBox = elem.getBoundingClientRect();
  if (!elemBox.width && !elemBox.height) return 25;
  const dy = elemBox.top - headingBox.top;
  if (dy > -250 && dy < 400) return Math.abs(dy) / 50;
  return 30 + Math.abs(dy) / 100;
}

function metaContent(selectors) {
  for (let i = 0; i < selectors.length; i++) {
    const elem = safeQuery(document.head, selectors[i]) ||
      safeQuery(document, selectors[i]);
    const content = collapseWs(elem && elem.getAttribute("content"));
    if (content) return content;
  }
  return "";
}

function jsonLdType(node) {
  const type = node && node["@type"];
  if (Array.isArray(type)) return type.join(" ");
  return type || "";
}

function jsonLdRank(node) {
  const type = jsonLdType(node);
  if (/NewsArticle|BlogPosting|ScholarlyArticle|TechArticle/.test(type)) return 4;
  if (/Article/.test(type) && !/ArticleSection/.test(type)) return 3;
  if (/WebPage|Report|SocialMediaPosting/.test(type)) return 2;
  if (node.headline || node.datePublished || node.author) return 1;
  return -1;
}

function flattenJsonLd(node, out) {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach((child) => flattenJsonLd(child, out));
    return out;
  }
  if (typeof node !== "object") return out;
  out.push(node);
  if (node["@graph"]) flattenJsonLd(node["@graph"], out);
  return out;
}

function parseJsonLdText(text) {
  const cleaned = String(text || "")
    .replace(/^\s*(\/\/\s*)?<!\[CDATA\[|\]\]>\s*$/g, "")
    .trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

function jsonLdAuthorName(author) {
  if (!author) return "";
  if (typeof author === "string") return collapseWs(author);
  if (Array.isArray(author)) {
    return author.map(jsonLdAuthorName).filter(Boolean).join(", ");
  }
  if (typeof author.name === "string") return collapseWs(author.name);
  if (Array.isArray(author.name)) {
    return author.name
      .filter((name) => typeof name === "string")
      .map(collapseWs)
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function pickJsonLdTitle(node, docTitle) {
  const name = typeof node.name === "string" ? collapseWs(node.name) : "";
  const headline =
    typeof node.headline === "string" ? collapseWs(node.headline) : "";
  if (name && headline && name !== headline) {
    const nameSim = textSimilarity(name, docTitle);
    const headlineSim = textSimilarity(headline, docTitle);
    if (headlineSim > nameSim && headlineSim >= 0.5) return headline;
    if (nameSim > headlineSim && nameSim >= 0.5) return name;
    return headline;
  }
  return headline || name;
}

function collectJsonLdArticle() {
  const scripts = safeQueryAll(document, 'script[type="application/ld+json"]');
  let best = null;
  let bestRank = -1;

  scripts.forEach((script) => {
    const parsed = parseJsonLdText(script.textContent);
    flattenJsonLd(parsed, []).forEach((node) => {
      const rank = jsonLdRank(node);
      if (rank < 0) return;
      if (
        !ARTICLE_JSONLD_TYPES.test(jsonLdType(node)) &&
        !node.headline &&
        !node.datePublished &&
        !node.author
      ) {
        return;
      }

      const candidate = {
        title: pickJsonLdTitle(node, document.title || ""),
        author: jsonLdAuthorName(node.author),
        datePublished:
          typeof node.datePublished === "string" ? node.datePublished : "",
        dateModified:
          typeof node.dateModified === "string" ? node.dateModified : "",
        rank,
      };
      const completeness =
        (candidate.title ? 1 : 0) +
        (candidate.author ? 1 : 0) +
        (candidate.datePublished ? 1 : 0);

      if (
        !best ||
        rank > bestRank ||
        (rank === bestRank &&
          completeness >
            (best.title ? 1 : 0) +
              (best.author ? 1 : 0) +
              (best.datePublished ? 1 : 0))
      ) {
        best = candidate;
        bestRank = rank;
      }
    });
  });

  return best || {};
}

function collectStructuredMeta() {
  const jsonld = collectJsonLdArticle();
  const ogTitle = metaContent([
    'meta[property="og:title"]',
    'meta[name="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="dc.title"]',
    'meta[name="DC.title"]',
    'meta[name="dcterms.title"]',
  ]);
  const metaAuthor = [
    metaContent([
      'meta[name="author"]',
      'meta[name="byl"]',
      'meta[name="dc.creator"]',
      'meta[name="DC.creator"]',
      'meta[name="dcterms.creator"]',
      'meta[property="article:author"]',
      'meta[name="article:author"]',
    ]),
  ].find((value) => value && !looksLikeUrl(value)) || "";
  const datePublished = jsonld.datePublished ||
    metaContent([
      'meta[property="article:published_time"]',
      'meta[name="article:published_time"]',
      'meta[property="og:published_time"]',
      'meta[name="date"]',
      'meta[name="dc.date"]',
      'meta[name="DC.date"]',
      'meta[name="dcterms.created"]',
      'meta[name="sailthru.date"]',
      'meta[name^="date"]',
    ]);
  const dateModified = jsonld.dateModified ||
    metaContent([
      'meta[property="article:modified_time"]',
      'meta[name="article:modified_time"]',
      'meta[property="og:updated_time"]',
    ]);

  return {
    title: jsonld.title || ogTitle,
    jsonldTitle: jsonld.title || "",
    ogTitle,
    author: jsonld.author || metaAuthor,
    datePublished,
    dateModified,
  };
}

function looksLikeMachineDate(text) {
  const value = collapseWs(text);
  return (
    /^\d{4}-\d{2}-\d{2}/.test(value) ||
    /^\d{4}\/\d{2}\/\d{2}/.test(value) ||
    /^\d{8}$/.test(value)
  );
}

function isCopyrightDate(text) {
  const value = collapseWs(text);
  return /©|\bcopyright\b/i.test(value) || /^\d{4}$/.test(value);
}

function stripLeadingOn(text) {
  return collapseWs(text).replace(/^\s*(?:published\s+)?on\s+/i, "");
}

function formatDateForDisplay(raw) {
  const text = stripLeadingOn(raw);
  if (!text) return "";

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const parsed = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3])
    );
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(text) || /^\d{4}\/\d{2}\/\d{2}/.test(text)) {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }

  return text;
}

function isValidDateText(text) {
  const value = collapseWs(text);
  if (!value || isCopyrightDate(value)) return false;
  if (wordCount(value) > 12) return false;
  if (value.length > 80) return false;
  return true;
}

function dateTextFromElement(elem) {
  const visible = collapseWs(elem.innerText || elem.textContent || "");
  const attrs = [
    elem.getAttribute("datetime"),
    elem.getAttribute("content"),
    elem.dateTime,
  ]
    .map(collapseWs)
    .filter(Boolean);

  if (
    visible &&
    !looksLikeMachineDate(visible) &&
    isValidDateText(visible)
  ) {
    return formatDateForDisplay(visible);
  }

  for (let i = 0; i < attrs.length; i++) {
    if (isValidDateText(attrs[i]) || looksLikeMachineDate(attrs[i])) {
      const formatted = formatDateForDisplay(attrs[i]);
      if (formatted) return formatted;
    }
  }

  if (visible && isValidDateText(visible)) {
    return formatDateForDisplay(visible);
  }
  return "";
}

function titleCaseAuthor(name) {
  if (!name || name !== name.toUpperCase() || !/[A-Z]/.test(name)) return name;
  return name
    .split(/\s+/)
    .map((word, i) =>
      word
        .split("-")
        .map((part) => {
          if (/^[A-Z]\.([A-Z]\.)*$/i.test(part)) return part.toUpperCase();
          if (i > 0 && NAME_PARTICLES.test(part)) return part.toLowerCase();
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-")
    )
    .join(" ");
}

function normalizeAuthor(raw) {
  let author = collapseWs(raw).replace(BYLINE_PREFIX_RE, "");
  if (!author || looksLikeUrl(author) || JUNK_AUTHOR_RE.test(author)) return "";
  if (author.length > 120 || wordCount(author) > 12) return "";
  return titleCaseAuthor(author);
}

function authorTextFromElement(elem) {
  const named = safeQueryAll(elem, '[itemprop="name"]')
    .map((node) =>
      collapseWs(node.getAttribute("content") || node.innerText || "")
    )
    .filter(Boolean);
  if (named.length) return normalizeAuthor(named.join(", "));

  const attr = collapseWs(elem.getAttribute("content"));
  if (attr) return normalizeAuthor(attr);

  const raw = elem.innerText || elem.textContent || "";
  return normalizeAuthor(raw.split(/\n+/)[0]);
}

function domainSelectorText(selector) {
  const elem = safeQuery(document, selector);
  if (!elem) return "";
  const text = collapseWs(
    elem.innerText || elem.getAttribute("content") || elem.textContent || ""
  );
  if (text) flagForRemoval(elem);
  return text;
}

function articleHeadings() {
  const root = articleRoot();
  const usable = (heading) => {
    const text = collapseWs(heading.innerText);
    return (
      text &&
      text.length >= 8 &&
      text.length < 300 &&
      checkAgainstBlacklist(heading, 3)
    );
  };
  let headings = safeQueryAll(root, "h1").filter(usable);
  if (!headings.length) headings = safeQueryAll(document.body, "h1").filter(usable);
  return headings;
}

function primaryHeading(structuredTitle) {
  const headings = articleHeadings();
  if (!headings.length) return null;
  if (structuredTitle) {
    let best = null;
    let bestSim = 0;
    headings.forEach((heading) => {
      const sim = textSimilarity(heading.innerText, structuredTitle);
      if (sim > bestSim) {
        bestSim = sim;
        best = heading;
      }
    });
    if (best && bestSim >= 0.5) return best;
  }
  return headings[0];
}

function stripSiteNameSuffix(title) {
  const siteName = metaContent([
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
  ]);
  const host = (location.hostname || "").replace(/^www\./, "");
  let result = title;
  [siteName, host].filter(Boolean).forEach((suffix) => {
    const stripped = result.replace(
      new RegExp(
        `\\s*[\\|\\-–—:/»]\\s*${escapeRegExp(suffix)}\\s*$`,
        "i"
      ),
      ""
    );
    if (stripped) result = stripped;
  });
  return collapseWs(result) || title;
}

function cleanDocumentTitle(origTitle) {
  const orig = collapseWs(origTitle);
  if (!orig) return "";
  let current = orig;

  if (/ [\|\-–—\\/>»] /.test(current)) {
    const withoutTail = orig.replace(/(.*)[\|\-–—\\/>»] .*/g, "$1");
    current =
      wordCount(withoutTail) < 3
        ? orig.replace(/[^|\-–—\\/>»]*[\|\-–—\\/>»](.*)/g, "$1")
        : withoutTail;
  } else if (current.includes(": ")) {
    const siteName = metaContent(['meta[property="og:site_name"]']);
    const left = orig.slice(0, orig.indexOf(":")).trim();
    const right = orig.slice(orig.indexOf(":") + 1).trim();
    if (
      siteName &&
      (textSimilarity(left, siteName) > 0.7 ||
        textSimilarity(right, siteName) > 0.7)
    ) {
      current =
        textSimilarity(left, siteName) > textSimilarity(right, siteName)
          ? right
          : left;
    }
  }

  current = stripSiteNameSuffix(collapseWs(current));
  if (wordCount(current) <= 3 && wordCount(orig) - wordCount(current) > 1) {
    return stripSiteNameSuffix(orig);
  }
  return current || orig;
}

function pickTitle(structured) {
  const fromSelector = domainSelectorText(JR.titleSelector);
  if (fromSelector) return fromSelector;

  const structuredTitle = structured.title || "";
  const heading = primaryHeading(structuredTitle);
  const headingText = heading ? collapseWs(heading.innerText) : "";

  if (headingText && structuredTitle) {
    if (textSimilarity(headingText, structuredTitle) >= 0.5) {
      flagForRemoval(heading);
      return headingText;
    }
  }

  if (structured.jsonldTitle) return structured.jsonldTitle;
  if (structured.ogTitle) return structured.ogTitle;
  if (headingText) {
    flagForRemoval(heading);
    return headingText;
  }

  const docTitle = document.head.querySelector("title");
  if (docTitle) return cleanDocumentTitle(docTitle.innerText);
  return "";
}

function collectScoped(selector) {
  const root = articleRoot();
  const inRoot = safeQueryAll(root, selector);
  if (root === document.body) return inRoot;
  const extra = safeQueryAll(document.body, selector).filter(
    (elem) => !root.contains(elem)
  );
  return inRoot.concat(extra);
}

function closestToHeading(elems, heading, limit) {
  if (elems.length <= limit) return elems;
  if (!heading) return elems.slice(0, limit);
  return elems
    .slice()
    .sort(
      (a, b) => proximityPenalty(a, heading) - proximityPenalty(b, heading)
    )
    .slice(0, limit);
}

function collectByTokens(tokens, heading) {
  const seen = new Set();
  const results = [];
  tokens.forEach((token) => {
    [`[class*="${token}"]`, `[id*="${token}"]`].forEach((selector) => {
      collectScoped(selector).forEach((elem) => {
        if (seen.has(elem) || !hasClassToken(elem, tokens)) return;
        seen.add(elem);
        results.push(elem);
      });
    });
  });
  return closestToHeading(results, heading, 40);
}

function pickAuthor(structured, heading) {
  const fromSelector = normalizeAuthor(domainSelectorText(JR.authorSelector));
  if (fromSelector) return fromSelector;

  const fromStructured = normalizeAuthor(structured.author);
  if (fromStructured) return fromStructured;

  const candidates = [];
  const push = (elem, bonus) => {
    if (!elem || isUnlikelyMetaNode(elem)) return;
    const text = authorTextFromElement(elem);
    if (!text) return;
    candidates.push({
      elem,
      text,
      score:
        bonus +
        (articleRoot().contains(elem) ? 40 : 0) -
        proximityPenalty(elem, heading),
    });
  };

  closestToHeading(collectScoped('[itemprop="author"]'), heading, 20).forEach(
    (elem) => push(elem, 50)
  );
  closestToHeading(collectScoped('[rel~="author"]'), heading, 20).forEach(
    (elem) => push(elem, 45)
  );
  collectByTokens(AUTHOR_CLASS_TOKENS, heading).forEach((elem) =>
    push(elem, 20)
  );

  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length || candidates[0].score < 0) return "";

  const top = candidates[0];
  const names = [top.text];
  const seen = new Set([top.text.toLowerCase()]);
  flagForRemoval(top.elem);

  if (heading && proximityPenalty(top.elem, heading) <= 6) {
    candidates.slice(1).forEach((candidate) => {
      if (names.length >= 4) return;
      if (top.score - candidate.score > 12) return;
      if (proximityPenalty(candidate.elem, heading) > 6) return;
      const key = candidate.text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      names.push(candidate.text);
      flagForRemoval(candidate.elem);
    });
  }

  return names.join(", ");
}

function pickDate(structured, heading) {
  const fromSelector = domainSelectorText(JR.dateSelector);
  if (fromSelector) {
    const formatted = formatDateForDisplay(fromSelector);
    if (formatted) return formatted;
  }

  if (structured.datePublished) {
    const formatted = formatDateForDisplay(structured.datePublished);
    if (formatted) return formatted;
  }

  const candidates = [];
  const push = (elem, bonus) => {
    if (!elem || isUnlikelyMetaNode(elem)) return;
    const text = dateTextFromElement(elem);
    if (!text) return;
    const itemprop = (elem.getAttribute("itemprop") || "").toLowerCase();
    candidates.push({
      elem,
      text,
      score:
        bonus +
        (articleRoot().contains(elem) ? 40 : 0) +
        (itemprop === "datepublished" ? 35 : 0) +
        (itemprop === "datemodified" ? 8 : 0) +
        (elem.tagName === "TIME" && elem.getAttribute("datetime") ? 25 : 0) -
        proximityPenalty(elem, heading),
    });
  };

  closestToHeading(
    collectScoped('[itemprop="datePublished"]'),
    heading,
    15
  ).forEach((elem) => push(elem, 45));
  closestToHeading(
    collectScoped('[itemprop="dateCreated"]'),
    heading,
    10
  ).forEach((elem) => push(elem, 35));
  closestToHeading(collectScoped("time"), heading, 25).forEach((elem) =>
    push(elem, 30)
  );
  closestToHeading(
    collectScoped('[itemprop="dateModified"]'),
    heading,
    10
  ).forEach((elem) => push(elem, 12));
  collectByTokens(DATE_CLASS_TOKENS, heading).forEach((elem) =>
    push(elem, 18)
  );

  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length && candidates[0].score >= 0) {
    flagForRemoval(candidates[0].elem);
    return candidates[0].text;
  }

  if (structured.dateModified) {
    return formatDateForDisplay(structured.dateModified);
  }
  return "";
}

function extractArticleMeta() {
  if (JR.articleMeta) return JR.articleMeta;

  const structured = JR.structuredMeta || collectStructuredMeta();
  const heading = primaryHeading(structured.title);
  const meta = {
    title: pickTitle(structured),
    author: pickAuthor(structured, heading),
    date: pickDate(structured, heading),
  };

  JR.articleMeta = meta;
  return meta;
}

function getArticleDate() {
  return extractArticleMeta().date || t("unknownDate");
}

function getArticleTitle() {
  return extractArticleMeta().title || t("unknownTitle");
}

function getArticleAuthor() {
  return extractArticleMeta().author || t("unknownAuthor");
}

function getArticleContainer() {
  let selectedContainer;

  if (JR.contentSelector && safeQuery(document, JR.contentSelector)) {
    selectedContainer = safeQuery(document, JR.contentSelector);
  } else if (safeQuery(document.head, "meta[name='articleBody']")) {
    selectedContainer = document.createElement("div");
    selectedContainer.innerHTML = DOMPurify.sanitize(
      safeQuery(document.head, "meta[name='articleBody']").getAttribute(
        "content"
      )
    );
  } else {
    const pageWords = document.body.innerText.match(/\S+/g);
    const numWordsOnPage = pageWords ? pageWords.length : 0;
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
      numWordsOnPage &&
      wordCountSelected / numWordsOnPage < 0.4 &&
      selectedContainer != document.body &&
      selectedContainer.parentElement.innerText
    ) {
      selectedContainer = selectedContainer.parentElement;
      const selectedWords = selectedContainer.innerText.match(/\S+/g);
      wordCountSelected = selectedWords ? selectedWords.length : 0;
    }

    // Make sure a single p tag is not selected
    if (selectedContainer.tagName === "P") {
      selectedContainer = selectedContainer.parentElement;
    }
  }

  return selectedContainer;
}
