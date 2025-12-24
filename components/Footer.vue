<template>
  <footer class="flex flex-col sm:flex-row justify-center items-center sm:items-baseline gap-2 pb-3 text-zinc-300 text-center sm:text-left">
    <small class="cursor-pointer" @click="showPrivacyModal = true">Política de privacidade</small>
    <span class="hidden sm:inline">|</span>
    <small>&copy; {{ current_year }} &nbsp;Desenvolvido por <a href="https://danielcrubens.dev" rel="noopener" target="_blank"> danielcrubens </a></small>
  </footer>
  <Privacy :show="showPrivacyModal" @close="showPrivacyModal = false" />
</template>

<script setup>
const showPrivacyModal = ref(false);
const current_year = new Date().getFullYear();
</script>
