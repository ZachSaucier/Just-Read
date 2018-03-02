Just Read
=========

> There's potential for a paid version of Just Read. To find out more about it or to help contribute to what features should be included, please check out [the GitHub issue](https://github.com/ZachSaucier/Just-Read/issues/20).

 The extension makes it easy to view web articles in a more readable, attractive, and custom format - like a read mode, but better. It removes the distractions like ads, modals, and navigation from vision, letting the user just read the content.


> **Please note**: This extension is meant to format **article-type pages only**. It is not built to reformat other types of websites and is liable to not perform as one might expect. 

## How to install:

### Install from Chrome's webstore:
1. [View it on the webstore](https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod) and click "Add to Chrome".

<!-- ### Install from Firefox's webstore:
1. [View it on the webstore](https://addons.mozilla.org/en-US/firefox/addon/just-read-ext/) and click "Add to Firefox". -->

### Install from GitHub (for developers):

You can clone this repo or download the ZIP and load it as an unpacked extension. This is useful if you want to help contribute to Just Read and test your code. 

___

## How to use: 

Once Just Read has been installed, there are six built in ways to apply the effects to a given page. The first three use the default mechanism of selecting text and the other three allow the user to specify which text they want.

> **Note**: Keyboard shortcuts may have to be enabled for them to work correctly. To do this, go to `chrome://extensions/` and go to the very bottom. Click on "Keyboard shortcuts" and you can add/change shortcuts there.

### Use Just Read's built in selection

You can start using Just Read's built in selection in four ways:

1. Click the Just Read extension button. 
![extension button](http://i.imgur.com/aCOIuVV.png)

2. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>L</kbd>.

3. Right click the current page and choose the "View this page using Just Read" option.

4. Right click a link and select "View the linked page using Just Read" (it will open it in a new tab).

### User selection mode

You can also select exactly the text you want to read if the built in method doesn't select what you want. If you want to use a visual selector, you can start selection mode in two ways:

5. Right click the Just Read extension button, click "Select text to read", and then click the part of the page highlighted that you want to read.

6. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd> then click the part of the page highlighted that you want to read.

### Highlight mode

You can also select specific text by highlighting it (by clicking and dragging over the text), then right click it and select "View this text in Just Read".

### Deletion mode

Once the text has been selected and the article is open in the Just Read format, users can delete elements by going into deletion mode using the keyboard shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>;</kbd>. They can click on elements that they don't want to view (helpful for printing or if there are elements that aren't part of the article) and they will be deleted. To exit this mode, users need to press <kbd>ESC</kbd>. 

You can also enable an icon to enter/exit deletion mode in Just Read's [additional options](https://github.com/ZachSaucier/Just-Read#additional-options) which [looks like this](http://i.imgur.com/87Z8QXX.png)

### Auto-enable Just Read on specific websites

You can also opt to auto-enable Just Read on certain websites by entering a part of the URL (usually the domain is a good choice) or a regular expression into the "Auto-run domain list" found on the extension's Options page (for more info as to what formats work, see [this post](https://github.com/ZachSaucier/Just-Read/issues/15#issuecomment-262255204). Just Read will then check each new site's URL to see if it matches the string or expression in the user-inputted list. If it does, it will start Just Read when the page loads.
![Auto-enable](http://i.imgur.com/CVfW4Zc.png)

___

## Customization:

By default the extension will use a theme that we made as seen here 
![the effect of the extension](http://i.imgur.com/gNEpBfG.png)

You can customize this theme using the GUI shown when you click [the paint brush icon](http://i.imgur.com/XW03mZW.png). Just make sure to click "Save and close" when you're done or the styles will not be updated in the actual stylesheet. The GUI looks like this:

![GUI](http://i.imgur.com/0AJXOFp.png)

> **Note**: The theme editor GUI will only appear for the default theme or themes derived from the default (that share "default-stylesheet" as part of the file name).

If you want to further customize the stylesheet or add and use your own, you can click the "openFullStyles" in the GUI or right click the extension button and open the "Options" page (you can also get to this via the Chrome extensions page). That will open a page that looks similar to this 
![Options page](http://i.imgur.com/xXoUpEr.png)

You can then select the file you want to edit or enter a new file name, edit the file, and then save or apply it. It will then apply to all of your Chrome tabs on any computer when you start the extension. You can rename files by double clicking the name of the file.

### Additional options

If you click "Additional options" while on the options page, a new modal will show with the following options:

![Additional options](http://i.imgur.com/C9Fg7hI.png)

"Show button for deletion mode" adds a new button when Just Read is open to start/stop deletion mode to prevent the need of the keyboard shortcut (but still retains keyboard shortcut functionality).

"Don't reformat pre tags" makes it so that Just Read doesn't turn any `<pre>` tags into paragraphs but retains their original formatting.

"Enable page context menu entry" allows Just Read to show a menu entry when you right click a page.

"Enable highlight context menu entry" allows Just Read to show a menu entry when you right click highlighted text.

"Enable link context menu entry" allows Just Read to show a menu entry when you right click a link.

"Always auto-enable fullscreen when Just Read is started" makes the screen automatically go to fullscreen when Just Read is active if the page is the active page. 

### Find themes or share your own

If you're looking to use other themes that people have built and use, you can check out [this page](https://github.com/ZachSaucier/Just-Read/issues/4). You can also share your own and "vote" using "Add your reaction"!

___

#### Privacy statement

Just Read collects absolutely zero personal data from users and sends nothing at all to any server, so you have no worry of any abuse from Just Read. All data Just Read uses is connected to your personal Google account on which you have installed Just Read and the creators of Just Read never see any of it. 

___

Let me know how I can improve this extension including any bugs you see and what features you'd like to see!

This Chrome extension was initially made in 16 hours at [UGA Hacks](http://ugahacks.herokuapp.com/) Fall 2015 and has been updated since.

___

##### Donate

I created and maintain this extension for no pay and will always keep Just Read free. If you want to be generous and show appreciation for the product I've created, you can donate to help me take my girlfriend out for a nice dinner via the PayPal donate link below.

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Y3GG9ANMQ9JML&lc=US&item_name=Zach%20Saucier&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted)


Follow me: [Twitter](http://www.twitter.com/ZachSaucier), [CodePen](http://codepen.io/Zeaklous), [GitHub](https://github.com/ZachSaucier)
