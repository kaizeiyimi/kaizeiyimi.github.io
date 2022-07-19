<script setup>
import { onMounted, ref } from 'vue'
import { parse } from '../api'

defineProps({
  msg: String
})
const post = ref(null)

onMounted(() => {
  fetch('/blog/posts/2016-05-26-break-swift-init-rule.md')
    .then(res => res.text())
    .then(text => post.value = parse(text))
})

</script>

<template>
  <div v-if="post != null">
    <div v-html="post.content"></div>
  </div>
</template>

<style scoped>

</style>
