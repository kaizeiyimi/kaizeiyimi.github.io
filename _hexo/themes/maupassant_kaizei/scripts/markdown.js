'use strict';

var marked = require('marked');
var hljs = require(hexo.base_dir+"node_modules/hexo/node_modules/hexo-util/node_modules/highlight.js");

var util = require(hexo.base_dir+"node_modules/hexo/node_modules/hexo-util");
var stripHTML = util.stripHTML;

hljs.configure({classPrefix: "hljs-"});

// config
var mdrender = new marked.Renderer();
  // code
mdrender.code = function(code, lang) {
  lang = lang ? lang.toLowerCase() : null;
  if ( lang == "objective-c") {
    lang = "objc"
  }

  if (lang) {
  	code = hljs.highlight(lang, code).value;
  } else {
  	code = hljs.highlightAuto(code).value;
  }

  return "<pre><code class='" + lang + " hljs'>" + code + "</code></pre>";
};
  // table
var originTableRender = mdrender.table;
mdrender.table = function (head, body) {
  return "<div><div class='table_container'>\n" + originTableRender(head, body) + "</div></div>";
};
  // heading
mdrender.heading = function(text, level) {
  var id = util.slugize(stripHTML(text).trim());

  if (!this._headingId) {
    this._headingId = {};
  }
  var headingId = this._headingId;

  // Add a number after id if repeated
  if (headingId[id]) {
    id += '-' + headingId[id]++;
  } else {
    headingId[id] = 1;
  }
  // add headerlink
  return '<h' + level + ' id="' + id + '"><a href="#' + id + '" class="headerlink" title="' + stripHTML(text) + '"></a>' + text + '</h' + level + '>';
};

marked.setOptions({renderer: mdrender});

// 
function renderer(data, option, callback) {
  callback(null, marked(data.text));
}

hexo.extend.renderer.register('md', 'html', renderer);
hexo.extend.renderer.register('markdown', 'html', renderer);
