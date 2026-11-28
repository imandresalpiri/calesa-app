import 'server-only'
import path from 'node:path'

// Las fuentes de la tarjeta (el PDF y la imagen): Geist Regular y SemiBold, rectas e itálicas, en TTF, del release oficial (`vercel/geist-font` v1.9.2, OFL 1.1:
// `public/fuentes/geist/OFL.txt`; la versión y el sha256, en `docs/DECISIONES.md`). Viven en `public/fuentes/geist/`, la única copia: las lee react-pdf por su ruta,
// la imagen con `readFile` y el lienzo de un arte de PDF por URL (`FUENTE_DEL_PDF` de `artes`). `next.config.ts` las lleva al desplegar
// (`outputFileTracingIncludes`) en cada ruta que las lee del disco (`scripts/guardas/fuentes-del-pdf.test.ts` lo vigila). Sin react-pdf aquí: la imagen no lo carga.
export const FAMILIA_DE_LA_TARJETA = 'Geist'

export const CARPETA_DE_LAS_FUENTES = path.join(process.cwd(), 'public/fuentes/geist')

// Las cuatro variantes: el peso (400 o 600) y si es itálica.
export const VARIANTES_DE_LAS_FUENTES = [
  { archivo: 'Geist-Regular.ttf', peso: 400, italica: false },
  { archivo: 'Geist-SemiBold.ttf', peso: 600, italica: false },
  { archivo: 'Geist-Italic.ttf', peso: 400, italica: true },
  { archivo: 'Geist-SemiBoldItalic.ttf', peso: 600, italica: true },
] as const
