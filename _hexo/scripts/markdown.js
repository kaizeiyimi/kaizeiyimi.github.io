
var marked = require('marked');

// config
var mdrender = new marked.Renderer();
mdrender.code = function(code, lang) {
  lang = lang ? lang.toLowerCase() : "";
  if ( lang == "objective-c") {
    lang = "objectivec"
  }
  return "<pre><code class="+lang+">"+code+"</code></pre>";
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
