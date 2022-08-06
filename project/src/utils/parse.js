import hljs from "highlight.js"
import { marked } from "marked"

// marked config
const renderer = new marked.Renderer()
renderer.codespan = function(code) {
  return `<code class="codespan">${code}</code>`
}
renderer.code = function(code, lang) {
  return `
  <div class="code-container">
    <div class="lang">${lang}</div>
    <pre><code class="language-${lang}">${hljs.highlightAuto(code, [lang]).value}</code></pre>
  </div>`
}
renderer.link = function(href, title, text) {
  let targetAttr = href.startsWith('/') ? '' : 'target=_blank'
  let titleAttr = title ? `title="${title}"` : ''
  return `<a href="${href}" ${titleAttr} ${targetAttr}>${text}</a>`
}

marked.setOptions({ renderer })

// parse post at path
function parse(markdown, basePath) {
  // refine relative urls for siteBase & basePath
  function refineUrl(markdown) {
    return markdown.replace(/\[.+?\]\(.+?\)/g, t => {
      return t.replace(/\(.+?\)/, url => {
        if (url.startsWith('(http') || url.startsWith('(/')) {
          return url
        }
        const result = `(/${basePath}/${url.substring(1)}`.replaceAll('//', '/')
        return result
      })
    })
  }

  var markdown = '\n' + markdown.split('\n').map(line => line.trimEnd()).join('\n')
  var [_, meta, ...content] = markdown.split('\n---\n').map(t => t.trim())
  if (markdown.startsWith('\n---\n')) {
    content = marked.parse(refineUrl(content.join())).trim()
  } else {
    meta = null
    content = marked.parse(refineUrl(markdown)).trim()
  }
  
  var summary = content.includes('\n<!--more-->') ? content.split('\n<!--more-->')[0] : content.split('\n')[0]
  summary = summary.trim()
  
  /*
  title: 对swift中单例的init搞破坏
  date: 2016-05-26 11:41:02 +0800
  tags: swift, iOS
  */
  function parseMeta(text) {
    if (!text) { return {} }
  
    let meta = text.split('\n').reduce((result, current) => { 
      let [key, ...value] = current.split(':')
      key = key.trim()
      value = value.join(':').trim()
      result[key] = value
      return result
    }, {})
  
    meta.tags = (meta.tags || '').split(',').map(t => t.trim())
  
    if(meta.date) {
      const parsed = /^(\d{4}-\d{2}-\d{2})$/.exec(meta.date)
      if (parsed) {
        const ts = new Date(meta.date).getTime()
        meta.date = ts ? ts : undefined
      } else {
        meta.date = undefined
      }
    }
    return meta
  }
  
  //
  return {
    meta: parseMeta(meta),
    summary,
    content
  }
}

export default parse
