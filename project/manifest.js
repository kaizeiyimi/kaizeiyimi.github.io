import hljs from "highlight.js"
import { marked } from "marked"
import path from 'path'
import fs from 'fs'
import glob from 'glob'
import {fileURLToPath} from 'url'
import { parse } from "./src/api/index.js"

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

// marked config
marked.setOptions({
  highlight: function(code, lang) {
    return hljs.highlightAuto(code, [lang]).value
  }
})

// load all posts
function loadAllPosts(dir) {
  const posts = glob.sync(path.join(dir, '/**/*.md')).map(p => {
    let post = parse(fs.readFileSync(p, 'utf8'))
    post.isDraft = path.basename(p).startsWith('_')
    post.filePath = p
    return post
  })
  return posts
}

console.log(loadAllPosts(path.join(__dirname, 'public/posts')));
