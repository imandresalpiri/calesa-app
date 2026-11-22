import { RUTAS } from '@/shared/lib/rutas'

// Las pestañas de Repuestos › Configuración, en el orden en que se dibujan: el flujo de los ítems, el cotizador y los catálogos. Cada una es una sub-ruta
// (`/repuestos/configuracion/<clave>`) y todas se abren con `repuestos.configurar`: cada página comprueba la clave, porque un layout no protege a su página.
// La base vuelve a exigirla en cada escritura. No hay pestañas apagadas: sin la clave, ninguna se abre y la página lo dice.
export type PestanaDeLaConfiguracion = { clave: string; titulo: string; ruta: string }

export const PESTANAS_DE_LA_CONFIGURACION: readonly PestanaDeLaConfiguracion[] = [
  { clave: 'flujo', titulo: 'Flujo', ruta: RUTAS.flujoDeRepuestos },
  { clave: 'cotizador', titulo: 'Cotizador', ruta: RUTAS.cotizadorDeRepuestos },
  { clave: 'catalogos', titulo: 'Catálogos', ruta: RUTAS.catalogosDeRepuestos },
]
