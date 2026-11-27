import { describe, expect, it } from 'vitest'
import {
  alHueco,
  alProyecto,
  ir,
  registrarPago,
  revisar,
  subir,
  type AccionesDelRequisito,
} from './accion-de-requisito'
import { ABRIR_LA_UNIDAD, accionesADibujar, type LugarDeLasAcciones } from './acciones-a-dibujar'
import type { HuecoDeAccion } from './capacidades-de-que-falta'

const VEHICULO = '00000000-0000-4000-8000-0000000000a1'

function lugar(
  cambios: Partial<LugarDeLasAcciones> = {},
  huecos: HuecoDeAccion[] = ['documentos'],
) {
  return {
    hayHueco: (h: HuecoDeAccion) => huecos.includes(h),
    enLaPagina: true,
    unidad: { tipo: 'vehiculo' as const, id: VEHICULO },
    enLinea: true,
    ...cambios,
  }
}

const resueltas = (cambios: Partial<AccionesDelRequisito>): AccionesDelRequisito => ({
  principal: null,
  mas: [],
  pedido: null,
  hueco: null,
  veElHueco: false,
  ...cambios,
})

describe('las acciones que se dibujan', () => {
  it('con la clave del hueco y sin el hueco (regla apagada): nada, tampoco el pedido', () => {
    const r = resueltas({
      principal: alHueco('transporte', 'Contenedor', 'transporte.contenedor'),
      pedido: 'x',
      hueco: 'transporte',
      veElHueco: true,
    })
    expect(accionesADibujar(r, lugar())).toEqual({
      principal: null,
      mas: [],
      pedido: null,
      apagadas: false,
    })
  })

  it('sin la clave del hueco, lo que lleva a él se descarta y el resto sube', () => {
    const pedir = {
      tipo: 'pedir' as const,
      clave: 'logistica.pagos.confirmar' as const,
      titulo: 't',
      etiqueta: 'Pedirlo',
      nombre: 'Pedirlo: «Pago»',
    }
    const r = resueltas({ principal: pedir, mas: [alHueco('pagos', 'Pago')], hueco: 'pagos' })
    expect(accionesADibujar(r, lugar())).toMatchObject({ principal: pedir, mas: [] })
    const otra = resueltas({ principal: subir('BL', 't'), mas: [alHueco('aduana', 'Canal')] })
    expect(accionesADibujar(otra, lugar({}, ['aduana'])).principal?.tipo).toBe('hueco')
  })

  it('en un drawer, lo que lleva a otra pantalla dice «Abrir la unidad», una sola vez', () => {
    const r = resueltas({
      principal: ir('Completar', 'Completar «VIN»', `/vehiculos/${VEHICULO}?editar=x`),
      mas: [
        ir('Ir a Cotizaciones', 'Ir a Cotizaciones por «X»', '/vehiculos/x?seccion=cotizaciones'),
      ],
    })
    const dibujar = accionesADibujar(r, lugar({ enLaPagina: false }))
    expect(dibujar.principal).toMatchObject({
      tipo: 'ir',
      etiqueta: ABRIR_LA_UNIDAD,
      ruta: `/logistica/vehiculo/${VEHICULO}`,
    })
    expect(dibujar.mas).toEqual([])
    // En la página, se queda como está.
    expect(accionesADibujar(r, lugar()).principal).toMatchObject({ etiqueta: 'Completar' })
  })

  it('un ítem en su drawer conserva su «Ir al vehículo»', () => {
    const r = resueltas({
      principal: ir('Ir al vehículo', 'Ir al vehículo por «X»', '/logistica/vehiculo/v'),
    })
    const item = lugar({ enLaPagina: false, unidad: { tipo: 'repuesto', id: 'i' } })
    expect(accionesADibujar(r, item).principal).toMatchObject({ etiqueta: 'Ir al vehículo' })
  })

  it('«Ir al proyecto» arma su ruta; sin proyecto se descarta', () => {
    const r = resueltas({ principal: alProyecto('Pago del cliente', 'pagos') })
    const conProyecto = lugar({ unidad: { tipo: 'repuesto', id: 'i', proyecto: { id: 'p1' } } })
    expect(accionesADibujar(r, conProyecto).principal).toMatchObject({
      tipo: 'ir',
      ruta: '/repuestos/p1?pestana=pagos',
    })
    expect(
      accionesADibujar(r, lugar({ unidad: { tipo: 'repuesto', id: 'i' } })).principal,
    ).toBeNull()
  })

  it('sin red, se dibujan apagadas; sin resueltas, nada', () => {
    const r = resueltas({ principal: subir('BL', 't') })
    expect(accionesADibujar(r, lugar({ enLinea: false })).apagadas).toBe(true)
    expect(accionesADibujar(undefined, lugar()).principal).toBeNull()
  })
})

describe('las acciones en la ficha del vehículo (todos los huecos existen; sólo «Documentos» a mano)', () => {
  const enLaFicha = lugar({ aMano: (h: HuecoDeAccion) => h === 'documentos' }, [
    'documentos',
    'transporte',
    'aduana',
    'pagos',
    'repuestos',
  ])

  it('«Subir» y «Revisar» se hacen en el lugar', () => {
    const r = resueltas({ principal: subir('BL', 't1'), mas: [revisar('BL', 't1')] })
    const dibujar = accionesADibujar(r, enLaFicha)
    expect(dibujar.principal).toMatchObject({ tipo: 'subir' })
    expect(dibujar.mas).toMatchObject([{ tipo: 'revisar' }])
  })

  it('transporte, aduana y pagos pasan a «Abrir la unidad» con la tarjeta de su hueco', () => {
    for (const [accion, tarjeta] of [
      [alHueco('transporte', 'Contenedor', 'transporte.contenedor'), 'transporte'],
      [alHueco('aduana', 'Canal'), 'aduana'],
      [registrarPago('Flete'), 'dinero'],
    ] as const) {
      expect(accionesADibujar(resueltas({ principal: accion }), enLaFicha).principal).toEqual({
        tipo: 'ir',
        ruta: `/logistica/vehiculo/${VEHICULO}?hueco=${tarjeta}`,
        etiqueta: ABRIR_LA_UNIDAD,
        nombre: `${ABRIR_LA_UNIDAD}: ${accion.nombre}`,
      })
    }
  })

  it('«Pedirlo» y los enlaces de un dato se conservan', () => {
    const pedir = {
      tipo: 'pedir' as const,
      clave: 'logistica.transporte.editar' as const,
      titulo: 't',
      etiqueta: 'Pedirlo',
      nombre: 'Pedirlo: «Contenedor»',
    }
    const editar = ir('Completar', 'Completar «VIN»', `/vehiculos/${VEHICULO}?editar=x`)
    const r = resueltas({ principal: editar, mas: [pedir], pedido: 'p' })
    expect(accionesADibujar(r, { ...enLaFicha, enLaPagina: true })).toMatchObject({
      principal: editar,
      mas: [pedir],
      pedido: 'p',
    })
  })

  it('sin red, apagadas', () => {
    const r = resueltas({ principal: alHueco('aduana', 'Canal') })
    expect(accionesADibujar(r, { ...enLaFicha, enLinea: false }).apagadas).toBe(true)
  })
})

it('sin `aMano`, un hueco que existe se queda en su lugar (la unidad)', () => {
  const r = resueltas({ principal: alHueco('transporte', 'Contenedor') })
  expect(accionesADibujar(r, lugar({}, ['transporte'])).principal).toMatchObject({
    tipo: 'hueco',
  })
})
