import { createApp } from 'vue'
import { useDark } from '@vueuse/core'
import { createRouter, createWebHashHistory } from 'vue-router'
import { extractContent } from '@/utils/utils.js'
import 'normalize.css'
import 'highlight.js/styles/atom-one-dark.css'
import './style.css'
import App from './App.vue'

// router
import Home from './pages/Home.vue'
import About from './pages/About.vue'
import Post from './pages/Post.vue'
import Tags from './pages/Tags.vue'
import Search from './pages/Search.vue'
import NotFound from './pages/NotFound.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/tags', name: 'tags', component: Tags, props: true },
  { path: '/posts/:name', component: Post },
  { path: '/search', component: Search },
  { path: '/:pathMatching(.*)*', name: 'not-found', component: NotFound },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// create app
const app = createApp(App)
app.use(router)
  
fetch(('/blog/' + '/manifest.json').replaceAll('//', '/'), {cache: 'reload'})
  .then(res => res.json())
  .then(res => {
    res.posts.forEach(p => {

      p.searchable = [
        p.meta.title,
        ...p.meta.tags,
        (new Date(p.meta.date)).toLocaleDateString(),
        extractContent(p.summary)
      ]
    })
    app.config.globalProperties.$manifest = res
    app.mount('#app')
  })

//
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light',
})
