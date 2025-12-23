<template>
  <div class="min-h-screen bg-[#191919] text-zinc-50 antialiased">
    <div class="container mx-auto px-4 py-16">
      <div class="text-center mb-16">
        <h1 class="xl:text-4xl text-2xl  flex justify-center items-center gap-1 font-bold text-zinc-100 mb-4">
          <Mic />
          Controle de Gastos por Voz
        </h1>
        <p class="xl:text-xl  text-zinc-400 max-w-2xl mx-auto">
          Registre suas despesas enviando áudios no Telegram e salve automaticamente no seu Notion. Simples, rápido e automático.
        </p>
      </div>

      <main class="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl xl:p-8 p-4">
         <div v-if="error" class="mt-4 bg-red-50 border-l-4 border-red-600 p-4">
          <p class="text-sm text-red-900 font-semibold mb-2">{{ error }}</p>
          
          <!-- Logs de debug -->
          <details v-if="debugLogs" class="mt-3">
            <summary class="cursor-pointer text-xs text-red-700 hover:text-red-900 font-medium">
              🔍 Ver logs de debug
            </summary>
            <pre class="mt-2 text-xs bg-red-100 p-3 rounded overflow-x-auto text-red-900">{{ debugLogs }}</pre>
          </details>
        </div>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <div :class="['flex-1 text-center', step >= 1 ? 'text-blue-900' : 'text-gray-400']">
              <div class="w-10 h-10 mx-auto rounded-full border-2 flex items-center justify-center mb-2"
                :class="step >= 1 ? 'border-blue-900 bg-blue-50' : 'border-gray-300'">
                <span class="font-bold">1</span>
              </div>
              <p class="text-sm font-medium">Conectar Notion</p>
            </div>

            <div class="w-16 h-1 bg-gray-300" :class="step >= 2 ? 'bg-blue-900' : ''"></div>

            <div :class="['flex-1 text-center', step >= 2 ? 'text-blue-900' : 'text-gray-400']">
              <div class="w-10 h-10 mx-auto rounded-full border-2 flex items-center justify-center mb-2"
                :class="step >= 2 ? 'border-blue-900 bg-blue-50' : 'border-gray-300'">
                <span class="font-bold">2</span>
              </div>
              <p class="text-sm font-medium">Ativar Bot</p>
            </div>
          </div>
        </div>

        <div v-if="step === 1" class="space-y-6">
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold mb-2 text-[#191919]">Conecte seu Notion</h2>
            <p class="text-gray-600">
              Precisamos de permissão para salvar suas despesas no seu workspace
            </p>
          </div>

          <div class="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
            <p class="text-sm text-blue-900 mb-2">
              💡 <strong>Importante:</strong> Você precisa ter uma database no Notion com as colunas:
              <code class="bg-white px-2 py-1 rounded">Despesa</code>,
              <code class="bg-white px-2 py-1 rounded">Categoria</code>,
              <code class="bg-white px-2 py-1 rounded">Data</code>,
              <code class="bg-white px-2 py-1 rounded">Valor</code>.
              (Não sabe como criar uma database? <a href="https://www.notion.com/pt/help/create-a-database"
                target="_blank" class="text-blue-900 hover:underline ">Clique aqui)</a>

            </p>
            <p class="text-sm text-blue-900">
            </p>
          </div>

          <button @click="connectNotion" :disabled="loading"
            class="w-full bg-[#191919] text-white py-4 rounded-lg font-normal hover:bg-gray-800 transition-colors disabled:opacity-50">
            <div class="inline-flex items-center gap-1">
              <img v-if="!loading" class="w-5 h-auto" src="@/assets/images/notion-logo.svg" alt="Notion">
              <Loader v-else class="w-4 h-4 animate-spin" />
              <span v-if="!loading">Conectar com Notion</span>
              <span v-else>Conectando...</span>
            </div>
          </button>

          <p class="text-xs text-gray-500 text-center">
            Ao conectar, você autoriza o acesso à sua database do Notion
          </p>
        </div>

        <div v-if="step === 2" class="space-y-6">
          <div class="text-center mb-1">
            <h2 class="text-2xl text-[#191919] font-bold mb-1">Notion Conectado!</h2>
            <p class="text-zinc-600">Agora ative o bot no Telegram</p>
          </div>

          <div class="bg-[#191919] text-white p-6 rounded-xl text-center">
            <p class="text-sm mb-3 opacity-90">Envie este comando no Telegram:</p>
            <div
              class="bg-white text-gray-900 px-4 py-3 rounded-lg font-mono text-lg mb-4 flex items-center justify-between">
              <span>/start {{ connectionCode }}</span>
              <button @click="copyCode" class="ml-2 text-blue-600 hover:text-blue-700">
                <Clipboard v-if="!copied" :size="19" color="#191919" />
                <CircleCheckBig v-else :size="19" color="#42b883" />
              </button>
            </div>
            <a :href="`https://t.me/${botUsername}`" target="_blank" rel="noopener"
              class="group relative inline-block text-sm font-medium text-white">
              <span
                class="absolute inset-0 translate-x-0.5 translate-y-0.5 bg-white transition-transform group-hover:translate-x-0 group-hover:translate-y-0 rounded-lg"></span>

              <span class="relative flex items-center gap-2 border border-current bg-[#191919] px-8 py-3 rounded-lg">
                <Bot :size="20" /> Abrir @{{ botUsername }}
              </span>
            </a>
          </div>

          <div class="border-t pt-6">
            <h3 class="font-semibold mr-2 mb-3 text-[#191919] flex gap-1">
              <Smartphone :size="20" /> Como usar:
            </h3>

            <ul class="space-y-2 text-gray-600">
              <li class="flex items-start">
                <span class="mr-2 text-[#191919] flex-shrink-0">
                  <ListCheck :size="20" />
                </span>
                <span>
                  Envie o comando
                  <code class="bg-gray-100 px-2 py-1 rounded">/start {{ connectionCode }}</code>
                </span>
              </li>

              <li v-for="(text, index) in stepsInstructions" :key="index" class="flex items-start">
                <span class="mr-2 text-[#191919] flex-shrink-0">
                  <ListCheck :size="20" />
                </span>
                <span>{{ text }}</span>
              </li>
            </ul>
            <h3 class="font-semibold mr-2 my-3 text-[#191919] flex gap-1">
              <Smartphone :size="20" /> Como ver o resumo mensal:
            </h3>

            <ul class="space-y-2 text-gray-600">
              <li class="flex items-start">
                <span class="mr-2 text-[#191919] flex-shrink-0">
                  <ListCheck :size="20" />
                </span>
                 <span>
                  Envie o comando
                  <code class="bg-gray-100 px-2 py-1 rounded">/resumo </code>
                </span>
              </li>
            </ul>
          </div>

          <div class="bg-blue-50 border-l-4 border-blue-600 p-4">
            <p class="text-sm text-blue-900">
              ✨ <strong>Exemplo de áudio:</strong> "Almoço hoje 45 reais" ou "Uber dia 04; 23,50 reais"
            </p>
          </div>
        </div>

        <div v-if="error" class="mt-4 bg-red-50 border-l-4 border-red-600 p-4">
          <p class="text-sm text-red-900">{{ error }}</p>
        </div>
      </main>

      <div class="features max-w-4xl mx-auto mt-9 grid md:grid-cols-3 gap-8 text-center">
        <div>
          <div class="flex justify-center mb-3">
            <Zap />
          </div>
          <h4>Rápido</h4>
          <p>Registre em segundos via áudio</p>
        </div>
        <div>
          <div class="text-4xl mb-3 flex justify-center">
            <Lock />
          </div>
          <h4>Privado</h4>
          <p>Dados salvos no seu Notion</p>
        </div>
        <div>
          <div class="flex justify-center mb-3">
            <Bot />
          </div>
          <h4>Inteligente</h4>
          <p>IA categoriza automaticamente</p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { Lock, Bot, Zap, CircleCheckBig, Clipboard, Smartphone, ListCheck, Mic, Loader } from 'lucide-vue-next';
import confetti from 'canvas-confetti';

const step = ref(1);
const loading = ref(false);
const error = ref("");
const debugLogs = ref("");
const connectionCode = ref("");
const copied = ref(false);
const botUsername = ref("danielcrubensbot");

const stepsInstructions = [
  'Grave um áudio dizendo a despesa',
  'Pronto! O bot salva automaticamente no seu Notion'
];

const connectNotion = async () => {
  loading.value = true;
  error.value = "";
  debugLogs.value = "";

  try {
    const response = await fetch('/api/notion/auth-url');
    const data = await response.json();

    if (!response.ok || !data.authUrl) {
      throw new Error('Erro ao obter URL de autenticação');
    }

    window.location.href = data.authUrl;
  } catch (err) {
    error.value = "Erro ao conectar com Notion. Tente novamente.";
    loading.value = false;
  }
};

const copyCode = () => {
  navigator.clipboard.writeText(`/start ${connectionCode.value}`);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

const launchConfetti = () => {
  confetti({
    particleCount: 170,
    spread: 80,
    origin: { y: 0.6 }
  });
};

const checkConnectionStatus = async () => {
  try {
    const response = await fetch('/api/connection-status');
    const data = await response.json();

    if (data.connectionCode) {
      connectionCode.value = data.connectionCode;
      step.value = 2;
      setTimeout(launchConfetti, 310);
    }

    if (data.error) {
      error.value = data.error;
      debugLogs.value = data.debugLogs || "";
    }
  } catch (err) {
    console.error('Erro ao verificar status:', err);
  }
};

onMounted(() => {
  checkConnectionStatus();
});
</script>

<style scoped>
.features p {
  @apply text-zinc-400 text-sm;
}

h4 {
  @apply font-medium text-zinc-300;
}
</style>