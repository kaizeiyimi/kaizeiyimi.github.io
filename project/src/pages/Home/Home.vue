<script setup>
import { getCurrentInstance } from 'vue'
const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
</script>

<template>
<div class="home">
  <ul>
    <li v-for="post in manifest.posts">
      <div v-html="post.summary"></div>
    </li>
  </ul>
</div>
</template>

<style scoped>

</style>
