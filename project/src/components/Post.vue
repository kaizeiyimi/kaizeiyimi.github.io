<script setup>
import { onMounted } from 'vue';

const props = defineProps({
  post: Object,
  html: String,
  card: Boolean
})
const date = (new Date(props.post.meta.date)).toLocaleDateString()
function tagColor(tag) {
  let hash = Array.from(tag).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)
  let order = hash%4 + 1
  return `var(--bg-color-tag-${order})`
}
</script>

<template>
<div class="post" :card="card || undefined">
  <h1 class="title">
    <router-link :to="`/posts/${post.name}`">{{post.meta.title}}</router-link>
  </h1>
  <ul><li v-for="tag in post.meta.tags" class="tag" :style="`background-color: ${tagColor(tag)}`">{{tag}}</li></ul>
  <div class="date">{{date}}</div>
  <div class="markdown" v-html="html"></div>
</div>
</template>

<style scoped>
.title {
  font-size: 1.8rem;
  font-weight: 500;
  margin-top: 2rem;
  margin-bottom: 8px;
}
.post[card] > .title {
  margin-top: 0;
}
ul {
  display: flex;
  gap: 8px;
}
.tag {
  display: inline-block;
  background-color: var(--color-primary);
  color: white;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 4px;
}
.date {
  font-size: 0.8rem;
  font-weight: 300;
  color: var(--text-color-muted);
  margin: 12px 0 16px;
}
</style>
