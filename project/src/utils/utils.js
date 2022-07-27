import parse from "./parse.js"

function tagColor(tag) {
  let hash = Array.from(tag).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
  let order = hash%4 + 1
  return `var(--bg-color-tag-${order})`
}

function extractContent(html) {
  const span = document.createElement('span')
  span.innerHTML = html
  return span.textContent || span.innerText
}

export { parse, tagColor, extractContent }