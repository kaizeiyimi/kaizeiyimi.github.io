import parse from "./parse.js"

function tagColor(tag) {
  let hash = Array.from(tag).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
  let order = Math.abs(hash)%4 + 1
  return `var(--bg-color-tag-${order})`
}

function extractContent(html) {
  const span = document.createElement('span')
  span.innerHTML = html
  return span.textContent || span.innerText
}

function request(url) {
  return fetch(url, {
    headers: {
      'cache-control': 'max-age=600, must-revalidate'
    }
  })
}

export { parse, tagColor, extractContent, request }