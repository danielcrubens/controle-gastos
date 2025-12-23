export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
    app: {
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/icon?family=Material+Icons",
        },
      ],
    },
  },
   modules: ['@nuxtjs/tailwindcss', "@nuxtjs/google-fonts"],
 googleFonts: {
    base64: true,
    overwriting: true,
    families: {
      'Inter': [300,400,500,700],
    }
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