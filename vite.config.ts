import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({registerType:'prompt', includeAssets:['hayati-stamp.png','apple-touch-icon.png'], manifest:{name:'Nota Hayati - Buku Nota Ibu',short_name:'Nota Hayati',description:'Buat dan cetak nota Hayati Cake and Bakery',lang:'id',theme_color:'#164d3d',background_color:'#f8f9f5',display:'standalone',start_url:'./',scope:'./',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,png,svg,woff2}'],maximumFileSizeToCacheInBytes:4000000}})],
})
