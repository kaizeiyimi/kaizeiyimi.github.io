<script setup>
import { getCurrentInstance } from 'vue'
import PostList from '@/components/PostList.vue'

const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
</script>

<template>
<div class="home">
  <PostList :posts="manifest.posts"></PostList>
</div>
</template>

<style scoped>
.home {
  margin: 20px;
}
</style>
