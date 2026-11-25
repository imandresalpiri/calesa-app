// Las tarjetas de Configuración › Empresa › Datos (docs/GLOSARIO.md › Tarjeta de ajustes): qué campos edita el modal de cada una y cómo se
// arma lo que guarda. Reglas puras, sin I/O: lo escrito en el modal se compara con lo guardado y sólo viaja lo que cambió, así cada modal
// guarda lo suyo con la misma versión de la fila (`empresa_guardar_ajustes()` no toca las claves ausentes).
import type { AjustesEmpresa } from './ajustes-empresa'

// El orden es el del DOM: lo que más se mira va primero.
export const TARJETAS_DE_LA_EMPRESA = [
  'identidad',
  'region',
  'datos-legales',
  'politicas',
  'iconos',
] as const

export type TarjetaDeLaEmpresa = (typeof TARJETAS_DE_LA_EMPRESA)[number]

// Las que se editan con campos de ajustes. Íconos tiene su propio modal (se dibujan desde el logo guardado). `moneda-base` no es una tarjeta de
// Datos: es la de arriba de Monedas y tipos de cambio, que guarda lo mismo (la fila de ajustes, su versión y su RPC).
export type TarjetaConCampos = Exclude<TarjetaDeLaEmpresa, 'iconos'> | 'moneda-base'

// El `?panel=` de cada tarjeta: su nombre.
export const PANEL_DE_LA_TARJETA: Record<TarjetaDeLaEmpresa, TarjetaDeLaEmpresa> = {
  identidad: 'identidad',
  region: 'region',
  'datos-legales': 'datos-legales',
  politicas: 'politicas',
  iconos: 'iconos',
}

export function tarjetaDelPanel(panel: string | null): TarjetaDeLaEmpresa | null {
  return TARJETAS_DE_LA_EMPRESA.find((tarjeta) => tarjeta === panel) ?? null
}

export const CAMPOS_DE_LA_TARJETA = {
  identidad: ['nombre', 'colorAcento'],
  region: ['pais', 'locale', 'telefonoCc', 'zonaHoraria'],
  'moneda-base': ['monedaBase'],
  'datos-legales': ['razonSocial', 'nit', 'direccion', 'ciudad', 'telefono', 'whatsapp', 'email'],
  politicas: [
    'registroAbierto',
    'papeleraDias',
    'actividadDias',
    'limpiezaAutomatica',
    'limpiezaDiasGracia',
  ],
} as const satisfies Record<TarjetaConCampos, readonly string[]>

export type CampoDeLaTarjeta = (typeof CAMPOS_DE_LA_TARJETA)[TarjetaConCampos][number]

// Lo escrito en un modal: los textos como se tipean (también los números) y los interruptores como booleanos.
export type Escrito = Partial<Record<CampoDeLaTarjeta, string | boolean>>

// Lo que viaja a guardar: sólo lo que cambió, con los números ya convertidos. Un texto vacío es «sin dato» (el esquema lo normaliza).
export type CambiosDeLaTarjeta = {
  nombre?: string
  colorAcento?: string
  pais?: string
  locale?: string
  telefonoCc?: string
  zonaHoraria?: string
  monedaBase?: string
  razonSocial?: string
  nit?: string
  direccion?: string
  ciudad?: string
  telefono?: string
  whatsapp?: string
  email?: string
  registroAbierto?: boolean
  papeleraDias?: number
  actividadDias?: number
  limpiezaAutomatica?: boolean
  limpiezaDiasGracia?: number
}

const BOOLEANOS = ['registroAbierto', 'limpiezaAutomatica'] as const
const NUMEROS = ['papeleraDias', 'actividadDias', 'limpiezaDiasGracia'] as const

function guardado(ajustes: AjustesEmpresa, campo: CampoDeLaTarjeta): string | boolean {
  const valor = ajustes[campo]
  return typeof valor === 'boolean' ? valor : String(valor ?? '')
}

// Lo que cada campo de la tarjeta dice hoy: lo que el modal muestra al abrir.
export function borradorDeLaTarjeta(tarjeta: TarjetaConCampos, ajustes: AjustesEmpresa): Escrito {
  return Object.fromEntries(
    CAMPOS_DE_LA_TARJETA[tarjeta].map((campo) => [campo, guardado(ajustes, campo)]),
  )
}

const esNumero = (campo: CampoDeLaTarjeta): campo is (typeof NUMEROS)[number] =>
  NUMEROS.some((numero) => numero === campo)

const esBooleano = (campo: CampoDeLaTarjeta): campo is (typeof BOOLEANOS)[number] =>
  BOOLEANOS.some((booleano) => booleano === campo)

// Un número tipeado en blanco no es 0: es «escribe un número» (el esquema lo dice con su motivo).
const comoNumero = (texto: string) => (texto.trim() === '' ? Number.NaN : Number(texto))

// Lo distinto entre lo escrito y lo guardado, o `null` si no cambió nada (guardar sólo cierra). La moneda base nunca viaja con datos
// cargados: el campo está apagado y la base la rechazaría.
export function cambiosDeLaTarjeta(
  tarjeta: TarjetaConCampos,
  ajustes: AjustesEmpresa,
  escrito: Escrito,
  { conDatosCargados }: { conDatosCargados: boolean },
): CambiosDeLaTarjeta | null {
  const cambios: Record<string, string | number | boolean> = {}
  for (const campo of CAMPOS_DE_LA_TARJETA[tarjeta]) {
    const nuevo = escrito[campo]
    if (nuevo === undefined || (campo === 'monedaBase' && conDatosCargados)) {
      continue
    }
    const actual = guardado(ajustes, campo)
    if (esBooleano(campo) ? nuevo !== actual : String(nuevo).trim() !== String(actual).trim()) {
      cambios[campo] = esNumero(campo) ? comoNumero(String(nuevo)) : nuevo
    }
  }
  return Object.keys(cambios).length === 0 ? null : (cambios as CambiosDeLaTarjeta)
}
