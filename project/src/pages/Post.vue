<script setup>
import { ref, watch, getCurrentInstance } from 'vue'
import { useRoute, onBeforeRouteUpdate } from 'vue-router'
import parse from '@/api/parse'
import Post from '@/components/Post.vue'

const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const post = ref(null)

function reload(name) {
  const url = manifest.posts.filter(p => p.name == name)[0].url
  fetch(url)
    .then(res => res.text())
    .then(text => { 
      post.value = parse(text, url.split('/').slice(0, -1).join('/'))
      console.log('text', text)
    })
}

onBeforeRouteUpdate((to) => {
  reload(to.params.name)
})
reload(useRoute().params.name)
</script>

<template>
<div class="post-container">
  <Post v-if="post != null" :post="post" :html="post.content"></Post>
</div>
</template>

<style scoped>
.post-container {
  margin: 20px;
}
</style>
