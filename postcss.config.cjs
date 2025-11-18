// Use CommonJS export to ensure PostCSS (via Vite) loads this config reliably
module.exports = {
  plugins: {
    // Use tailwindcss PostCSS plugin compatible with Tailwind v3
    tailwindcss: {},
    autoprefixer: {},
  },
}
