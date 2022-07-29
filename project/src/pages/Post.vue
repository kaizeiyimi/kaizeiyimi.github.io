<script setup>
import { ref, getCurrentInstance } from 'vue'
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router'
import { parse, request } from '@/utils/utils.js'
import Post from '@/components/Post.vue'

const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const post = ref(null)

function reload(name) {
  if (manifest.posts.findIndex(p => p.name == name) == -1) {
    router.replace({name: 'not-found'})
    return;
  }
  const url = manifest.posts.filter(p => p.name == name)[0].url
  request(url)
    .then(res => res.text())
    .then(text => post.value = parse(text, url.split('/').slice(0, -1).join('/')))
}

const router = useRouter()
onBeforeRouteUpdate((to) => reload(to.params.name))
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
