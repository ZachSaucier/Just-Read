Just Read
=========

Just Read makes it easy to view web articles in a more readable, attractive, and custom format - like a read mode, but better. It removes the distractions like ads, modals, and navigation from vision, letting the user just read the content. You can also get it to summarize the article by connecting an OpenAI API key (for more detail, [see here](https://justread.link/summarizer)).

Learn more about Just Read by [watching this video](https://www.youtube.com/watch?v=mKMUXEg873Q).

Premium features can be enabled by [purchasing Just Read Premium](https://justread.link/#getJustRead).

**Please note** that this extension is meant to format **article-type pages only**. It is not built to reformat other types of websites and is liable to not perform as one might expect.

___

### Installation:

- [Chrome / Brave / Opera / Edge](https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/just-read-ext/)
- [Edge](https://microsoftedge.microsoft.com/addons/detail/just-read/knjifalgaonnogbohfflloocfcebopgn)

You can even use Just Read on your smart phone through mobile browsers that support extensions such as [Dolphin](https://dolphin.com/) (iOS or Android), [Kiwi](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en_US) (Android), or [Yandex](https://browser.yandex.com/) (iOS or Android). For more information, see [the mobile installation instructions](https://github.com/ZachSaucier/Just-Read/#on-a-mobile-device). **Note that some of Just Read's features may not work on mobile devices.**

___
### The story behind Just Read

Hi, I'm Zach. I made Just Read because I was tired of terribly hard to read web articles, especially news sites. Before I made JR, I would manually use Chrome's developer tools to make a page more readable. Then at the [UGA Hacks](https://ugahacks.herokuapp.com/) Fall 2015 hackathon, I decided to make a reader mode for Chrome and ended up with the first version of Just Read after 16 hours of work. After sharing it on Chrome's web store, others seemed to like it as well, and I've been working on it in my free time ever since.

___

### Privacy statement

Just Read collects zero data from users by default. If you sign up for an account with Just Read, only your email address is stored. Just Read sends analytics to no one else. Any data that Just Read stores is safely secured and private.

___

### End-user license agreement (EULA)

By using Just Read, you are agreeing to [Just Read's EULA](https://github.com/ZachSaucier/Just-Read/blob/master/docs/EULA.md).

___

## FAQ

> **Note:** Any time you change something in Just Read's options page, you must restart any Just Read instances for the change to work.

### Using Just Read features
<details id="start_JR" open>
  <summary>How can I start Just Read?</summary>

  ### On a desktop or laptop

Start Just Read by using Just Read's auto-selection or user-selection mode.

> **Note**: Keyboard shortcuts may have to be enabled for them to work correctly. To do this, go to `chrome://extensions/shortcuts` (`about:addons`, the gear icon -> "Manage Extension Shortcuts" in Firefox) and you can add/change shortcuts there.

#### Auto-selection

You can start using Just Read's built in auto-selection selection in three ways:

1. Click the Just Read extension button.
![extension button](https://i.imgur.com/aCOIuVV.png)

2. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>L</kbd>.

3. Right click the current page and choose the "View this page using Just Read" option.

4. Right click a link and select "View the linked page using Just Read" (it will open it in a new tab). This is also called "link mode".

#### User selection mode

You can select exactly the text you want to read if the built in method doesn't select what you want. If you want to use a visual selector, you can start selection mode in two ways:

5. Right click the Just Read extension button, click "Select content to read", and then click the part of the page highlighted that you want to read.

6. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd> then click the part of the page highlighted that you want to read.

### On a mobile device

You must first install a mobile browser that supports extensions such as [Firefox](https://www.mozilla.org/en-US/firefox/mobile/) (iOS or Android), [Dolphin](https://dolphin.com/) (iOS or Android), [Kiwi](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en_US) (Android), or [Yandex](https://browser.yandex.com/) (iOS or Android). Then install Just Read to that browser by visiting Just Read's [Chrome store page](https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod/) (since currently most major mobile browsers are webkit based).

Once you're on an article that you want to read with Just Read installed on that browser, you need to navigate to their extensions section to run Just Read. In most browsers you need to click the three dots to see this section. Once there, simply click on Just Read.

**Note that some of Just Read's features are likely to not work properly on mobile devices due to a lack of features on those mobile browsers.**

</details>

<details id="share">
  <summary>How can I share my Just Read version of a page with someone?</summary>

> **Note that this is a Premium-only feature.**

You can share a page in Just Read's format by clicking [the share icon](https://i.imgur.com/4VospZC.png). This will show a [justread.link](https://justread.link) URL which will point to your Just Read version of the article. This may also open up the [justread.link](https://justread.link) URL in a new tab and close the current page depending on your settings under "Options" -> "Sharing preferences".

Note that the [justread.link](https://justread.link) version of a page *cannot be edited*. If you need to edit it at that point, you must make your edits on the original Just Read version of the page and then re-share the page (which will create an entirely new address).


</details>

<details id="share">
  <summary>How can I get the summary button working?</summary>

Please see [this post](https://justread.link/summarizer) for more info.

</details>

<details id="autorun">
  <summary>How can I auto-run Just Read on specific websites?</summary>

You can opt to auto-run Just Read on certain websites by entering a part of the URL (usually the domain is a good choice) or a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) (regex) into the "Auto-run domain list" found on the extension's Options page (for more info as to what formats work, see [this post](https://github.com/ZachSaucier/Just-Read/issues/15#issuecomment-262255204)). Just Read will then check each new site's URL to see if it matches a string or expression in the user-inputted list. If it does, it will start Just Read when the page loads.

You can also enable "Always add current site to Just Read's autorun list when Just Read is started on a page" under "Options" -> "Additional preferences" if you want *every* site that you start Just Read to be added to the auto-run list. For more information on how this works, see [this post](https://github.com/ZachSaucier/Just-Read/pull/166#issuecomment-404371640).


</details>

<details id="all_computers">
  <summary>How can I get Just Read on all of my computers?</summary>

When you log into a browser as the primary user <strong>and allow syncing</strong>, the browser automatically installs all extensions that you've installed to your account. This should include Just Read. Just Read automatically syncs your themes and preferences across all of your devices using this functionality, so you don't need to do anything special to get it working the same way on all of your devices. Note that currently some mobile browsers do not support web extensions, so Just Read cannot be installed on these browsers.

For more information on how to get Just Read to work on your mobile devices, see [the mobile installation instructions](https://github.com/ZachSaucier/Just-Read/#on-a-mobile-device). **Note that some of Just Read's features may not work on mobile devices.**


</details>

<details id="pin">
  <summary>I don't see the Just Read icon. How can I make the icon always visible?</summary>

A recent Chrome update hides extension icons inside inside of a drop down. To open the drop down, click the puzzle piece icon in the top right of Chrome. To make Just Read's icon always show, click the pin icon next to Just Read.

If you don't see Just Read in the drop down list, make sure that <a href="https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod/">it is installed</a>.


</details>

<details id="previous_shares">
  <summary>How can I view and delete pages that I have shared previously?</summary>

> **Note that this is a Premium-only feature.**

You can view and delete pages that you shared previously by going to your Just Read dashboard: https://justread.link/dashboard. If you are signed into a Just Read account and that account has Premium, you will see a table of all of your entries.

Note that you can click any column heading to sort the entries by that column's values.


</details>

<details id="autosave">
  <summary>How can I have Just Read auto-save my changes?</summary>

Just Read has an option under Options -> "Backup the most recent Just Read page (in case of accidental closure)." that does this. If you make any changes on a page, if you are on that same page it will load the old version if enabled.


</details>

<details id="link_to">
  <summary>How can I link to a specific part of a shared article?</summary>

> **Note that this is a Premium-only feature.**

If you make any highlights, color change, or other edits to a text selection (a premium feature), Just Read will add a unique ID to that selection. You can then share that page and then look up that ID to get a link to that specific element on the shared page. For more information, [look at this post](https://stackoverflow.com/a/2835151/2065702).


</details>

<details id="kindle">
  <summary>How can I send the article to my Kindle?</summary>

> **Note that this is a Premium-only feature.**

In order to send the article content from Just Read to your Kindle, you must first [install the free Send to Kindle extension](https://chrome.google.com/webstore/detail/send-to-kindle-for-google/cgdjpilhipecahhcilnafpblkieebhea). Then you can use it on any shared Just Read page (or any other web page).


</details>

<details id="drive">
  <summary>How can I send the article to Google Drive?</summary>

Currently it is only possible to send files to Google Drive in PDF form. The easiest way to do so in Chrome is to "print" the page (either using Chrome's built-in print ability or by clicking Just Read's print icon) and then change the "Destination" to "Save to Google Drive". In Firefox, you need to save it to your computer as a PDF and then manually upload it to Google Drive.


</details>

<details id="autoscroll">
  <summary>How can I get Just Read to auto-scroll the article?</summary>

> **Note that this is a Premium-only feature.**

You can do this by going to "Options" -> "Additional features" and clicking the "Use JR's auto-scroll functionality" option. This will automatically scroll the article once you open it in Just Read. It also creates a "Pause scroll" button at the bottom right of Just Read. You can customize the speed of the auto-scroll by editing the box below this option.


</details>

<details id="context_menu">
  <summary>How can I remove Just Read's entries from the right-click context menu?</summary>

Under "Options" -> "Context menu entries", you can enable or disable the context menu entries that Just Read creates.

- "Don't reformat pre tags" makes it so that Just Read doesn't turn any `<pre>` tags into paragraphs but retains their original formatting.
- "Enable page context menu entry" allows Just Read to show a menu entry when you right click a page.
- "Enable link context menu entry" allows Just Read to show a menu entry when you right click a link.


</details>

<details id="unsubscribe">
  <summary>How can I unsubscribe from Just Read Premium?</summary>

Go to <a href="https://justread.link/dashboard">your Just Read dashboard</a>. If you're a Premium user, you should see a "go here" link at the top of the page. Click it to manage your purchase.


</details>

___

### Editing Just Read's content
<details id="deletion_mode">
  <summary>How can I delete parts of the page once Just Read has started?</summary>

Once the text has been selected and the article is open in the Just Read format, users can delete elements by going into deletion mode using the keyboard shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>;</kbd> or by clicking on [the deletion mode icon](https://i.imgur.com/QD5G2j4.png).

Once in deletion mode, users can click on elements that they don't want to be included in their page and they will be deleted. To exit this mode, users need to press <kbd>ESC</kbd> or click the deletion mode icon. These actions can be undone by clicking the undo icon that appears or by using the shortcut <kbd>Ctrl</kbd> + <kbd>Z</kbd>.

If you have Premium, you can also delete anything that you highlight using <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>d</kbd> or clicking the trash can icon on the toolbar that shows up.


</details>

<details id="edit_meta">
  <summary>How can I edit the article's date, author, and title once in Just Read?</summary>

If you hover over each of these, a [pencil icon](https://i.imgur.com/PzFZzVh.png) will appear. Click that to edit the text that you want.

These actions can be undone by clicking the undo icon that appears or by using the shortcut <kbd>Ctrl</kbd> + <kbd>Z</kbd>.


</details>

<details id="orig_url">
  <summary>How can I show the original page's URL in Just Read?</summary>

To enable this option, go to Just Read's "Options" pages and enable "Always add the original URL."


</details>

<details id="time_estimate">
  <summary>How can I show the article's estimated time to read?</summary>

To enable this option, go to Just Read's "Options" pages and enable "Always add the estimated time to read the article."


</details>

<details id="annotations_comments">
  <summary>How can I add annotations and comments?</summary>

> **Note that this is a Premium-only feature.**

If you select any text in Just Read, a toolbar [like this](https://i.imgur.com/goBVron.png) will appear. This toolbar lets you change the styling of the selected text as per each button's instructions.

You can add comments by clicking the [add comment button](https://i.imgur.com/CHvhmrn.png) then filling in the input box. It will automatically edit the layout of the page to allow the comments to fit and add a datetime of posting once the comment has been added.


</details>

<details id="selectors">
  <summary>Can I customize which selectors Just Read uses for selecting the date, author, title, header image, and content?</summary>

> **Note that this is a Premium-only feature.**

Yes you can! With Premium you can go to "Options" -> "Domain-specific selectors" and customize it to select exactly the content the content you want automatically. The only required part is the `domainPattern` in order for Just Read to know when to use those selectors over the automatic ones. You should only include the others that you need.

The full list of options in the domain-specific selectors list is as follow:

- `domainPattern` - A regex pattern to match the correct URL(s).
- `titleSelector` - A query selector to find the article's title.
- `authorSelector` - A query selector to find the author's name.
- `dateSelector` - A query selector to find the article's date.
- `contentSelector` - A query selector to find the article's content.
- `headerImageSelector` - A query selector to find the article's header image (if it's outside of the content).
- `selectorsToDelete` - An array of query selectors (searched using `querySelectorAll`) to find elements inside of the article to delete.

Note that the `domainPattern` is checked using the same regex technique [as the auto-run list](https://github.com/ZachSaucier/Just-Read/issues/15#issuecomment-262255204). Also note that the other selectors are checked using JavaScript's [`querySelector`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector) or, in the case of `selectorsToDelete`, [`querySelectorAll`](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll).


</details>

<details id="ad">
  <summary>How can I get rid of the ad for the premium version?</summary>

Although this ad only shows occassionally and will eventually stop if you continue using Just Read, you can get rid of it by adding the following to your stylesheet: `.jr-notifier { display: none; }`


</details>

<details id="premium-features">
  <summary>I have a free account. How can I hide the premium features that show?</summary>

**This is not recommended** because if you do upgrade to Premium the features will remain hidden until the following is removed:

To hide premium features, adding the following to your stylesheet on the Just Read options page: `.premium-feature { display: none !important; }`


</details>

___

### Customizing how Just Read looks
<details id="customize">
  <summary>How can I customize the look of Just Read?</summary>

Just Read comes with two themes by default: a light (white) theme and a dark theme. You can choose between them through the style panel or the Options page.

You can also customize your theme to make Just Read look exactly the way that you like by either using the built in style panel or by directly editing the CSS file on the Options page.

To use the style panel, click [the paint brush icon](https://i.imgur.com/XW03mZW.png) and then change the settings to your liking. Make sure to click "Save and close" when you're done or the styles will not be updated in the actual stylesheet.

> **Note**: The theme editor style panel will only appear for the default theme, the default dark theme, or themes derived from the default (that share "default-styles" or "dark-styles" as part of the file name).

You can directly edit your theme's CSS file by clicking "openFullStyles" in the style panel or by right clicking the extension button and opening the "Options" page (you can also get to this via your browser's extensions page). Once on the Options page, you can then select the file you want to edit or enter a new file name, edit the file, and then save or apply it. It will then apply to all of your browser tabs on any computer when you start the extension. You can rename files by double clicking the name of the file.

You can also use themes that others have made. [Check them out here!](https://github.com/ZachSaucier/Just-Read/issues/4)


</details>

<details id="font">
  <summary>How can I add a custom Google Font to Just Read?</summary>

You can add a custom Google Font (or any other web-hosted font) by customizing the CSS for your theme. Go to Options then click on the theme that is currently in use (it should have a filled in circle next to the file name).

Once there, you can follow [these instructions](https://graphicdesign.stackexchange.com/a/76551/23061) to get the necessary CSS code to use the font in your theme. The only change you'll have to make is replacing the `Font Name` with whatever font you want, and replacing `.someSelector` with whatever selector you want. The selectors you most likely want to change are `body, h3` and `h1, h2` because this is what Just Read changes by default.


</details>

<details id="themes">
  <summary>How can I find other themes to use?</summary>

If you're looking to use other themes that people have built and use, you can check out [this page](https://github.com/ZachSaucier/Just-Read/issues/4). You can also share your own and "vote" using "Add your reaction"!

To install and use one of these themes,

1. Go to the Just Read options page. In Chrome you can simply right click the Just Read icon and then click "Options".
2. Once on the options page, click in the input box that says "New theme" and enter a name for the theme. Then click the "+" button.
3. Click the "Use as current theme" button to make it your active theme.
4. Copy and paste the CSS from your chosen theme into the CSS (code) section and then click "Save style changes".


</details>

<details id="gradient">
  <summary>What is Just Read's gradient functionality? And how can I turn it on?</summary>

> **Note that this is a Premium-only feature.**

Just Read's gradient functionality makes it so that each line of text starts and ends with a different color. By having the end-of-line color the same as the next start-of-line color, it makes following sentences easier and reading faster. Note that this feature overrides your other paragraph text color styles.

You can turn it on by going to "Options" -> "Additional features" and clicking the "Use JR's gradient text functionality to increase readability (will be forced over theme's colors)" option. You can also customize which colors you want to use by editing the values in the box below that option. Make sure to separate colors with a comma!


</details>

<details id="scrollbar">
  <summary>How can I enable a custom scrollbar to use?</summary>

> **Note that this is a Premium-only feature.**

You can enable a custom scrollbar by going to "Options" -> "Additional features" and clicking the "Use a custom scrollbar instead of the browser's default" option. This will make Just Read use its built-in, custom scrollbar and Just Read will retain this custom scrollbar on pages you share as well.

If you want to customize the look of the scrollbar even further, you can modify your theme to edit `progress`, `progress::-webkit-progress-bar`, and `progress::-webkit-progress-value` as needed.


</details>

___

### Fixing issues with Just Read
<details id="premium_features">
  <summary>I purchased Just Read Premium but don't have access to the Premium features. What's wrong?</summary>

> **Note that this is a Premium-only feature.**

Don't panic! Most likely all you need to do is go to <a href="https://justread.link/" target="_blank">the Just Read website</a> and make sure you're logged into your account. Signing in will tell the Just Read extension that you have Premium and if you start your reader view again the Premium features should work.

If they still don't work, please <a href="mailto:support@justread.link">contact support</a> and we'll help you as soon as we're able to.


</details>


<details id="incorrect_selection">
  <summary>Just Read isn't selecting all of the content I want it to. What can I do to fix this?</summary>

Usually you can fix this by using [user selection mode](https://github.com/ZachSaucier/Just-Read#user-selection-mode) to select the content that you want to view. Usually this means selecting more generally than Just Read's auto-selection. You can then delete unwanted elements from the selection after Just Read has started.

In order to see content within the selection that Just Read has automatically hidden because it thought it was irrelevant, you may have to disable `hide-segments.css`, which can be doing by going to Options then unchecking "Use hide-segments.css".


</details>

<details id="old_copy">
  <summary>How can I prevent Just Read from loading an old copy of the page I'm reading?</summary>

You can either use [user selection mode](https://github.com/ZachSaucier/Just-Read/#user-selection-mode) to select a specific element to read (not disabling this option for future cases) or you can go to "Options" -> "Additional preferences" and uncheck "Backup most recent Just Read page (in case of accidental closure).".


</details>

<details id="pre">
  <summary>How do I prevent pre tags from being reformatted into paragraphs?</summary>

Under "Options" -> "Additional preferences" there is an option to "Never reformat pre tags" to do this. This is probably most useful if you're a developer and read a lot of code-related articles.


</details>

<details id="other_extensions">
  <summary>*X extension* doesn't work with the Just Read version of my page. How can I get it to work?</summary>

As covered [in this post](https://github.com/ZachSaucier/Just-Read/issues/29#issue-196499408), this is an issue with the other extension and not Just Read. They will need to modify their code to work with iframe content.

However, most all extensions should work with a *shared* Just Read page, i.e. one on [justread.link](https://justread.link), but this is a [Premium-only feature](https://justread.link/#getJustRead).

</details>

<details id="too_many_shared">
  <summary>Why am I getting a "You have too many shared articles" error?</summary>

Currently Just Read Premium has a shared article limit of 100 articles. This is to prevent users from filling up the entire server with their pages (especially with malicious intent). To get rid of this error, you must go to https://justread.link/dashboard and delete some old articles that you're not using any longer.


</details>

<details id="error">
  <summary>How do I report an error?</summary>

For most issues [creating a new issue on the GitHub repo](https://github.com/ZachSaucier/Just-Read/issues/new) is best. Please make sure to [search through existing issues](https://github.com/ZachSaucier/Just-Read/issues?utf8=%E2%9C%93&q=is%3Aissue+) before posting to make sure your issue has not already been posted.

For *account related issues*, contact <a href="mailto:support@justread.link">support@justread.link</a>.


</details>

<details id="local">
  <summary>How can I run Just Read from a local copy on my computer?</summary>

To run Just Read from a local copy you need to [download Just Read as a ZIP](https://github.com/ZachSaucier/Just-Read/archive/master.zip), unzip it, open up the extension page of your browser (like `chrome://extensions/` in Chrome or `about:debugging#/runtime/this-firefox` in Firefox), enable developer mode, and load the extension. Some browsers may require that you load the packed (zipped) files while others may require the unpacked version. This is particularly useful if you are wanting to modify how Just Read works or debug issues.

</details>
