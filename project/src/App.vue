<script setup>
import { onMounted, ref } from 'vue'
import Summary from './components/Summary.vue'
import Post from './components/Post.vue'

const posts = ref([])
onMounted(() => {
  fetch(('/blog/' + '/manifest.json').replaceAll('//', '/'))
    .then(res => res.json())
    .then(res => posts.value = res)
})
</script>

<template>
  <div>
    <el-button type="primary">导航</el-button>
  </div>
  <ul>
    <li v-for="post in posts">
      <Summary :html="post.summary"></Summary>
    </li>
  </ul>
</template>

<style scoped>
</style>
