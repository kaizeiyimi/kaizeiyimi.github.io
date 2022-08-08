import path from 'path'
import fs from 'fs'
import glob from 'glob'
import {fileURLToPath} from 'url'
import { parse } from "./src/utils/utils.js"

const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

const siteBasePath = '/blog/'
const projectDir = __dirname
const publicDir = path.join(projectDir, 'public')
const postsDir = path.join(projectDir, 'public/posts')

// load all posts
function loadAllPosts() {
  const posts = glob.sync(path.join(postsDir, '/**/*.md')).map(p => {
    let post = parse(fs.readFileSync(p, 'utf8'), path.dirname(p).replace(publicDir, siteBasePath))
    post.isDraft = path.basename(p).startsWith('_')
    post.url = p.replace(publicDir, siteBasePath).replaceAll('//', '/')
    post.name = path.basename(p).slice(0,-3).replace(/\d{4}-\d{2}-\d{2}-/, '')
    post.content = undefined
    return post
  })
  return posts
}

const allPosts = loadAllPosts()
const about = allPosts.filter(p => p.name == 'about')[0]
const posts = allPosts.filter(p => p.name != 'about').sort((a,b) => b.meta.date - a.meta.date)
fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify({posts, about}))
