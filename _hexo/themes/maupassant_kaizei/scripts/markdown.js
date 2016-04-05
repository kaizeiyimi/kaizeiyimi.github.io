
var marked = require('marked');
var hljs = require(hexo.base_dir+"node_modules/hexo/node_modules/hexo-util/node_modules/highlight.js/lib/index.js");
hljs.configure({classPrefix: "hljs-"});

// config
var mdrender = new marked.Renderer();
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

  return "<pre><code class='"+lang+" hljs'>"+code+"</code></pre>";
};

var originTableRender = mdrender.table;
mdrender.table = function (head, body) {
  return "<div><div class='table_container'>\n" + originTableRender(head, body) + "</div></div>";
};

marked.setOptions({renderer: mdrender});

function renderer(data, option, callback) {
  callback(null, marked(data.text));
}

hexo.extend.renderer.register('md', 'html', renderer);
hexo.extend.renderer.register('markdown', 'html', renderer);
