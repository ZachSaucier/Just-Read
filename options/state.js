var jrDomain = "https://justread.link/";

var changed = false,
  stylesheetObj = {},
  defaultLiItem,
  defaultStylesheet = "default-styles.css",
  darkStylesheet = "dark-styles.css",
  currTheme,
  hasAccount = false,
  jrSecret,
  isPremium = false,
  jrLastChecked;

var editor;
var stylesheetListItems;

