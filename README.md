Just Read
=========

This is a Chrome extension made at [UGA Hacks](http://ugahacks.herokuapp.com/) Fall 2015 with the purpose of making articles on any given websites more readable and attractive, removing the distractions.



## How to install:

1. Download the files (the easiest for most people would be in zip form and then unzip it once downloaded). 
![Asset loading effects](http://i.imgur.com/4WkK2CA.png)
2. Open up your Chrome extensions page: [chrome://extensions/](chrome://extensions/)
3. Make sure the "Developer mode" checkbox is clicked. 
![Chrome extensions loader](http://i.imgur.com/7lS7JgW.png)
4. Click "Load unpacked extension..." and select the folder that you downloaded Just Read to.
5. Once that folder has been selected, Just Read should show up! 
![Just Read showing](http://i.imgur.com/hwnoLZi.png)

___

## How to use: 

Once Just Read has been installed, to apply the effects to a given page just click the Just Read Chrome extension button. 
![extension button](http://i.imgur.com/aCOIuVV.png)

Please note: This extension is meant to format **article-type pages only**. It is not built to reformat other types of websites and is liable to not perform as one might expect. 

By default the extension will use a theme that we made as seen here 
![the effect of the extension](http://i.imgur.com/0aBizH4.png)

If you want to customize the stylesheet or add and use your own, you can right click the extension and open the "Options" page (you can also get to this via the Chrome extensions page). That will open a page that looks similar to this 
![Options page](http://i.imgur.com/GHUcFHw.png)

You can then select the file you want to edit or enter a new file name, edit the file, and then save or apply it. It will then apply to all of your Chrome tabs on any computer when you start the extension. 

###S Description of files:

- `manifest.json`: The primary setup file for the Chrome extension. It sets everything up the way we need it to be.
- `background.js`: Listens for the Just Read extension to be clicked and toggles the "on" badge.
- `content_script.js`: This handles all of the logic for formatting articles but not the options page.
- `options.js`: This handles all of the logic on the options page, not directly formatting articles.
- `page.css`: This is the required CSS file that formats our iframe on the article page.
- `required-styles.css`: This includes styles for things like the close button inside of our overlay. It is used in combination with whatever theme styles are used.
- `default-styles.css`: Self-explanatory; our default theme.
- `options.html` - Sets up and allows the options page to be used.
- `options.css` - Styles the options page.
- `README.md`: This markdown file to describe and instruct the project.

Let me know how I can improve this extension including any bugs you see and what features you'd like to see!

___

Follow me: [Twitter](http://www.twitter.com/ZachSaucier), [CodePen](http://codepen.io/Zeaklous), [GitHub](https://github.com/ZachSaucier)