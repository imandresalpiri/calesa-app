import { readFileSync } from 'node:fs'
import type { Formula, ModoDeCambio } from './formula'
import { evaluar, type Resultado } from './motor'
import { esquemaEntrada } from './motor-entrada'
import { validarFormula } from './validar'

// Lo que comparten las pruebas de la semilla del cotizador (`semilla.test.ts` y `semilla-cifras.test.ts`; paso 4.08-3): leer los archivos
// sembrados (`supabase/semillas/cotizador-*.sql` y los tipos de cambio de `supabase/seed.sql`) y los juegos, y evaluar una fórmula sembrada con los tipos de cambio sembrados.
// Sólo lo usan pruebas (también `cabecera-de-la-hoja.test.ts`: un diseño viejo se ve igual).

export const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
export const juegoFormulas = (
  JSON.parse(leer('./casos-de-formula.json')) as {
    casos: { nombre: string; definicion: unknown; params: Record<string, unknown> }[]
  }
).casos
export const juegoDisenos = JSON.parse(leer('./casos-de-diseno.json')) as {
  formulas: Record<string, { definicion: unknown; params: Record<string, unknown> }>
  casos: { nombre: string; valida: boolean; diseno: unknown }[]
}

export const SEMILLAS = {
  subasta_usa: '../../../../supabase/semillas/cotizador-subasta-usa.sql',
  planilla_usa: '../../../../supabase/semillas/cotizador-planilla-usa.sql',
  oficina: '../../../../supabase/semillas/cotizador-oficina.sql',
} as const
export type Clave = keyof typeof SEMILLAS

// `v_def := $j$…$j$;`, `v_params` y `v_diseno` de una semilla.
export function sembrada(clave: Clave) {
  const sql = leer(SEMILLAS[clave])
  const bloque = (variable: string): unknown => {
    const m = new RegExp(String.raw`${variable} := \$j\$([\s\S]*?)\$j\$;`).exec(sql)
    if (m?.[1] === undefined) throw new Error(`${clave}: no hay «${variable}»`)
    return JSON.parse(m[1])
  }
  return {
    definicion: bloque('v_def') as {
      nodos: { id: string; tipo: string; clave?: string }[]
      grupos?: { tono: string }[]
    },
    params: bloque('v_params') as Record<string, unknown>,
    diseno: bloque('v_diseno') as {
      cabecera: {
        modos: { clave: string; buckets: { bucket: string; nodo: string }[]; total_en: string }[]
      }
      secciones: { id: string }[]
    },
  }
}

// La plantilla de la tarjeta de una semilla (`update public.plantillas_tarjeta … $j$…$j$`): forma 2 en las de USA, forma 1 en oficina.
export function plantillaDeLaSemilla(clave: Clave): unknown {
  const m = /update public\.plantillas_tarjeta p set definicion = \$j\$([\s\S]*?)\$j\$::jsonb/.exec(
    leer(SEMILLAS[clave]),
  )
  if (m?.[1] === undefined) throw new Error(`${clave}: sin plantilla`)
  return JSON.parse(m[1])
}

// La forma 1 de cada semilla: las de USA, del fixture (`plantilla/plantillas-v1-de-las-semillas.json`: su semilla ya es forma 2); la de oficina, la sembrada.
export function plantillaV1DeLaSemilla(clave: Clave): unknown {
  const fixture = JSON.parse(leer('./plantilla/plantillas-v1-de-las-semillas.json')) as Partial<
    Record<Clave, unknown>
  >
  return fixture[clave] ?? plantillaDeLaSemilla(clave)
}

// Los tipos de cambio de seed.sql: [clave, valor, es_default].
export function tiposDeCambio(): Record<string, { valor: number; defecto: boolean }> {
  const sql = leer('../../../../supabase/seed.sql')
  const cuerpo = /insert into public\.tipos_cambio[\s\S]*?on conflict/.exec(sql)?.[0] ?? ''
  const r: Record<string, { valor: number; defecto: boolean }> = {}
  for (const m of cuerpo.matchAll(
    /\('(\w+)', '[^']*', 'USD', 'BOB', ([\d.]+), (true|false), \d+\)/g,
  )) {
    r[m[1] ?? ''] = { valor: Number(m[2]), defecto: m[3] === 'true' }
  }
  return r
}

export const CONTEXTO = {
  niveles: ['costos'],
  retirados: [],
  tonos: ['amarillo', 'verde', 'naranja'],
}

export function formulaDe(clave: Clave): Formula {
  const s = sembrada(clave)
  const r = validarFormula(s.definicion, s.params)
  if (!r.ok) throw new Error(`${clave}: ${r.error.mensaje}`)
  return r.formula
}

export type Entrada = {
  inputs?: Record<string, number>
  banderas?: Record<string, boolean>
  overrides?: Record<string, number>
  variante?: string
  vehiculo?: Record<string, number | string>
}

export function calcular(clave: Clave, e: Entrada, modo?: string): Resultado {
  const f = formulaDe(clave)
  const tc = Object.fromEntries(Object.entries(tiposDeCambio()).map(([k, v]) => [k, v.valor]))
  const entrada = esquemaEntrada.parse({
    inputs: e.inputs ?? {},
    banderas: e.banderas ?? {},
    tipos_cambio: tc,
    vehiculo: e.vehiculo ?? {},
    tablas: {},
    overrides: e.overrides ?? {},
    ...(e.variante === undefined ? {} : { variante: e.variante }),
  })
  const m = sembrada(clave).diseno.cabecera.modos.find((x) => x.clave === modo)
  const elModo: ModoDeCambio | undefined = m && {
    buckets: Object.fromEntries(m.buckets.map((b) => [b.bucket, b.nodo])),
    total_en: m.total_en,
  }
  return evaluar(f, entrada, elModo)
}
