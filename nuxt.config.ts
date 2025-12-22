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
   
})