// Content scripts are classic scripts injected in order (see
// CONTENT_SCRIPT_FILES in background.js) into the same isolated world.
// Keep shared mutable state on this object — a file-local `let`/`const`
// is not visible to other files.
//
// Prefs live on JR.settings (see shared/settings.js). This object is
// session/DOM state for the open reader view.

var JR = {
  jrDomain: "https://justread.link/",
  isPremium: false,
  jrSecret: undefined,
  jrLastChecked: undefined,
  jrOpenCount: undefined,
  hasBeenAskedForReview100: false,
  hasBeenAskedForReview1000: false,
  hasBeenAskedForReview10000: false,
  hasBeenNotifiedOfSummarizer: false,

  settings: {},
  pageSelectedContainer: undefined,

  useText: undefined,
  runOnLoad: undefined,
  userSelected: undefined,
  selected: undefined,

  readerIframe: undefined,
  readerDocument: undefined,

  savedComments: undefined,
  savedCompactComments: undefined,

  stylesheetObj: {},

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

  hasSavedLink: false,
  isHydratedSharedPage: false,
  sharedPageUrl: undefined,
  sharedOrigURL: undefined,

  compactComments: undefined,
  comments: undefined,
  addCommentBtn: undefined,
  shareDropdown: undefined,
  undoBtn: undefined,
  summarizeBtn: undefined,

  structuredMeta: undefined,
  articleMeta: undefined,

  titleSelector: undefined,
  authorSelector: undefined,
  dateSelector: undefined,
  contentSelector: undefined,
  headerImageSelector: undefined,
  selectorsToDelete: undefined,

  theme: undefined,
  styleElem: undefined,
};
