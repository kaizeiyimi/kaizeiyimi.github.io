<script setup>
import { getCurrentInstance, ref, computed } from 'vue'
import { parse } from '@/utils/utils.js'
import PostList from '@/components/PostList.vue'
import searchIcon from '@/assets/search.png'

const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const desc = parse('通过`标题`, `标签`, `日期`, `预览`搜索:', '/').content
const key = ref('')
const posts = computed(() => {
  if (!key.value) return []
  return manifest.posts.filter(p => {
    return p.searchable.findIndex(text => {
      return text.toLowerCase().search(key.value.toLowerCase()) > -1
    }) > -1
  })
})
</script>

<template>
<div class="search">
  <div class="markdown" v-html="desc"></div>
  <div class="input-box">
    <span class="icon"></span> 
  <input class="input" v-model="key" placeholder="关键字">
  </div>
  <PostList :posts="posts"></PostList>
</div>
</template>

<style scoped>
.search {
  margin: 20px;
}
.input-box {
  display: flex;
  align-items: center;
  margin: 16px 0 12px;
  gap: 8px;
}
.icon {
  box-sizing: border-box;
  display: inline-block;
  width: 24px;
  height: 24px;
  padding: px;
  background-image: url(@/assets/search.png);
  background-size: cover;
  background-color: var(--color-primary);
  border-radius: 12px;
}
.input {
  height: 24px;
  width: 228px;
  border-radius: 12px;
  border-style: none;
  padding: 0 12px;
  background-color: var(--bg-color-input);
}

</style>
