<script setup>
import Post from './Post.vue'

defineProps({
  posts: [Object]
})
</script>

<template>
<div class="post-list">
  <Post v-for="post in posts" card :post="post" :html="post.summary" />
</div>
</template>

<style scoped>
.post {
  background-color: var(--bg-color-card);
  padding: 20px;
  margin: 20px 0;
  border-radius: 16px;
}
</style>
