export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
     app: {
    head: {
     title: 'Controle de gastos',
      htmlAttrs: {
        lang: 'pt-BR',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'description', content: 'DER - Departamento de Estradas de Rodagem' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/icon?family=Material+Icons",
        },
      ],
    },
  }, 

   modules: ['@nuxtjs/tailwindcss', "@nuxtjs/google-fonts", 'nuxt-gtag'],

 googleFonts: {
    base64: true,
    overwriting: true,
    families: {
      'Inter': [300,400,500,700],
    }
  },

   gtag: {
    id: process.env.GTAG_ID
  },

   runtimeConfig: {
    notionClientId: process.env.NOTION_CLIENT_ID,
    notionClientSecret: process.env.NOTION_CLIENT_SECRET,
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL,
    sessionSecret: process.env.SESSION_SECRET,
    
    public: {
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    }
  },
})