import { describe, expect, it } from 'vitest'
import {
  armarPasos,
  indexarFlujo,
  llegaronA,
  textoDelProgreso,
  type PasoDelProyecto,
} from './pasos'
import { FASES, G, fase, flujo, item, pide, salida } from './pasos.soporte'

const SIN_PAGO = { hayMas: false, pago: null }

// Cada paso como «<nombre o hito>: <progreso>», para leer el orden de un vistazo.
const leer = (pasos: PasoDelProyecto[]) =>
  pasos.map((p) =>
    p.tipo === 'fase'
      ? `${p.fase.nombre}: ${p.progreso.texto}`
      : `[${p.hito}]: ${p.progreso.texto}`,
  )

describe('los pasos del proyecto', () => {
  it('un flujo sin hitos: las fases activas en su orden, con cuántos llegaron a cada una', () => {
    const indice = indexarFlujo(flujo())
    const filas = [item(1), item(2), item(3), item(4), item(5)]
    expect(leer(armarPasos(indice, filas, SIN_PAGO))).toEqual([
      'Por cotizar: 5 de 5',
      'Comprado: 4 de 5',
      'En tránsito: 3 de 5',
      'Recibido: 1 de 5',
      'Perdido: 1 de 5',
    ])
  })

  it('un ítem «Perdido» no cuenta en «Recibido», y uno sin fase no cuenta en ninguna', () => {
    const indice = indexarFlujo(flujo())
    expect(llegaronA(indice, G(4), [item(5), item(null)])).toBe(0)
    expect(llegaronA(indice, G(5), [item(5), item(null)])).toBe(1)
    expect(llegaronA(indice, G(1), [item(null)])).toBe(0)
  })

  it('una salida hacia atrás no infla el número', () => {
    const indice = indexarFlujo(flujo({ salidas: [...flujo().salidas, salida(3, 1, 'Volver')] }))
    expect(llegaronA(indice, G(3), [item(1)])).toBe(0)
    expect(llegaronA(indice, G(1), [item(3)])).toBe(1)
  })
})

describe('los hitos de los pasos', () => {
  it('el precio va justo antes de la primera fase que lo pide, con los que tienen precio', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(2, 'precio')] }))
    const pasos = armarPasos(indice, [item(1), item(1, 10), item(2, 5)], SIN_PAGO)
    expect(leer(pasos).slice(0, 3)).toEqual([
      'Por cotizar: 3 de 3',
      '[precio]: 2 de 3 con precio',
      'Comprado: 1 de 3',
    ])
    expect(pasos[1]).toMatchObject({
      tipo: 'hito',
      panel: 'cotizaciones',
      faseId: G(2),
      pago: null,
    })
  })

  it('el pago, con costos: todos o ninguno, con «Registrado» o «Sin registrar»', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(3, 'pago', false)] }))
    const filas = [item(1), item(2), item(3)]
    expect(leer(armarPasos(indice, filas, { hayMas: false, pago: true }))[2]).toBe(
      '[pago]: 3 de 3 · Registrado',
    )
    expect(leer(armarPasos(indice, filas, { hayMas: false, pago: false }))[2]).toBe(
      '[pago]: 0 de 3 · Sin registrar',
    )
  })

  it('el pago, sin costos: los que llegaron a la fase que lo pide, sin decir nada del pago', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(3, 'pago')] }))
    const [, , hito] = armarPasos(indice, [item(1), item(3), item(4)], SIN_PAGO)
    expect(hito).toMatchObject({ tipo: 'hito', hito: 'pago', pago: null })
    expect(hito?.progreso.texto).toBe('2 de 3')
  })

  it('los dos hitos en fases distintas, cada uno en su lugar', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(3, 'pago'), pide(2, 'precio')] }))
    expect(leer(armarPasos(indice, [], SIN_PAGO))).toEqual([
      'Por cotizar: 0 de 0',
      '[precio]: 0 de 0 con precio',
      'Comprado: 0 de 0',
      '[pago]: 0 de 0',
      'En tránsito: 0 de 0',
      'Recibido: 0 de 0',
      'Perdido: 0 de 0',
    ])
  })

  it('los dos hitos ante la misma fase: primero el precio', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(2, 'pago'), pide(2, 'precio')] }))
    expect(leer(armarPasos(indice, [], SIN_PAGO)).slice(1, 3)).toEqual([
      '[precio]: 0 de 0 con precio',
      '[pago]: 0 de 0',
    ])
  })
})

describe('los hitos y los nombres de las fases', () => {
  it('la clave en dos fases: gana la de menor orden', () => {
    const indice = indexarFlujo(flujo({ pedidos: [pide(3, 'precio'), pide(2, 'precio', false)] }))
    expect(indice.faseDelHito.get('precio')).toBe(G(2))
  })

  it('la clave en una fase jubilada no ubica el hito, y esa fase no es un paso', () => {
    const fases = FASES.map((f) => (f.id === G(2) ? { ...f, activa: false } : f))
    const indice = indexarFlujo(flujo({ fases, pedidos: [pide(2, 'precio')] }))
    expect(indice.faseDelHito.has('precio')).toBe(false)
    expect(leer(armarPasos(indice, [], SIN_PAGO))).not.toContain('Comprado: 0 de 0')
  })

  it('una fase llamada «Comprado», «Pagado» o «Cobrar» sin la clave no crea hitos: ningún nombre se lee', () => {
    const fases = [
      fase(1, 'Cobrar', 10, { esInicial: true }),
      fase(2, 'Pagado', 20),
      fase(3, 'Comprado', 30),
    ]
    const indice = indexarFlujo({ fases, salidas: [salida(1, 2), salida(2, 3)], pedidos: [] })
    expect(armarPasos(indice, [], SIN_PAGO).every((p) => p.tipo === 'fase')).toBe(true)
  })

  it('un ítem en una fase jubilada cuenta en las que llegan a ella hacia adelante', () => {
    const jubilada = fase(9, 'Vieja', 25, { activa: false })
    const indice = indexarFlujo(
      flujo({ fases: [...FASES, jubilada], salidas: [...flujo().salidas, salida(2, 9)] }),
    )
    const filas = [item(9)]
    expect(llegaronA(indice, G(2), filas)).toBe(1)
    expect(llegaronA(indice, G(3), filas)).toBe(0)
  })

  it('con la hoja topada, ningún total exacto', () => {
    expect(textoDelProgreso(37, 200, true)).toBe('37+ de 200+')
    expect(textoDelProgreso(3, 5, false)).toBe('3 de 5')
    const indice = indexarFlujo(flujo())
    expect(armarPasos(indice, [item(1)], { hayMas: true, pago: null })[0]?.progreso.texto).toBe(
      '1+ de 1+',
    )
  })
})
