import { describe, expect, it } from 'vitest'
import { disponerDiagrama, medidasDelDiagrama } from './disposicion-del-diagrama'
import { centroParaVerLaFase, vistaInicial } from './vista-del-diagrama'
import { disponerConPosiciones } from './trazado-de-salidas'

const m = medidasDelDiagrama(16)
const fases = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `f${String(i)}` }))

describe('vistaInicial', () => {
  it('si entra, centrado y sin agrandar', () => {
    const d = disponerDiagrama(fases(2), [], m)
    const vista = vistaInicial(d, { ancho: 2000, alto: 800 }, null)
    expect(vista.zoom).toBe(1)
    expect(vista.x).toBe((2000 - d.ancho) / 2)
    expect(vista.y).toBe((800 - d.alto) / 2)
  })

  it('si no entra, achica hasta 0,6 y muestra el principio', () => {
    const d = disponerDiagrama(fases(30), [], m)
    const vista = vistaInicial(d, { ancho: 1000, alto: 500 }, null)
    expect(vista.zoom).toBe(0.6)
    expect(vista.x).toBe(0)
  })

  it('si no entra y hay una fase abierta, la pone en el medio sin pasarse de los bordes', () => {
    const d = disponerDiagrama(fases(30), [], m)
    const medio = vistaInicial(d, { ancho: 1000, alto: 500 }, 'f15')
    const nodo = d.nodos[15]
    expect(nodo).toBeDefined()
    expect(medio.x + ((nodo?.x ?? 0) + m.ancho / 2) * medio.zoom).toBeCloseTo(500)
    expect(vistaInicial(d, { ancho: 1000, alto: 500 }, 'f0').x).toBe(0)
    const ultima = vistaInicial(d, { ancho: 1000, alto: 500 }, 'f29')
    expect(ultima.x).toBeCloseTo(1000 - d.ancho * ultima.zoom)
  })

  it('con una fase a la izquierda o arriba del principio, la vista corre el dibujo para que entre', () => {
    const auto = disponerDiagrama(fases(2), [], m)
    const d = disponerConPosiciones(auto, new Map([['f0', { x: -800, y: -400 }]]))
    expect(d.limites.x).toBe(-800 - m.margen)
    const vista = vistaInicial(d, { ancho: 3000, alto: 2000 }, null)
    expect(vista.zoom).toBe(1)
    // El borde izquierdo del dibujo queda tan lejos del borde del lienzo como el derecho.
    const izquierda = vista.x + d.limites.x * vista.zoom
    const derecha = 3000 - (vista.x + (d.limites.x + d.limites.ancho) * vista.zoom)
    expect(izquierda).toBeCloseTo(derecha)
    const arriba = vista.y + d.limites.y * vista.zoom
    expect(arriba).toBeCloseTo(2000 - (vista.y + (d.limites.y + d.limites.alto) * vista.zoom))
  })

  it('el centro para ver una fase se corre la mitad de lo tapado', () => {
    const d = disponerDiagrama(fases(3), [], m)
    const libre = centroParaVerLaFase(d, 'f1', 0, 1)
    const tapada = centroParaVerLaFase(d, 'f1', 600, 1)
    expect((tapada?.x ?? 0) - (libre?.x ?? 0)).toBe(300)
    expect(centroParaVerLaFase(d, 'otra', 0, 1)).toBeNull()
  })
})
