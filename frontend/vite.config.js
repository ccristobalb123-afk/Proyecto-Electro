import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Color de la barra del celular (theme-color) y del manifest: es --ink de
// tokens.css, la única fuente. Reemplaza __COLOR_TEMA__ en index.html y en
// manifest.webmanifest (que vive fuera de public/ porque Vite copia public/
// sin procesar).
function colorDeTema() {
  const leer = (archivo) => readFileSync(new URL(archivo, import.meta.url), 'utf8')
  const color = () => {
    const encontrado = /--ink:\s*(#[0-9a-fA-F]{6})\s*;/.exec(leer('./src/styles/tokens.css'))
    if (!encontrado) throw new Error('No se encontró --ink en src/styles/tokens.css')
    return encontrado[1]
  }
  const manifest = () => leer('./manifest.webmanifest').replaceAll('__COLOR_TEMA__', color())
  return {
    name: 'color-de-tema',
    transformIndexHtml: (html) => html.replaceAll('__COLOR_TEMA__', color()),
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), colorDeTema()],
})
