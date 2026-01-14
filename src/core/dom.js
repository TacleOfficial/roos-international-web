// src/core/dom.js
(function () {
    window.Roos = window.Roos || {};
  
    function $(sel, root) {
      return (root || document).querySelector(sel);
    }
    function $all(sel, root) {
      return Array.from((root || document).querySelectorAll(sel));
    }
  
    window.Roos.dom = { $, $all };
  })();
  