Just Read
=========

Just Read makes it easy to view web articles in a more readable, attractive, and custom format - like a read mode, but better. It removes the distractions like ads, modals, and navigation from vision, letting the user just read the content.

**Please note** that this extension is meant to format **article-type pages only**. It is not built to reformat other types of websites and is liable to not perform as one might expect.

There is a premium and a free version of Just Read. For more information about the difference between the two, see [Just Read's homepage](https://justread.link/), [the explanation video](https://www.youtube.com/watch?v=t06dUD80MyM), or [the FAQ below](https://github.com/ZachSaucier/Just-Read/#faq).

___

### Installation:

- [Just Read (Chrome)](https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod)
- [Just Read (Firefox)](https://addons.mozilla.org/en-US/firefox/addon/just-read-ext/)
- [Just Read Premium (Chrome)](https://chrome.google.com/webstore/detail/just-read-premium/dpamdgmnffodphoamchpmbclkpmccjga)

> **Note** that if you have the Premium version installed, you don't need to have the free version installed and can uninstall it.

You can even use Just Read on your smart phone through mobile browsers that support extensions such as [Dolphin](http://dolphin.com/) (iOS or Android), [Kiwi](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en_US) (Android), or [Yandex](https://browser.yandex.com/) (iOS or Android). For more information, see [the mobile installation instructions](https://github.com/ZachSaucier/Just-Read/#on-a-mobile-device). **Note that some of Just Read's features may not work on mobile devices.**

___
### The story behind Just Read

Hi, I'm Zach. I made Just Read because I was tired of terribly hard to read web articles, especially news sites. Before I made JR, I would manually use Chrome's developer tools to make a page more readable. Then at the [UGA Hacks](http://ugahacks.herokuapp.com/) Fall 2015 hackathon, I decided to make an reader mode for Chrome and ended up with the first version of Just Read after 16 hours of work. After sharing it on Chrome's web store, others seemed to like it as well, and I've been working on it ever since.

___

### Privacy statement

Just Read collects absolutely zero personal data from users and sends analytics to no one else. All data Just Read uses is connected to your personal account with which you have installed Just Read and the creators of Just Read never see any of it. For shared pages, a random, unique, and anonymous string is used to verify identity, not anything related to your personal information.

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

Start Just Read by using Just Read's auto-selection, user-selection mode, or highlight mode.

> **Note**: Keyboard shortcuts may have to be enabled for them to work correctly. To do this, go to `chrome://extensions/shortcuts` (`about:addons`, the gear icon -> "Manage Extension Shortcuts" in Firefox) and you can add/change shortcuts there.

#### Auto-selection

You can start using Just Read's built in auto-selection selection in three ways:

1. Click the Just Read extension button.
![extension button](http://i.imgur.com/aCOIuVV.png)

2. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>L</kbd>.

3. Right click the current page and choose the "View this page using Just Read" option.

<!-- 4. Right click a link and select "View the linked page using Just Read" (it will open it in a new tab). This is also called "link mode". -->

#### User selection mode

You can select exactly the text you want to read if the built in method doesn't select what you want. If you want to use a visual selector, you can start selection mode in two ways:

5. Right click the Just Read extension button, click "Select content to read", and then click the part of the page highlighted that you want to read.

6. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd> then click the part of the page highlighted that you want to read.

#### Highlight mode

You can select specific text by highlighting it (by clicking and dragging over the content), then right click it and select "View this content in Just Read".

### On a mobile device

You must first install a mobile browser that supports extensions such as [Firefox](https://www.mozilla.org/en-US/firefox/mobile/) (iOS or Android), [Dolphin](http://dolphin.com/) (iOS or Android), [Kiwi](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser&hl=en_US) (Android), or [Yandex](https://browser.yandex.com/) (iOS or Android). Then install Just Read to that browser by visiting Just Read's (or Just Read Premium's) store page.

Once you're on an article that you want to read with Just Read installed on that browser, you need to navigate to their extensions section to run Just Read. In most browsers you need to click the three dots to see this section. Once there, simply click on Just Read.

**Note that some of Just Read's features are likely to not work properly on mobile devices due to a lack of features on those mobile browsers.**

</details>


<details id="autorun">
  <summary>How can I auto-run Just Read on specific websites?</summary>

You can opt to auto-run Just Read on certain websites by entering a part of the URL (usually the domain is a good choice) or a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) (regex) into the "Auto-run domain list" found on the extension's Options page (for more info as to what formats work, see [this post](https://github.com/ZachSaucier/Just-Read/issues/15#issuecomment-262255204)). Just Read will then check each new site's URL to see if it matches a string or expression in the user-inputted list. If it does, it will start Just Read when the page loads.

You can also enable "Always add current site to Just Read's autorun list when Just Read is started on a page" under "Options" -> "Additional preferences" if you want *every* site that you start Just Read to be added to the auto-run list. For more information on how this works, see [this post](https://github.com/ZachSaucier/Just-Read/pull/166#issuecomment-404371640).


</details>

<details id="all_computers">
  <summary>How can I get Just Read on all of my computers?</summary>

When you log into Chrome using a Google account (as the primary Chrome user) or Firefox using one of their accounts, the browser automatically installs all extensions that you've installed to your account. This should include Just Read and/or Just Read Premium. Just Read automatically syncs your themes and preferences across all of your devices using this functionality, so you don't need to do anything special to get it working the same way on all of your devices. Note that currently some mobile browsers do not support web extensions, so Just Read cannot be installed on these browsers.

For more information on how to get Just Read to work on your mobile devices, see [the mobile installation instructions](https://github.com/ZachSaucier/Just-Read/#on-a-mobile-device). **Note that some of Just Read's features may not work on mobile devices.**


</details>

<details id="share">
  <summary>How can I share my Just Read version of a page with someone?</summary>

> **Note that this is a Premium-only feature.**

You can share a page in Just Read's format by clicking [the share icon](https://i.imgur.com/4VospZC.png). This will show a [justread.link](https://justread.link) URL which will point to your Just Read version of the article. This may also open up the [justread.link](https://justread.link) URL in a new tab and close the current page depending on your settings under "Options" -> "Sharing preferences".

**Note that for this feature to work in Chrome, you must have user account syncing enabled.** To enable syncing for your Google account, go to Chrome's settings page (`chrome://settings/`) and under "People" click "Turn on syncing".

Also note that the [justread.link](https://justread.link) version of a page *cannot be edited*. If you need to edit it at that point, you must make your edits on the original Just Read version of the page and then re-share the page (which will create an entirely new address).

Lastly, **if you are using Brave (or another browser other than Chrome) this feature may not work at all**. I am investigating the issue, but please reach out to support@justread.link so we can discuss a work around in the mean time.


</details>

<details id="previous_shares">
  <summary>How can I view and delete pages that I have shared previously?</summary>

> **Note that this is a Premium-only feature.**

You can view and delete pages that you shared previously by going to https://justread.link/dashboard, which is your user profile page. Note that you can click any column heading to sort the entries by that column's values.

Note that you can only view this page if you currently have Just Read Premium installed on the browser that you're using.


</details>

<details id="autosave">
  <summary>How can I have Just Read auto-save my changes?</summary>

Just Read has an option under Options -> "Backup the most recent Just Read page (in case of accidental closure)." that does this. If you make any changes on a page, if you are on that same page it will load the old version if enabled.


</details>

<details id="link_to">
  <summary>How can I link to a specific part of a shared article?</summary>

> **Note that this is a Premium-only feature.**

If you make any highlights, color change, or other edits to a text selection (a premium feature), Just Read will add a unique ID to that selection. You can thenshare that page and then look up that ID to get a link to that specific element on the shared page. For more information, [look at this post](https://stackoverflow.com/a/2835151/2065702).


</details>

<details id="kindle">
  <summary>How can I send the article to my Kindle?</summary>

> **Note that this is a Premium-only feature.**

In order to send the article content from Just Read to your Kindle, you must first [install the free Send to Kindle extension](https://chrome.google.com/webstore/detail/send-to-kindle-for-google/cgdjpilhipecahhcilnafpblkieebhea). Then you can use it on any shared Just Read page (or any other web page).


</details>

<details id="drive">
  <summary>How can I send the article to Google Drive?</summary>

Currently it is only possible to send files to Google Drive in PDF form. The easiest way to do so in Chrome is to "print" the page (either using your browser's built-in print ability or by clicking Just Read's print icon) and then change the "Destination" to "Save to Google Drive". In Firefox, you need to save it to your computer as a PDF and then manually upload it to Google Drive.


</details>

<details id="autoscroll">
  <summary>How can I get Just Read to auto-scroll the article?</summary>

> **Note that this is a Premium-only feature.**

You can do this by going to "Options" -> "Additional features" and clicking the "Use JR's auto-scroll functionality" option. This will automatically scroll the article once you open it in Just Read. It also creates a "Pause scroll" button at the bottom right of Just Read. You can customize the speed of the auto-scroll by editing the box below this option.  


</details>

<details id="fullscreen">
  <summary>How can I auto-enable fullscreen when Just Read is started?</summary>

Under "Options" -> "Additional preferences" there is an option to "Always auto-enable fullscreen when Just Read is started." Checking this box will make Just Read be fullscreen (like when you press <kbd>F11</kbd>) when you start Just Read on a page.


</details>

<details id="context_menu">
  <summary>How can I remove Just Read's entries from the right-click context menu?</summary>

Under "Options" -> "Context menu entries", you can enable or disable the context menu entries that Just Read creates.

- "Don't reformat pre tags" makes it so that Just Read doesn't turn any `<pre>` tags into paragraphs but retains their original formatting.
- "Enable page context menu entry" allows Just Read to show a menu entry when you right click a page.
- "Enable highlight context menu entry" allows Just Read to show a menu entry when you right click highlighted text.
- "Enable link context menu entry" allows Just Read to show a menu entry when you right click a link.


</details>

<details id="unsubscribe">
  <summary>How can I unsubscribe from Just Read Premium?</summary>

Since Google handles the payments completely through their webstore, you can cancel your subscription by following [these instructions](https://support.google.com/chrome_webstore/answer/1060830?hl=en).


</details>

___

### Editing Just Read's content
<details id="deletion_mode">
  <summary>How can I delete parts of the page once Just Read has started?</summary>

Once the text has been selected and the article is open in the Just Read format, users can delete elements by going into deletion mode using the keyboard shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>;</kbd> or by clicking on [the deletion mode icon](https://i.imgur.com/QD5G2j4.png).

Once in deletion mode, users can click on elements that they don't want to be included in their page and they will be deleted. To exit this mode, users need to press <kbd>ESC</kbd> or click the deletion mode icon. These actions can be undone by clicking the undo icon that appears or by using the shortcut <kbd>Ctrl</kbd> + <kbd>Z</kbd>.

If you have the premium version of Just Read, you can also delete anything that you highlight using <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>d</kbd> or clicking the trash can icon on the toolbar that shows up.


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

Yes you can! Using the Premium version, you can go to "Options" -> "Domain-specific selectors" and customize it to select exactly the content the content you want automatically. The only required part is the `domainPattern` in order for Just Read to know when to use those selectors over the automatic ones. You should only include the others that you need.

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

___

### Customizing how Just Read looks
<details id="customize">
  <summary>How can I customize the look of Just Read?</summary>

Just Read comes with two themes by default: a white theme and a dark theme. You can choose between them through the GUI or the Options page.

You can also customize your theme to make Just Read look exactly the way that you like by either using the built in GUI or by directly editing the CSS file on the Options page.

To use the GUI, click [the paint brush icon](http://i.imgur.com/XW03mZW.png) and then change the settings to your liking. Make sure to click "Save and close" when you're done or the styles will not be updated in the actual stylesheet.

> **Note**: The theme editor GUI will only appear for the default theme, the default dark theme, or themes derived from the default (that share "default-styles" or "dark-styles" as part of the file name).

You can directly edit your theme's CSS file by clicking "openFullStyles" in the GUI or by right clicking the extension button and opening the "Options" page (you can also get to this via your browser's extensions page). Once on the Options page, you can then select the file you want to edit or enter a new file name, edit the file, and then save or apply it. It will then apply to all of your browser tabs on any computer when you start the extension. You can rename files by double clicking the name of the file.

You can also use themes that others have made. [Check them out here!](https://github.com/ZachSaucier/Just-Read/issues/4)


</details>

<details id="font">
  <summary>How can I add a custom Google Font to Just Read?</summary>

You can add a custom Google Font (or any other web-hosted font) by customizing the CSS for your theme. Go to Options then click on the theme that is currently in use (it should have a filled in circle next to the file name).

Once there, you can follow [these instructions](https://graphicdesign.stackexchange.com/a/76551/23061) to get the necessary CSS code to use the font in your theme. The only change you'll have to make is replacing the `Font Name` with whatever font you want, and replacing `.someSelector` with whatever selector you want. The selectors you most likely want to change are `body, h3` and `h1, h2` because this is what Just Read changes by default.

Since you only have access to the CSS


</details>

<details id="themes">
  <summary>How can I find other themes to use?</summary>

If you're looking to use other themes that people have built and use, you can check out [this page](https://github.com/ZachSaucier/Just-Read/issues/4). You can also share your own and "vote" using "Add your reaction"!


</details>

<details id="gradient">
  <summary>What is Just Read's gradient functionality? And how can I turn it on?</summary>

> **Note that this is a Premium-only feature.**

Just Read's gradient functionality makes it so that each line of text starts and ends with a different color. By having the end-of-line color the same as the next start-of-line color, it makes following sentences easier and reading faster. Note that this feature overrides your other paragraph text color styles.

You can turn it on by going to "Options" -> "Additional features" and clicking the "Use JR's gradient text functionality to increase readability (will be forced over theme's colors)" option. You can also customize which colors you want to use by editing the values in the box below that option. Make sure to separate colors by a comma!


</details>

<details id="scrollbar">
  <summary>How can I enable a custom scrollbar to use?</summary>

> **Note that this is a Premium-only feature.**

You can enable a custom scrollbar by going to "Options" -> "Additional features" and clicking the "Use a custom scrollbar instead of the browser's default" option. This will make Just Read use its built-in, custom scrollbar and Just Read will retain this custom scrollbar on pages you share as well.

If you want to customize the look of the scrollbar even further, you can modify your theme to edit `progress`, `progress::-webkit-progress-bar`, and `progress::-webkit-progress-value` as needed.


</details>

___

### Fixing issues with Just Read
<details id="incorrect_selection">
  <summary>Just Read isn't selecting all of the content I want it to. What can I do to fix this?</summary>

Usually you can fix this by using [user selection mode](https://github.com/ZachSaucier/Just-Read#user-selection-mode) to select the content that you want to view. Usually this means selecting more generally than Just Read's more conservative auto-selection. You can then delete unwanted elements from the selection after Just Read has started.

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

However, most all extensions should work with a *shared* Just Read page, i.e. one on [justread.link](https://justread.link), but this is a [Premium-only feature](https://github.com/ZachSaucier/Just-Read/#share).

</details>

<details id="too_many_shared">
  <summary>Why am I getting a "You have too many shared articles" error?</summary>

Currently Just Read Premium has a shared article limit of 100 articles. This is to prevent users from filling up the entire server with their pages (especially with malicious intent). To get rid of this error, you must go to https://justread.link/dashboard and delete some old articles that you're not using any longer.


</details>

<details id="premium_theme">
  <summary>My theme from the original version breaks the page when I am using Premium. What's going on?</summary>

Just Read Premium uses a slightly modified structure and selectors. Check these common errors to help ease the translation process:

- Local fonts built into Just Read have been removed. Please load from an external link (like Google Fonts) if you wish to have custom fonts.
- `hide-segments.css` is now loaded separately from the default stylesheet. If you don't want it enabled, please uncheck the box that says 'Use hide-segments.css' on the Options page. If you include an old version of the segment hider CSS in your theme, please remove it for premium because some of Just Read's premiums features use class names that may be hidden using the old version.
- Most selectors previously affecting `.simple-container` should now affect `.simple-article-container` instead.
- When you're adding comments, the comments section is a default 300px in width. This works fine with the default 600px article width inside of the 1000px width parent container, but if you have edited the widths they may have to be changed to accommodate comments if desired.
- There are new elements that may need styling if your theme varies much from the default, such as `.simple-comments` and all of its children for adding comments, `.simple-share` (the share button), `.pause-scroll` for auto-scrolling, and `.simple-find` for the search functionality.


</details>

<details id="cant_buy">
  <summary>I can't buy the Premium version on Chrome's webstore. What can I do?</summary>

Chrome's webstore prevents Chrome extensions from being bought in some regions. You *could* use a VPN to circumvent these restrictions. As an alternative, you can contact me at support@justread.link to arrange an alternative way of payment.


</details>

<details id="error">
  <summary>How do I report an error?</summary>

Please [create a new issue on the GitHub repo](https://github.com/ZachSaucier/Just-Read/issues/new) to report errors that you have. Also please [search through existing issues](https://github.com/ZachSaucier/Just-Read/issues?utf8=%E2%9C%93&q=is%3Aissue+) before posting to make sure your issue has not already been posted.


</details>

<details id="local">
  <summary>How can I run Just Read from a local copy on my computer?</summary>

To run it from a local copy you need to [download Just Read as a ZIP](https://github.com/ZachSaucier/Just-Read/archive/master.zip), unzip it, and then go to `chrome://extensions/` (or `about:debugging#addons` for Firefox), click enable "developer mode", and click "Load Unpacked", and then select the unzipped folder. This is particularly useful if you are wanting to modify how Just Read works or debug issues.

</details>
