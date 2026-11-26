import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { REGLAS_DE_FORMULA } from './motivos-de-formula'
import { validarFormula } from './validar'

// El juego compartido con la base (4.05-4 lo lee desde supabase/tests/). Se lee como dato, no como módulo:
// así nada de TypeScript se mete entre el archivo y lo que prueba.
const esquemaRegla = z.enum(REGLAS_DE_FORMULA)
const esquemaJuego = z.strictObject({
  descripcion: z.string(),
  cascadas: z.array(
    z.strictObject({ apagada: esquemaRegla, cae_por: esquemaRegla, motivo: z.string().min(1) }),
  ),
  casos: z.array(
    z.strictObject({
      nombre: z.string().min(1),
      valida: z.boolean(),
      motivo: z.strictObject({ regla: esquemaRegla, donde: z.string().optional() }).optional(),
      definicion: z.unknown(),
      params: z.unknown(),
    }),
  ),
})

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const juego = esquemaJuego.parse(JSON.parse(leer('./casos-de-formula.json')))

describe('casos-de-formula.json', () => {
  it.each(juego.casos)('$nombre', ({ valida, motivo, definicion, params }) => {
    const r = validarFormula(definicion, params)
    // Si no da lo esperado, el error muestra el rechazo entero (o «válida»).
    const visto = r.ok ? 'válida' : r.error
    if (valida) expect(visto).toBe('válida')
    else expect(visto).toMatchObject(motivo ?? {})
  })
})

describe('el juego', () => {
  it('cada regla tiene al menos un caso, cada inválida dice su motivo y las válidas no', () => {
    const cubiertas = new Set(juego.casos.map((c) => c.motivo?.regla))
    for (const regla of REGLAS_DE_FORMULA) expect(cubiertas, regla).toContain(regla)
    for (const c of juego.casos) expect(c.motivo === undefined, c.nombre).toBe(c.valida)
  })

  it('los nombres no se repiten, y una cascada declarada une dos reglas distintas', () => {
    const nombres = juego.casos.map((c) => c.nombre)
    expect(new Set(nombres).size).toBe(nombres.length)
    for (const c of juego.cascadas) expect(c.apagada).not.toBe(c.cae_por)
  })
})

describe('los decimales de una celda', () => {
  const definicion = (decimales: unknown) => ({
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
      { id: 'a', tipo: 'input', etiqueta: 'A', formato: 'usd', bucket: 'origen' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        de: ['a'],
        etiqueta: 'Total',
        salida: 'total',
        decimales,
      },
    ],
    buckets: { origen: 'tc' },
  })

  it('de 0 a 4 valen y no cambian lo validado; sin la clave, también', () => {
    for (const d of [0, 4]) {
      const r = validarFormula(definicion(d), {})
      expect(r.ok, String(d)).toBe(true)
      if (r.ok) expect(r.formula.definicion.nodos[2]?.decimales).toBe(d)
    }
    const { nodos, buckets } = definicion(0)
    expect(
      validarFormula({ nodos: nodos.map(({ decimales: _, ...n }) => n), buckets }, {}).ok,
    ).toBe(true)
  })

  it('fuera de rango es `forma` en `definicion.nodos.2.decimales`, donde el nodo (como validar_formula)', () => {
    for (const d of [5, -1, 2.5, '2']) {
      const r = validarFormula(definicion(d), {})
      expect(r.ok, String(d)).toBe(false)
      if (!r.ok)
        expect(r.error, String(d)).toMatchObject({
          regla: 'forma',
          donde: 'total',
          campo: 'definicion.nodos.2.decimales',
          mensaje: 'La fórmula no tiene la forma esperada en «definicion.nodos.2.decimales».',
        })
    }
  })
})
