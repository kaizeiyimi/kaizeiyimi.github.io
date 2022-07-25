import { createApp } from 'vue'
import { useDark } from '@vueuse/core'
import { createRouter, createWebHashHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'normalize.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'highlight.js/styles/atom-one-dark.css'
import './style.css'
import App from './App.vue'

// router
import Home from './pages/Home.vue'
import About from './pages/About.vue'
import Post from './pages/Post.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/posts/:name', component: Post },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// create app
const app = createApp(App)
app
  .use(router)
  .use(ElementPlus)
  
fetch(('/blog/' + '/manifest.json').replaceAll('//', '/'))
  .then(res => res.json())
  .then(res => {
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
