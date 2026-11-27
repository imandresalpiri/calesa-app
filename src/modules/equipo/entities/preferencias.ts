// Preferencias de interfaz de la persona (`preferencias_usuario`: una fila por clave, valor jsonb).
// Privadas: sólo las lee y las escribe su dueña.
import { z } from 'zod'
import {
  CLAVE_DE_PREFERENCIA_POR_PAGINA,
  esTamanoDePagina,
  type TamanoDePagina,
} from '@/shared/lib/paginacion'
import { VISTAS_DE_LISTA, type VistaDeLista } from '@/shared/lib/vista-de-lista'
import type { Densidad } from '@/shared/ui/densidad'
import {
  CLAVE_DE_VISTOS,
  esquemaPreferenciaDeVistos,
  preferenciaDeVistosDesde,
  type PreferenciaDeVistos,
} from './vistos'

// Los mismos valores que entiende next-themes, para no traducir en el borde.
export const TEMAS = ['light', 'dark', 'system'] as const
export type Tema = (typeof TEMAS)[number]

export const DENSIDADES = ['compacta', 'comoda'] as const satisfies readonly Densidad[]

export const CLAVE_WIDGETS_DEL_TABLERO = 'tablero.widgets'

// `orden`: las claves de los widgets en el orden de la persona; `ocultos`: las que no quiere ver. Los límites sólo
// acotan lo que entra; qué claves existen lo decide el catálogo del tablero al leerlas.
export const esquemaWidgetsDelTablero = z.object({
  orden: z.array(z.string().max(60)).max(60),
  ocultos: z.array(z.string().max(60)).max(60),
})
export type WidgetsDelTablero = z.infer<typeof esquemaWidgetsDelTablero>

export type Preferencias = {
  // null = automática: compacta en escritorio, cómoda en táctil.
  densidad: Densidad | null
  // null = nunca eligió: manda lo que tenga el dispositivo.
  tema: Tema | null
  // De a cuántos ítems ve las listas con «Anterior» y «Siguiente» (10, 25, 50 o 100): `listas.por_pagina`. null = nunca
  // eligió: manda el de fábrica (`TAMANO_DE_PAGINA_POR_DEFECTO`). La base rechaza cualquier otro valor.
  porPagina: TamanoDePagina | null
  // Cuáles widgets del tablero ve y en qué orden (`tablero.widgets`). null = nunca personalizó: el tablero como viene.
  widgetsDelTablero: WidgetsDelTablero | null
  // «Vistos» (`vistos`): encendido, cuántos días y si se marca el último. Sin elegir, lo de fábrica (encendido, 7 días, con «último visto»).
  vistos: PreferenciaDeVistos
  // En qué zona ve las fechas de subasta (`zona_horaria`). null = la de la empresa.
  zonaHoraria: string | null
  // Cómo ve el inventario en escritorio, tabla o tarjetas (`vehiculos.vista`). null = nunca eligió: la tabla.
  vistaDeVehiculos: VistaDeLista | null
  // Cómo ve la lista de cotizaciones en escritorio (`cotizaciones.vista`). null = nunca eligió: las tarjetas.
  vistaDeCotizaciones: VistaDeLista | null
  // Cómo ve la lista de embarques y contenedores de Logística en escritorio (`embarques.vista`). null = nunca eligió: la tabla.
  vistaDeEmbarques: VistaDeLista | null
  // Si ve la lista de cotizaciones agrupada por vehículo (`cotizaciones.agrupar`). null = nunca eligió: agrupada.
  agruparCotizaciones: boolean | null
  // El embudo que dejó a la vista en el bloque «Oportunidades» de la ficha de un lead (`leads.embudo_de_la_ficha`): su id. null = nunca eligió: el por defecto.
  embudoDeLaFicha: string | null
  // Si ve el menú lateral plegado a sólo íconos en escritorio (`menu.plegado`). null = nunca eligió: desplegado.
  menuPlegado: boolean | null
  // El último origen de logística (`logistica.ultimo_origen`, docs/GLOSARIO.md › «Último origen»): el que eligió por última vez en Logística. null = nunca eligió:
  // Logística abre el primero que ve. Que siga siendo válido (activo, con la logística encendida, que lo vea) lo decide Logística al leerlo.
  ultimoOrigenDeLogistica: string | null
}

export const CLAVE_DE_VISTA_DE_VEHICULOS = 'vehiculos.vista'
export const CLAVE_DE_VISTA_DE_COTIZACIONES = 'cotizaciones.vista'
export const CLAVE_DE_VISTA_DE_EMBARQUES = 'embarques.vista'
export const CLAVE_DE_AGRUPAR_COTIZACIONES = 'cotizaciones.agrupar'
export const CLAVE_DE_EMBUDO_DE_LA_FICHA = 'leads.embudo_de_la_ficha'
export const CLAVE_DEL_MENU_PLEGADO = 'menu.plegado'
export const CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA = 'logistica.ultimo_origen'

export const CLAVE_DE_ZONA_HORARIA = 'zona_horaria'

