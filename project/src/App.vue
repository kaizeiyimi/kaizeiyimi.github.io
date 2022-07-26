<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
const targets = [
  {name: "标签", link: '/tags'},
  {name: "关于", link: '/about'},
  {name: "搜索", link: '/search'}
]
const route = useRoute()
const selected = ref('/' + route.path.split('/')[1])
watch(() => route.path, () => {
  selected.value = '/' + route.path.split('/')[1]
})
</script>

<template>
<header>
  <router-link class="title" to="/">kaizei & yimi</router-link>
  <div class="desc">记录日常</div>
  <nav>
    <ul>
      <li v-for="target in targets" :highlighted="selected == target.link ? true : undefined">
        <router-link :to="target.link">{{target.name}}</router-link>
      </li>
      <li><a href="https://github.com/kaizeiyimi">Github</a></li>
    </ul>
  </nav>
</header>
<div class="content">
  <div><router-view></router-view></div>
</div>
<footer>
  <div>copyleft by kaizei 2022</div>
</footer>
</template>

<style scoped>
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background-color: var(--color-primary);
  padding: 24px 16px;
}
.title {
  font-size: 3rem;
  font-weight: 600;
  color: white;
}
.desc {
  font-size: 0.8rem;
  color: white;
}
ul {
  border-radius: 8px;
  background-color: white;
}
ul > li {
  display: inline-block;
  padding: 6px 0;
  width: 72px;
  text-align: center;
  color: var(--color-primary);
  font-weight: 500;
}
li[highlighted], li:hover {
  background-color: var(--color-primary);
  opacity: 0.68;
  transition: 0.2s;
}
li a {
  color: var(--color-primary);
}
li[highlighted] a, li:hover a {
  color: white;
}
.content {
  max-width: 960px;
  margin: 0 auto;
}
footer {
  font-family: 'Courier New', Courier, monospace;
  text-align: center;
  color: var(--text-color-muted);
  font-size: 0.8rem;
  font-weight: 600;
  margin: 24px 0;
}
</style>
