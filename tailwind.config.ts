import defaultTheme from 'tailwindcss/defaultTheme'
module.exports = {
  mode: 'jit',

  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        sans: ["Inter", ...defaultTheme.fontFamily.sans]
       },
    },
  },
  plugins: [],
}