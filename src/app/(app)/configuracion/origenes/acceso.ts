import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { rutaDeParteDelOrigen, type ParteDelOrigen } from '@/shared/lib/rutas'
import { PESTANAS_DEL_ORIGEN } from './pestanas'

// Quién abre Configuración › Orígenes y la página de cada origen. `origenes.gestionar` edita sus datos, campos y categorías; quien
// configura lo que cuelga de un origen (su flujo, su fórmula, los catálogos de su logística) necesita ver cómo está armado, y lo ve deshabilitado,
// con el motivo. La lista de orígenes y la página de uno se abren con cualquiera de los cuatro **en ese origen**; cada pestaña pide además el suyo.
// La base vuelve a exigir lo suyo en cada RPC y policy (`origenes_resumen()` acepta los cuatro): esto sólo decide qué se dibuja y adónde se redirige.
export const PERMISOS_DE_ORIGENES = [
  'origenes.gestionar',
  'flujos.configurar',
  'cotizaciones.configurar',
  'logistica.catalogos.gestionar',
] as const satisfies readonly ClavePermiso[]

// La puesta en marcha de un origen nuevo (Campos, Flujo, Fórmula, Tarjeta y Publicar) no tiene nada de los catálogos de logística: se abre con los tres
// de siempre.
export const PERMISOS_DE_LA_PUESTA_EN_MARCHA = [
  'origenes.gestionar',
  'flujos.configurar',
  'cotizaciones.configurar',
] as const satisfies readonly ClavePermiso[]

export function puedeAbrirLaPuestaEnMarcha(permisos: Permisos, origenId: string): boolean {
  return PERMISOS_DE_LA_PUESTA_EN_MARCHA.some((clave) => puede(permisos, clave, origenId))
}

// En algún origen: la sección del menú y del inicio.
export function puedeAbrirOrigenes(permisos: Permisos): boolean {
  return PERMISOS_DE_ORIGENES.some((clave) => puede(permisos, clave))
}

// En este origen: la lista lo muestra, el menú lo nombra y su página se abre.
export function puedeAbrirElOrigen(permisos: Permisos, origenId: string): boolean {
  return PERMISOS_DE_ORIGENES.some((clave) => puede(permisos, clave, origenId))
}

export type PestanaAbierta = {
  clave: ParteDelOrigen
  titulo: string
  ruta: string
  // Con motivo, la pestaña va apagada: la persona no la abre en este origen.
  motivo?: string
}

// Las seis pestañas de un origen para esta persona, en su orden, con su ruta y, la que no puede abrir, su motivo. Campos y Categorías se
// abren siempre que se abre el origen (en sólo lectura sin `origenes.gestionar`).
export function pestanasDelOrigen(permisos: Permisos, origenId: string): PestanaAbierta[] {
  return PESTANAS_DEL_ORIGEN.map((pestana) => {
    const abre =
      pestana.permisos === null ||
      pestana.permisos.some((clave) => puede(permisos, clave, origenId))
    return {
      clave: pestana.clave,
      titulo: pestana.titulo,
      ruta: rutaDeParteDelOrigen(origenId, pestana.clave),
      ...(abre || pestana.motivo === null ? {} : { motivo: pestana.motivo }),
    }
  })
}

export function puedeAbrirLaPestana(
  permisos: Permisos,
  origenId: string,
  parte: ParteDelOrigen,
): boolean {
  return pestanasDelOrigen(permisos, origenId).some(
    (pestana) => pestana.clave === parte && pestana.motivo === undefined,
  )
}

// La primera pestaña que la persona abre en este origen (Fases con `flujos.configurar` o los catálogos de logística; si abre el origen, al menos Campos).
export function primeraPestanaAbierta(permisos: Permisos, origenId: string): PestanaAbierta | null {
  if (!puedeAbrirElOrigen(permisos, origenId)) {
    return null
  }
  return pestanasDelOrigen(permisos, origenId).find((pestana) => !pestana.motivo) ?? null
}
