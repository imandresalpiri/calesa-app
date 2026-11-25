import { describe, expect, it } from 'vitest'
import type { CasaDeLaFila } from './ayuda-de-la-hoja'
import { camposQueCasanLaAyuda, filaDelVehiculo, filasAMostrar } from './fila-del-vehiculo'
import type { HojaLista } from './hoja'

const filas = [
  { anio: 2017, tipo: 'Sedán', iva: 0.12 },
  { anio: 2018, tipo: 'SUV', iva: 0.13 },
  { anio: 2018, tipo: 'Sedán', iva: 0.1494 },
  { anio: 2018, tipo: 'Sedán', iva: 0.2 },
]
const casa: CasaDeLaFila[] = [
  { columna: 'anio', campo: 'anio' },
  { columna: 'tipo', nodo: 'tipo_vehiculo' },
]
const conValores = (
  delVehiculo: Record<string, number | string>,
  nodos: Record<string, unknown> = {},
) => ({
  delVehiculo,
  deNodo: (nodo: string) => nodos[nodo] as number | string | null | undefined,
})

describe('filaDelVehiculo: la fila que casa con la hoja, como la lee el motor', () => {
  it('la primera fila cuyas columnas son todas iguales gana', () => {
    expect(
      filaDelVehiculo(filas, casa, conValores({ anio: 2018 }, { tipo_vehiculo: 'Sedán' })),
    ).toBe(2)
  })

  it('compara sin convertir: 2018 no es "2018"', () => {
    expect(
      filaDelVehiculo(filas, casa, conValores({ anio: '2018' }, { tipo_vehiculo: 'Sedán' })),
    ).toBeNull()
  })

  it('nulo si falta un valor (sin vehículo, un nodo sin calcular o nulo) o ninguna fila coincide', () => {
    expect(filaDelVehiculo(filas, casa, conValores({}, { tipo_vehiculo: 'Sedán' }))).toBeNull()
    expect(filaDelVehiculo(filas, casa, conValores({ anio: 2018 }))).toBeNull()
    expect(
      filaDelVehiculo(filas, casa, conValores({ anio: 2018 }, { tipo_vehiculo: null })),
    ).toBeNull()
    expect(
      filaDelVehiculo(filas, casa, conValores({ anio: 2030 }, { tipo_vehiculo: 'Sedán' })),
    ).toBeNull()
  })

  it('nulo si la tabla no casa con la hoja (sin `casa` o vacía)', () => {
    const valores = conValores({ anio: 2018 }, { tipo_vehiculo: 'Sedán' })
    expect(filaDelVehiculo(filas, null, valores)).toBeNull()
    expect(filaDelVehiculo(filas, [], valores)).toBeNull()
  })

  it('una columna que la fila no tiene no coincide, ni siquiera con un valor que se lee del prototipo', () => {
    const conToString = [{ anio: 2018 }]
    expect(
      filaDelVehiculo(
        conToString,
        [{ columna: 'constructor', campo: 'c' }],
        conValores({ c: 'x' }),
      ),
    ).toBeNull()
  })
})

const celda = (nodo: string, ayuda: unknown) => ({ tipo: 'celda', nodo, ayuda })

describe('camposQueCasanLaAyuda: los datos del vehículo que la página tiene que mandar', () => {
  it('sólo los campos de las tablas que resaltan, sin repetir', () => {
    const hoja = {
      secciones: [
        {
          items: [
            celda('a', [
              { tipo: 'texto', texto: 'x' },
              {
                tipo: 'tabla',
                resaltar: true,
                casa: [
                  { columna: 'anio', campo: 'anio' },
                  { columna: 'tipo', nodo: 'tipo' },
                ],
              },
            ]),
            celda('b', [
              {
                tipo: 'tabla',
                resaltar: true,
                casa: [
                  { columna: 'a', campo: 'anio' },
                  { columna: 'm', campo: 'marca' },
                ],
              },
              { tipo: 'tabla', resaltar: false, casa: null },
              { tipo: 'tabla', resaltar: true, casa: null },
            ]),
            celda('c', null),
            { tipo: 'subtotal', nodo: 'cif' },
          ],
        },
      ],
    } as unknown as Pick<HojaLista, 'secciones'>
    expect(camposQueCasanLaAyuda(hoja)).toStrictEqual(['anio', 'marca'])
  })
})

describe('filasAMostrar: «Tu vehículo» siempre se ve', () => {
  it('las pedidas, o hasta la resaltada si queda más abajo', () => {
    expect(filasAMostrar(20, null)).toBe(20)
    expect(filasAMostrar(20, 5)).toBe(20)
    expect(filasAMostrar(20, 20)).toBe(21)
    expect(filasAMostrar(20, 57)).toBe(58)
  })
})
