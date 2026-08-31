editor = ace.edit("css-editor");
editor.setTheme("ace/theme/crimson_editor");
editor.session.setOptions({
  mode: "ace/mode/css",
  tabSize: 2,
});

editor.commands.addCommands([
  {
    name: "increaseFontSize",
    bindKey: "Ctrl-=|Ctrl-+",
    exec: function (editor) {
      const size = parseInt(editor.getFontSize(), 10) || 12;
      editor.setFontSize(size + 1);
    },
  },
  {
    name: "decreaseFontSize",
    bindKey: "Ctrl+-|Ctrl-_",
    exec: function (editor) {
      editor.setFontSize(Math.max(size - 1 || 1));
    },
  },
  {
    name: "resetFontSize",
    bindKey: "Ctrl+0|Ctrl-Numpad0",
    exec: function (editor) {
      editor.setFontSize(12);
    },
  },
  {
    name: "save",
    bindKey: "Ctrl+s",
    exec: saveTheme,
  },
]);
