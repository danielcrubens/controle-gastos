<template>
  <footer class="flex justify-center align-baseline gap-2 pb-3 text-zinc-300">
    <small class="cursor-pointer" @click="showPrivacyModal = true">Política de privacidade</small> |
    <small>&copy; {{ current_year }} &nbsp;Desenvolvido por <a href="https://danielcrubens.dev" rel="noopener" target="_blank"> danielcrubens </a></small>
  </footer>
  <Privacy :show="showPrivacyModal" @close="showPrivacyModal = false" />
</template>

<script setup>
const showPrivacyModal = ref(false);
const current_year = new Date().getFullYear();
</script>
