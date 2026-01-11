<template>
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="closeModal"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      <div
        class="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
      >
        <div
          class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
        >
          <h2 class="text-2xl font-bold text-[#191919]">
            Política de Privacidade e Uso de Cookies
          </h2>
        </div>

        <div class="px-6 py-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div class="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h3 class="">
                1. Introdução
              </h3>
              <p>
                Bem-vindo ao Controle de Gastos por Voz. Esta política descreve
                de forma transparente como funciona nossa aplicação e quais
                informações são necessárias para conectar seu Notion ao bot do
                Telegram.
              </p>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                2. Informações que Coletamos
              </h3>
              <p class="mb-3">
                Nossa aplicação coleta apenas as informações mínimas necessárias
                para funcionar:
              </p>
              <ul class="list-disc pl-6 space-y-2">
                <li>
                  <strong>Token de Acesso do Notion:</strong> Usado
                  temporariamente durante a autenticação OAuth
                </li>
                <li>
                  <strong>ID do Banco de Dados:</strong> Identificador da
                  database Notion que você escolhe conectar
                </li>
                <li>
                  <strong>Código de Conexão:</strong> Gerado automaticamente
                  para vincular Telegram ao Notion
                </li>
                <li>
                  <strong>ID do Telegram:</strong> Necessário para identificar
                  quem enviou o áudio
                </li>
              </ul>
              <div
                class="mt-3 p-3 bg-green-50 border-l-4 border-green-500 rounded"
              >
                <p class="text-sm text-green-900">
                  <strong>✓ Importante:</strong> Não acessamos, lemos ou
                  armazenamos o conteúdo dos seus bancos de dados Notion. Apenas
                  obtemos o ID necessário para estabelecer a conexão.
                </p>
              </div>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                3. Como Funcionamos (Arquitetura)
              </h3>
              <p class="mb-2">
                O fluxo da aplicação é completamente transparente:
              </p>
              <ol class="list-decimal pl-6 space-y-2">
                <li>Você autoriza a conexão com Notion via OAuth 2.0</li>
                <li>
                  As credenciais são enviadas diretamente para o webhook n8n
                  (nosso processador de automação)
                </li>
                <li>O bot Telegram recebe seus áudios e os processa via IA</li>
                <li>As despesas são salvas diretamente no SEU Notion</li>
              </ol>
              <div
                class="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded"
              >
                <p class="text-sm text-blue-900">
                  <strong>🔒 Segurança:</strong> Não possuímos banco de dados
                  próprio. Todas as informações trafegam de forma criptografada
                  (HTTPS) e não são armazenadas em nossos servidores.
                </p>
              </div>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                4. Uso dos Dados
              </h3>
              <p class="mb-2">
                As informações coletadas são usadas exclusivamente para:
              </p>
              <ul class="list-disc pl-6 space-y-2">
                <li>Estabelecer e manter a conexão entre Telegram e Notion</li>
                <li>Processar e transcrever suas mensagens de áudio via IA</li>
                <li>
                  Extrair informações de despesas (valor, categoria, data e
                  descrição)
                </li>
                <li>Salvar automaticamente no seu workspace Notion</li>
              </ul>
            </section>

            <section>
              <h3 class="text-lg font-bold text-[#191919] mb-3">
                5. Armazenamento (ou melhor, a falta dele)
              </h3>
              <p class="mb-2">
                <strong>Não armazenamos seus dados.</strong> Veja como funciona:
              </p>
              <ul class="list-disc pl-6 space-y-2">
                <li>
                  <strong>Sessão temporária:</strong> Dados mantidos apenas
                  durante a autenticação OAuth
                </li>
                <li>
                  <strong>Sem banco de dados:</strong> A aplicação não possui
                  storage permanente
                </li>
                <li>
                  <strong>Áudios descartados:</strong> Processados e excluídos
                  imediatamente após transcrição
                </li>
                <li>
                  <strong>Dados no SEU Notion:</strong> Suas despesas ficam
                  apenas no seu workspace
                </li>
              </ul>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                6. Compartilhamento de Informações
              </h3>
              <p class="mb-2">As informações são transmitidas apenas para:</p>
              <ul class="list-disc pl-6 space-y-2">
                <li>
                  <strong>Webhook n8n:</strong> Para processar a automação entre
                  Telegram e Notion
                </li>
                <li>
                  <strong>API do Notion:</strong> Para autenticação e gravação
                  de despesas
                </li>
                <li>
                  <strong>API do Telegram:</strong> Para receber mensagens de
                  áudio
                </li>
                <li>
                  <strong>Serviços de IA:</strong> Para transcrição de áudio e
                  extração de dados
                </li>
              </ul>
              <p class="mt-3">
                <strong
                  >Não vendemos, alugamos ou compartilhamos suas informações com
                  terceiros</strong
                >
                além dos serviços técnicos necessários listados acima.
              </p>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                7. Segurança
              </h3>
              <ul class="list-disc pl-6 space-y-2">
                <li>Todas as comunicações usam <strong>HTTPS/SSL</strong></li>
                <li>
                  Credenciais sensíveis armazenadas em
                  <strong>variáveis de ambiente</strong>
                </li>
                <li>
                  Seguimos as práticas do <strong>protocolo OAuth 2.0</strong>
                </li>
                <li>Nenhum dado financeiro armazenado em nossos servidores</li>
              </ul>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                8. Seus Direitos
              </h3>
              <p class="mb-2">Você tem total controle:</p>
              <ul class="list-disc pl-6 space-y-2">
                <li>
                  Revogar o acesso nas configurações do Notion a qualquer
                  momento
                </li>
                <li>Desconectar a integração quando desejar</li>
                <li>Solicitar informações sobre o processamento de dados</li>
                <li>Seus dados no Notion continuam sendo 100% seus</li>
              </ul>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                9. Cookies
              </h3>
              <p>
                Utilizamos apenas cookies de sessão essenciais durante o
                processo de autenticação OAuth.
                <strong
                  >Não usamos cookies de rastreamento ou publicidade.</strong
                >
              </p>
            </section>

            <section>
              <h3 class="text-lg font-semibold text-[#191919] mb-3">
                10. Contato
              </h3>
              <p>
                Se você tiver dúvidas sobre esta política de privacidade ou
                sobre como tratamos seus dados, entre em contato conosco pelo email:
                <a
                  href="mailto:dcr.tecnologi@gmail.com"
                  class="text-blue-600 hover:underline"
                  >dcr.tecnologi@gmail.com</a
                >
              </p>
            </section>
            <p class="text-sm text-gray-500 pb-11">
              <strong>Última atualização:</strong> Janeiro de 2026
            </p>
          </div>
        </div>

        <div class="sticky bottom-0 px-6 pt-4 pb-2 bg-white">
          <button
            @click="closeModal"
            class="w-full bg-[#191919] text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
</template>

<style scoped>
  h3{
   @apply text-lg font-semibold text-[#191919] mb-3
  }
</style>

<script setup>

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const closeModal = () => {
  emit("close");
};
</script>
