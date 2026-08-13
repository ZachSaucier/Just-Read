// Content scripts are classic scripts injected in order (see
// CONTENT_SCRIPT_FILES in background.js) into the same isolated world.
// Keep shared mutable state on this object — a file-local `let`/`const`
// is not visible to other files.

var JR = {
  jrDomain: "https://justread.link/",
  isPremium: false,
  jrSecret: undefined,
  jrOpenCount: undefined,
  hasBeenAskedForReview100: false,
  hasBeenAskedForReview1000: false,
  hasBeenAskedForReview10000: false,
  hasBeenNotifiedOfSummarizer: false,

  removeOrigContent: undefined,
  chromeStorage: undefined,
  pageSelectedContainer: undefined,

  useText: undefined,
  runOnLoad: undefined,
  userSelected: undefined,
  selected: undefined,

  simpleArticle: undefined,
  simpleArticleIframe: undefined,

  stylesheetObj: {},
  stylesheetVersion: 6.4, // THIS NUMBER MUST BE UPDATED FOR THE STYLESHEETS TO KNOW TO UPDATE

  datGUI: undefined,
  themeStylesheet: undefined,
  usedGUI: false,

  editorShortcutsEnabled: false,
  lastHighlightColor: "yellow",
  lastFontColor: "black",
  editBar: undefined,

  scrollSpeed: 0.5,
  nextMove: 0,
  pauseScrollBtn: undefined,
  scrollSpeedInput: undefined,
  lastTime: undefined,

  hideSegments: false,

  hasSavedLink: false,

  compactComments: undefined,
  comments: undefined,
  addCommentBtn: undefined,
  shareDropdown: undefined,
  undoBtn: undefined,
  summarizeBtn: undefined,

  titleSelector: undefined,
  authorSelector: undefined,
  dateSelector: undefined,
  contentSelector: undefined,
  headerImageSelector: undefined,
  selectorsToDelete: undefined,

  theme: undefined,
  styleElem: undefined,
};
