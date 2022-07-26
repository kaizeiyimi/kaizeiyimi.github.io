<script setup>
import { getCurrentInstance, ref, computed } from 'vue'
import { onBeforeRouteUpdate } from 'vue-router'
import Tag from '@/components/Tag.vue'
import PostList from '@/components/PostList.vue'

const props = defineProps({
  tag: String
})
const manifest = getCurrentInstance().appContext.config.globalProperties.$manifest
const tags = new Set()
manifest.posts.flatMap(p => p.meta.tags).forEach(tag => tags.add(tag))

const selected = ref(new Set()) 
const posts = computed(() => {
  if (selected.value.size == 0) return manifest.posts
  return manifest.posts.filter(p => p.meta.tags.findIndex(t => selected.value.has(t)) > -1)
})

function toggle(tag) {
  selected.value.has(tag) ? selected.value.delete(tag) : selected.value.add(tag)
}

if (props.tag) toggle(props.tag)
onBeforeRouteUpdate((to) => {
  selected.value.clear()
  if (to.params.tag) toggle(to.params.tag)
})
</script>

<template>
<div class="tags">
  <div class="desc">标签还比较少，可按标签过滤：</div>
  <ul class="tag-list">
    <li v-for="tag in tags" :selected="selected.has(tag) || undefined">
      <Tag :tag="tag" :autoRoute="false" @click="toggle(tag)"/>
    </li>
  </ul>
  <PostList :posts="posts"></PostList>
</div>
</template>

<style scoped>
.tags {
  margin: 20px;
}
.desc {
  margin-bottom: 20px;
}
ul.tag-list {
  display: flex;
  gap: 12px;
}
ul.tag-list li {
  position: relative;
}
ul.tag-list li[selected]::after {
  content: '✓';
  position: absolute;
  right: -4px;
  bottom: -2px;
  font-weight: bold;
  font-size: 0.8rem;
}
</style>
