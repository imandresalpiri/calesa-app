import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { formulaDeNFilas } from './fila-de-prueba.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { resultadoAlLado } from './resultado-al-lado'
import { TERRENO_VACIO } from './terreno-de-prueba'
import { UNIDAD_EN_CEROS } from './unidad-de-ejemplo'

// El resultado al lado corre tras cada pausa al tipear: compilar la fila (`compilarFila()`) y validar la fórmula que resultaría (`validarFormula()`) tienen que
// ser O(filas). Esto cae si uno de los dos pasa a recorrer la fórmula por cada fila o si el medidor deja de pasarse.
// La fórmula de n filas con su total en el bucket, para que valide.
function formulaQueValida(n: number): Formula {
  const f = formulaDeNFilas(n)
  const nodos = f.definicion.nodos.map((x): Nodo =>
    x.id === `r${String(n)}` ? { ...x, bucket: 'b' } : x,
  )
  return { ...f, definicion: { ...f.definicion, nodos } }
}

const visitas = (n: number) => {
  const formula = formulaQueValida(n)
  const hoja = hojaDeLaPlanilla(formula)
  const c = (id: string) => `C${String(hoja.numeroDe.get(id))}`
  const medidor = { visitas: 0 }
  const cifra = resultadoAlLado({
    formula,
    hoja,
    id: `r${String(n)}`,
    col: 'C',
    texto: `=${c('remate')}+${c('fees')}*2`,
    locale: 'es-BO',
    tablas: null,
    terreno: { ...TERRENO_VACIO, tipos_cambio: { oficial: 6.96 } },
    unidad: { ...UNIDAD_EN_CEROS, inputs: { remate: 1000, fees: 100 } },
    modo: undefined,
    medidor,
  })
  return { v: medidor.visitas, cifra }
}

describe('resultadoAlLado con volumen', () => {
  it('60 y 600 filas: lineal, con la constante de 60 + 10 %', () => {
    const chica = visitas(60)
    const grande = visitas(600)
    expect(grande.cifra).toMatchObject({ tipo: 'valor', valor: 1200 })
    expect(grande.v).toBeGreaterThan(600)
    expect(grande.v / 600).toBeLessThanOrEqual(1.1 * (chica.v / 60))
  })
})
