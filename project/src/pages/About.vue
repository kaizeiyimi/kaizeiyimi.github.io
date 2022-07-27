<script setup>
import { ref, getCurrentInstance } from 'vue'
import { parse } from '@/utils/utils.js'

const html = ref(null)
const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const url = manifest.about.url
  fetch(url)
    .then(res => res.text())
    .then(text => { 
      html.value = parse(text, url.split('/').slice(0, -1).join('/')).content
    })
</script>

<template>
<div class="markdown" v-html="html"></div>
</template>

<style scoped>
.markdown {
  margin: 20px;
}
</style>
