<template>
  <div class="w-full h-full flex flex-col justify-center items-center  bg-[#191919]" >
   <h1 class="font-bold xl:text-4xl text-2xl text-white">
      {{ props.title }}
    </h1>
    <p class="text-white font-medium text-center xl:text-4xl mt-3">
      {{ props.description }}
    
    </p>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  title: string
  description: string
  siteName: string
}>()
</script>