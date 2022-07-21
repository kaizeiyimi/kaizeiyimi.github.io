<script setup>
import { onMounted, ref } from 'vue'
import parse from '../api/parse'

const props = defineProps({
  url: String
})
const post = ref(null)

onMounted(() => {
  fetch(props.url)
    .then(res => res.text())
    .then(text => post.value = parse(text, props.url.split('/').slice(0, -1).join('/')))
})
</script>

<template>
  <div class="markdown" v-html="(post || {}).content"></div>
</template>

<style scoped>

</style>
