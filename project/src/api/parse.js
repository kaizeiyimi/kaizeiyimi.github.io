import hljs from "highlight.js"
import { marked } from "marked"

// marked config
marked.setOptions({
  highlight: function(code, lang) {
    return hljs.highlightAuto(code, [lang]).value
  }
})

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

  var [_, meta, ...content] = markdown.split('---').map(t => t.trim())
  content = marked.parse(refineUrl(content.join())).trim()
  
  var summary = content.includes('\n<!--more-->') ? content.split('\n<!--more-->')[0] : content.split('\n')[0]
  summary = summary.trim()
  
  /*
  name: break-swift-init-rule
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
      const parsed = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)\s*([+-]\d{4})?$/.exec(meta.date)
      if (parsed) {
        const ts = new Date(parsed[3] ? meta.date : `${meta.date} +0800`).getTime()
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