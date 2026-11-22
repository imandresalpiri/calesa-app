import { describe, expect, it } from 'vitest'
import { cambiosDePolitica, filasDeLaPolitica, type PoliticaDeLaCola } from './politica'

describe('cambiosDePolitica', () => {
  const edicion = {
    colaActiva: true,
    ttlContactoMinutos: 30,
    diasPegajoso: 14,
    maxAbiertasDefault: 5,
    maxIntentos: 3,
  }

  it('manda exactamente las cinco claves de la cola', () => {
    expect(cambiosDePolitica(edicion)).toEqual({
      cola_activa: true,
      ttl_contacto_minutos: 30,
      dias_pegajoso: 14,
      max_abiertas_default: 5,
      max_intentos: 3,
    })
  })

  it('no manda ninguna clave del sitio aunque la entrada traiga de más', () => {
    const conDeMas = { ...edicion, whatsappRespaldo: '+59170000000', nombreSitio: 'x' }
    const cambios = cambiosDePolitica(conDeMas)
    expect(Object.keys(cambios).sort()).toEqual([
      'cola_activa',
      'dias_pegajoso',
      'max_abiertas_default',
      'max_intentos',
      'ttl_contacto_minutos',
    ])
    expect(cambios).not.toHaveProperty('whatsapp_respaldo')
  })
})

describe('filasDeLaPolitica', () => {
  const politica: PoliticaDeLaCola = {
    colaActiva: true,
    ttlContactoMinutos: 30,
    diasPegajoso: 14,
    maxAbiertasDefault: 5,
    maxIntentos: 3,
    whatsappRespaldo: null,
    actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
  }

  it('dice si la cola reparte y los cuatro números, en el orden del modal', () => {
    expect(filasDeLaPolitica(politica)).toEqual([
      { etiqueta: 'Cola', valor: 'Activa' },
      { etiqueta: 'Minutos para contactar', valor: '30' },
      { etiqueta: 'Días con el mismo asesor', valor: '14' },
      { etiqueta: 'Cupo por defecto', valor: '5' },
      { etiqueta: 'Intentos por solicitud', valor: '3' },
    ])
  })

  it('con la cola apagada dice «Apagada»', () => {
    expect(filasDeLaPolitica({ ...politica, colaActiva: false })[0]).toEqual({
      etiqueta: 'Cola',
      valor: 'Apagada',
    })
  })
})
