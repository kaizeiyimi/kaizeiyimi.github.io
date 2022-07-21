<script setup>
const props = defineProps({
  html: String
})
</script>

<template>
  <div class="markdown" v-html="html"></div>
</template>

<style scoped>

</style>
