import type { NextConfig } from 'next'

import { leerEntornoPublico } from './src/shared/config/entorno'
import {
  esquemaPublico,
  mensajeDeProblemas,
  problemasDe,
  validaLaCompilacion,
} from './src/shared/config/esquemas'

// Un id en una ruta de `redirects()` (la sintaxis de path-to-regexp).
const ID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

const nextConfig: NextConfig = {
  cacheComponents: true,
  typedRoutes: true,
  distDir: process.env['NEXT_DIST_DIR'] ?? '.next',
  // Con Cache Components, los proyectos nuevos activan también Partial Prefetching (lo pide Next 16.4).
  partialPrefetching: true,
  experimental: { typedEnv: true },
  // El servidor de desarrollo imprime cada Server Action con sus argumentos: la clave temporal del
  // portal (y cualquier dato que viaje en una action) quedaría en la terminal. No hay forma de
  // silenciar una sola (docs/DECISIONES.md, 2026-10-15).
  logging: { serverFunctions: false },
  // Las fuentes del PDF de una cotización (4.18-3a): react-pdf las lee del disco por su ruta, y el trazado de archivos no las ve en un import.
  outputFileTracingIncludes: {
    '/cotizaciones/[id]/pdf': ['./src/modules/cotizaciones/infra/tarjeta/pdf/fuentes/*'],
    // La imagen de la tarjeta: `ImageResponse` lee las mismas fuentes de la tarjeta del disco.
    '/cotizaciones/[id]/imagen': ['./src/modules/cotizaciones/infra/tarjeta/pdf/fuentes/*'],
    // La fuente de la imagen de los tipos de cambio para compartir: se lee del disco por su ruta.
    '/tipos-de-cambio/imagen': ['./src/modules/empresa/infra/compartir/fuentes/*.ttf'],
  },
  // Tailwind 4 con Turbopack: sin esta regla nadie procesa `@import 'tailwindcss'` (no hay PostCSS).
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  images: {
    formats: ['image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // Las URL fijas de la vieja Configuración › Cotización y › Logística van a la página del origen y a Catálogos, con su consulta. Aquí y no en un
  // `page.tsx`: una página que sólo redirige pide su `loading.tsx` y la redirección es del navegador. `general` va antes que `:origen`, y
  // `:origen` es un uuid de un solo segmento. Las que dependen de la consulta o de la persona son `route.ts`.
  // `/configuracion` solo no dibuja nada: el inicio vive en `/configuracion/inicio` (308, con su consulta). `/configuracion/inicio` no choca con
  // ninguna sección: ninguna se llama «inicio». La ruta vieja de la imagen de la tarjeta va a la de hoy con su consulta (308: un enlace o una
  // caché del navegador que la nombre sigue andando).
  redirects() {
    return Promise.resolve([
      { source: '/configuracion', destination: '/configuracion/inicio', permanent: true },
      // «Nuevo origen» era un panel de la lista (`?panel=nuevo`): ahora es la página del primer paso de la puesta en marcha (308, con su consulta).
      {
        source: '/configuracion/origenes',
        has: [{ type: 'query', key: 'panel', value: 'nuevo' }],
        destination: '/configuracion/origenes/nuevo',
        permanent: true,
      },
      // Las páginas de Configuración › Cotización y Logística que se mudaron a la página de cada origen y a Catálogos (308, con su
      // consulta). Las raíces (`/configuracion/cotizacion`, `/flujos`, `/logistica`) dependen de la consulta o del permiso: son `route.ts`.
      {
        source: '/cotizaciones/:id/portada',
        destination: '/cotizaciones/:id/imagen',
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general',
        destination: '/configuracion/catalogos/colores',
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general/:parte(colores|niveles|vigencia)',
        destination: '/configuracion/catalogos/:parte',
        permanent: true,
      },
      {
        source: `/configuracion/cotizacion/:origen(${ID})/formula`,
        destination: '/configuracion/origenes/:origen/planilla',
        permanent: true,
      },
      {
        source: `/configuracion/cotizacion/:origen(${ID})/hoja`,
        destination: '/configuracion/origenes/:origen/hoja',
        permanent: true,
      },
      {
        source: `/configuracion/cotizacion/:origen(${ID})/tarjeta`,
        destination: '/configuracion/origenes/:origen/tarjeta',
        permanent: true,
      },
      {
        source: `/configuracion/cotizacion/:origen(${ID})/tablas`,
        destination: '/configuracion/origenes/:origen/planilla?panel=tablas',
        permanent: true,
      },
      {
        source: `/configuracion/cotizacion/:origen(${ID})`,
        destination: '/configuracion/origenes/:origen/planilla',
        permanent: true,
      },
      {
        source: '/configuracion/logistica/:catalogo(puertos|navieras|categorias-de-gasto)',
        destination: '/configuracion/catalogos/:catalogo',
        permanent: true,
      },
    ])
  },
  headers() {
    return Promise.resolve([
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ])
  },
}

// El build cae si falta una variable pública: quedaría incrustada vacía en el JS del navegador (docs/ENTORNOS.md). Sólo al compilar:
// el desarrollo y `next typegen` (pnpm typecheck, que llega con la misma fase que el build) también leen este archivo y no las necesitan.
export default function configuracion(fase: string): NextConfig {
  if (validaLaCompilacion(fase, process.argv)) {
    const problemas = problemasDe(esquemaPublico, leerEntornoPublico())
    if (problemas.length > 0)
      throw new Error(mensajeDeProblemas('la compilación (públicas)', problemas))
  }
  return nextConfig
}
