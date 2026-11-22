import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { CATALOGOS_DE_LOGISTICA } from './catalogos-de-logistica'

// Las pestañas de Logística › Configuración: una por catálogo que llena un área de logística (Puertos, Navieras, Categorías de gasto) y Tipos de documento, los de toda la
// empresa. Cada una es una sub-ruta (`/logistica/configuracion/<clave>`) con su permiso: los catálogos con `logistica.catalogos.gestionar` y los tipos de documento, que quien
// configura un flujo o los repuestos sigue leyendo, con cualquiera de los tres. Los permisos se miran en algún origen: son catálogos de la empresa. La base vuelve a exigir lo suyo.
export type PestanaDeLaConfiguracion = {
  clave: string
  titulo: string
  ruta: string
  permisos: readonly ClavePermiso[]
}

export const CLAVE_DE_TIPOS_DE_DOCUMENTO = 'tipos-de-documento'

// Los permisos con que se abre la pestaña de los tipos de documento: cambiarlos (`logistica.catalogos.gestionar`) o leerlos (los de un flujo o de repuestos los usan).
export const PERMISOS_DE_TIPOS_DE_DOCUMENTO = [
  'logistica.catalogos.gestionar',
  'flujos.configurar',
  'repuestos.configurar',
] as const satisfies readonly ClavePermiso[]

export const PESTANAS_DE_LA_CONFIGURACION: readonly PestanaDeLaConfiguracion[] = [
  ...CATALOGOS_DE_LOGISTICA.map((catalogo): PestanaDeLaConfiguracion => ({
    clave: catalogo.clave,
    titulo: catalogo.titulo,
    ruta: `${RUTAS.configuracionDeLogistica}/${catalogo.clave}`,
    permisos: [catalogo.permiso],
  })),
  {
    clave: CLAVE_DE_TIPOS_DE_DOCUMENTO,
    titulo: 'Tipos de documento',
    ruta: RUTAS.tiposDeDocumento,
    permisos: PERMISOS_DE_TIPOS_DE_DOCUMENTO,
  },
]

export const MOTIVO_SIN_PERMISO = 'Pídelo a quien gestiona los catálogos de logística.'

export function pestanaDeLaConfiguracion(clave: string): PestanaDeLaConfiguracion | null {
  return PESTANAS_DE_LA_CONFIGURACION.find((pestana) => pestana.clave === clave) ?? null
}

export function puedeAbrirLaPestana(
  pestana: PestanaDeLaConfiguracion,
  permisos: Permisos,
): boolean {
  return pestana.permisos.some((clave) => puede(permisos, clave))
}

// La ruta de la primera pestaña que la persona puede abrir (adonde va `/logistica/configuracion`); null si no abre ninguna.
export function primeraPestanaAbierta(
  permisos: Permisos,
  pestanas: readonly PestanaDeLaConfiguracion[] = PESTANAS_DE_LA_CONFIGURACION,
): string | null {
  return pestanas.find((pestana) => puedeAbrirLaPestana(pestana, permisos))?.ruta ?? null
}

// Lo que la tira dibuja: todas las pestañas, y las que la persona no puede abrir apagadas con su motivo (nunca desaparecen en silencio).
export function pestanasParaLaPersona(
  permisos: Permisos,
  pestanas: readonly PestanaDeLaConfiguracion[] = PESTANAS_DE_LA_CONFIGURACION,
): { clave: string; titulo: string; ruta: string; motivo?: string }[] {
  return pestanas.map(({ clave, titulo, ruta, permisos: requeridos }) => ({
    clave,
    titulo,
    ruta,
    ...(requeridos.some((permiso) => puede(permisos, permiso))
      ? {}
      : { motivo: MOTIVO_SIN_PERMISO }),
  }))
}
