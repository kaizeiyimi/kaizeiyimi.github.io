<script setup>
import { useRouter } from 'vue-router'
import { tagColor } from '@/utils/utils.js'

const props = defineProps({
  tag: String,
  autoRoute: {
    type: Boolean,
    default: true
  }
})
const router = useRouter()
</script>

<template>
<span class="tag" 
  @click="autoRoute ? router.push({name: 'tags', params: {tag}}) : undefined" 
  :style="`background-color: ${tagColor(tag)}`">
    {{tag}}
</span>
</template>

<style scoped>
.tag {
  display: inline-block;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 4px;
  color: white;
  opacity: 0.9;
  cursor: pointer;
}
.tag:hover {
  opacity: 1;
  transition: 0.15s;
}
</style>
