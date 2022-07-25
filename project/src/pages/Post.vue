<script setup>
import { ref, watch, getCurrentInstance } from 'vue'
import { useRoute } from 'vue-router'
const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const post = ref(null)

function reload(name) {
  const url = manifest.posts.filter(p => p.name == name)[0].url
  fetch(url)
  .then(res => res.text())
  .then(res => console.log(res))
}

const route = useRoute()
watch(() => route.params, (to) => reload(to.name))
reload(route.params.name)
</script>

<template>
  <div>Post</div>
</template>

<style scoped>

</style>