// Una zona que `Intl` conoce («America/New_York»); otra, como si no hubiera elegido.
export const esquemaZonaHoraria = z
  .string()
  .max(64)
  .refine((zona) => {
    try {
      new Intl.DateTimeFormat('es', { timeZone: zona })
      return true
    } catch {
      return false
    }
  })

const esquemaDensidad = z.enum(DENSIDADES)
const esquemaVistaDeLista = z.enum(VISTAS_DE_LISTA)
const esquemaTema = z.enum(TEMAS)
// Un número de la lista del selector: ni «50» como texto, ni 7, ni 1000.
const esquemaPorPagina = z.custom<TamanoDePagina>(esTamanoDePagina)

// Lo elegido si el esquema lo admite; si no, sin elegir.
function elegido<T>(esquema: z.ZodType<T>, valor: unknown): T | null {
  const leido = esquema.safeParse(valor)
  return leido.success ? leido.data : null
}

// Lee el objeto `{ clave: valor }` que arma `mi_sesion()`. Una clave que falta, que no se conoce
// o que trae un valor viejo no rompe nada: esa preferencia queda sin elegir.
export function preferenciasDesde(crudo: unknown): Preferencias {
  const objeto = z.record(z.string(), z.unknown()).safeParse(crudo)
  const valores = objeto.success ? objeto.data : {}
  return {
    densidad: elegido(esquemaDensidad, valores['densidad']),
    tema: elegido(esquemaTema, valores['tema']),
    porPagina: elegido(esquemaPorPagina, valores[CLAVE_DE_PREFERENCIA_POR_PAGINA]),
    widgetsDelTablero: elegido(esquemaWidgetsDelTablero, valores[CLAVE_WIDGETS_DEL_TABLERO]),
    vistos: preferenciaDeVistosDesde(valores[CLAVE_DE_VISTOS]),
    zonaHoraria: elegido(esquemaZonaHoraria, valores[CLAVE_DE_ZONA_HORARIA]),
    vistaDeVehiculos: elegido(esquemaVistaDeLista, valores[CLAVE_DE_VISTA_DE_VEHICULOS]),
    vistaDeCotizaciones: elegido(esquemaVistaDeLista, valores[CLAVE_DE_VISTA_DE_COTIZACIONES]),
    vistaDeEmbarques: elegido(esquemaVistaDeLista, valores[CLAVE_DE_VISTA_DE_EMBARQUES]),
    agruparCotizaciones: elegido(z.boolean(), valores[CLAVE_DE_AGRUPAR_COTIZACIONES]),
    embudoDeLaFicha: elegido(z.guid(), valores[CLAVE_DE_EMBUDO_DE_LA_FICHA]),
    menuPlegado: elegido(z.boolean(), valores[CLAVE_DEL_MENU_PLEGADO]),
    ultimoOrigenDeLogistica: elegido(z.guid(), valores[CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA]),
  }
}

// Lo que se puede guardar: cada clave con los valores que admite. `null` borra la elección.
export const esquemaPreferencia = z.discriminatedUnion('clave', [
  z.object({ clave: z.literal('densidad'), valor: esquemaDensidad.nullable() }),
  z.object({ clave: z.literal('tema'), valor: esquemaTema.nullable() }),
  z.object({
    clave: z.literal(CLAVE_DE_PREFERENCIA_POR_PAGINA),
    valor: esquemaPorPagina.nullable(),
  }),
  z.object({
    clave: z.literal(CLAVE_WIDGETS_DEL_TABLERO),
    valor: esquemaWidgetsDelTablero.nullable(),
  }),
  z.object({ clave: z.literal(CLAVE_DE_VISTOS), valor: esquemaPreferenciaDeVistos.nullable() }),
  z.object({ clave: z.literal(CLAVE_DE_ZONA_HORARIA), valor: esquemaZonaHoraria.nullable() }),
  z.object({
    clave: z.literal(CLAVE_DE_VISTA_DE_VEHICULOS),
    valor: esquemaVistaDeLista.nullable(),
  }),
  z.object({
    clave: z.literal(CLAVE_DE_VISTA_DE_COTIZACIONES),
    valor: esquemaVistaDeLista.nullable(),
  }),
  z.object({
    clave: z.literal(CLAVE_DE_VISTA_DE_EMBARQUES),
    valor: esquemaVistaDeLista.nullable(),
  }),
  z.object({ clave: z.literal(CLAVE_DE_AGRUPAR_COTIZACIONES), valor: z.boolean().nullable() }),
  z.object({ clave: z.literal(CLAVE_DE_EMBUDO_DE_LA_FICHA), valor: z.guid().nullable() }),
  z.object({ clave: z.literal(CLAVE_DEL_MENU_PLEGADO), valor: z.boolean().nullable() }),
  z.object({ clave: z.literal(CLAVE_DEL_ULTIMO_ORIGEN_DE_LOGISTICA), valor: z.guid().nullable() }),
])

export type Preferencia = z.infer<typeof esquemaPreferencia>
