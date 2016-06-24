Just Read
=========

 The extension makes it easy to view web articles in a more readable, attractive, and custom format. It removes the distractions like ads, modals, and navigation from vision, letting the user just read the content.

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

Once Just Read has been installed, there are five built in ways to apply the effects to a given page. The first three use the default mechanism of selecting text and the other two allow the user to specify which text they want.

### Use Just Read's built in selection

You can start using Just Read's built in selection in three ways:

1. Click the Just Read Chrome extension button. 
![extension button](http://i.imgur.com/aCOIuVV.png)

2. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>L</kbd>.

3. Right click and choose the "Open this page using Just Read" option.

### User selection mode

You can also select exactly the text you want to read if the built in method doesn't select what you want. You can start doing that in two ways:

4. Right click the Just Read Chrome extension button, click "Select text to read", and then click the part of the page highlighted that you want to read.

5. Use the shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>K</kbd> then click the part of the page highlighted that you want to read.

### Deletion mode

Once the text has been selected and the article is open in the Just Read format, users can delete elements by going into deletion mode using the keyboard shortcut <kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>;</kbd>. They can click on elements that they don't want to view (helpful for printing or if there are elements that aren't part of the article) and they will be deleted. To exit this mode, users need to press <kbd>ESC</kbd>. 

___

## Customization:

By default the extension will use a theme that we made as seen here 
![the effect of the extension](http://i.imgur.com/gNEpBfG.png)

If you want to customize the stylesheet or add and use your own, you can right click the extension and open the "Options" page (you can also get to this via the Chrome extensions page). That will open a page that looks similar to this 
![Options page](http://i.imgur.com/1fKXKnF.png)

You can then select the file you want to edit or enter a new file name, edit the file, and then save or apply it. It will then apply to all of your Chrome tabs on any computer when you start the extension. You can rename files by double clicking the name of the file.

### Find themes or share your own

If you're looking to use other themes that people have built and use, you can check out [this page](https://github.com/ZachSaucier/Just-Read/issues/4). You can also share your own and "vote" using "Add your reaction"!

___

### Description of files:

- `manifest.json`: The primary setup file for the Chrome extension. It sets everything up the way we need it to be.
- `background.js`: Listens for the Just Read extension to be clicked and toggles the "on" badge.
- `content_script.js`: This handles all of the logic for formatting articles but not the options page.
- `options.js`: This handles all of the logic on the options page, not directly formatting articles.
- `page.css`: This is the required CSS file that formats our iframe on the article page.
- `required-styles.css`: This includes styles for things like the close button inside of our overlay. It is used in combination with whatever theme styles are used.
- `default-styles.css`: Self-explanatory; our default theme.
- `options.html`: Sets up and allows the options page to be used.
- `options.css`: Styles the options page.
- `README.md`: This markdown file to describe and instruct the project.

Let me know how I can improve this extension including any bugs you see and what features you'd like to see!

This is a Chrome extension was initially made in 16 hours at [UGA Hacks](http://ugahacks.herokuapp.com/) Fall 2015 and has been updated since.

___

Follow me: [Twitter](http://www.twitter.com/ZachSaucier), [CodePen](http://codepen.io/Zeaklous), [GitHub](https://github.com/ZachSaucier)
