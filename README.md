Just Read
=========

> I've started work on a paid version of Just Read. To find out more about it or to help contribute to what features should be included, please check out [the GitHub issue](https://github.com/ZachSaucier/Just-Read/issues/20).

 The extension makes it easy to view web articles in a more readable, attractive, and custom format - like a read mode, but better. It removes the distractions like ads, modals, and navigation from vision, letting the user just read the content.


> **Please note**: This extension is meant to format **article-type pages only**. It is not built to reformat other types of websites and is liable to not perform as one might expect. 

## How to install:

### Install from Chrome's webstore:
1. [View it on the webstore](https://chrome.google.com/webstore/detail/just-read/dgmanlpmmkibanfdgjocnabmcaclkmod) and click "Add to Chrome".

### Install from GitHub (for developers):

1. Download the files ([in zip form](http://i.imgur.com/4WkK2CA.png) -> unzip OR `git clone https://github.com/ZachSaucier/Just-Read.git`). 
2. Open up your Chrome extensions page: [chrome://extensions/](chrome://extensions/)
3. Make sure the ["Developer mode" checkbox is checked](http://i.imgur.com/7lS7JgW.png). 
4. Click "Load unpacked extension..." and select the folder that you downloaded Just Read to.
5. Once that folder has been selected, Just Read should [show up](http://i.imgur.com/hwnoLZi.png)! 

___

## How to use: 

Once Just Read has been installed, there are six built in ways to apply the effects to a given page. The first three use the default mechanism of selecting text and the other three allow the user to specify which text they want.

> **Note**: Keyboard shortcuts may have to be enabled for them to work correctly. To do this, go to `chrome://extensions/` and go to the very bottom. Click on "Keyboard shortcuts" and you can add/change shortcuts there.

### Use Just Read's built in selection

You can start using Just Read's built in selection in four ways:

1. Click the Just Read Chrome extension button. 
![extension button](http://i.imgur.com/aCOIuVV.png)

2. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>L</kbd>.

3. Right click the current page and choose the "View this page using Just Read" option.

4. Right click a link and select "View the linked page using Just Read" (it will open it in a new tab).

### User selection mode

You can also select exactly the text you want to read if the built in method doesn't select what you want. If you want to use a visual selector, you can start selection mode in two ways:

5. Right click the Just Read Chrome extension button, click "Select text to read", and then click the part of the page highlighted that you want to read.

6. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd> then click the part of the page highlighted that you want to read.

### Highlight mode

You can also select specific text by highlighting it (by clicking and dragging over the text), then right click it and select "View this text in Just Read".

### Deletion mode

Once the text has been selected and the article is open in the Just Read format, users can delete elements by going into deletion mode using the keyboard shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>;</kbd>. They can click on elements that they don't want to view (helpful for printing or if there are elements that aren't part of the article) and they will be deleted. To exit this mode, users need to press <kbd>ESC</kbd>. 

### Auto-enable Just Read on specific websites

You can also opt to auto-enable Just Read on certain websites by entering a part of the URL (usually the domain is a good choice) into the "Auto-run domain list" found on the extension's Options page. Just Read will then check each new site's URL to see if it matches one in the user-inputted list. If it does, it will start Just Read when the page loads.
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

### Find themes or share your own

If you're looking to use other themes that people have built and use, you can check out [this page](https://github.com/ZachSaucier/Just-Read/issues/4). You can also share your own and "vote" using "Add your reaction"!

___

Let me know how I can improve this extension including any bugs you see and what features you'd like to see!

This is a Chrome extension was initially made in 16 hours at [UGA Hacks](http://ugahacks.herokuapp.com/) Fall 2015 and has been updated since.

___

Follow me: [Twitter](http://www.twitter.com/ZachSaucier), [CodePen](http://codepen.io/Zeaklous), [GitHub](https://github.com/ZachSaucier)
