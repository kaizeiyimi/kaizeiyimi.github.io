<script setup>
import Tag from './Tag.vue'

const props = defineProps({
  post: Object,
  html: String,
  card: Boolean
})
const date = (new Date(props.post.meta.date)).toLocaleDateString()
</script>

<template>
<div class="post" :card="card || undefined">
  <h1 v-if="card" class="title">
    <router-link :to="`/posts/${post.name}`">{{post.meta.title}}</router-link>
  </h1>
  <h1 v-else class="title">{{post.meta.title}}</h1>
  <ul><li v-for="tag in post.meta.tags"><Tag :tag="tag"></Tag></li></ul>
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
