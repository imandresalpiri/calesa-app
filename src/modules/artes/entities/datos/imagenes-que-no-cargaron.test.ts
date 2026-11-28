import { describe, expect, it } from 'vitest'
import type { CapaDeArte } from '../documento'
import { pagina, rect } from '../editor/capas-de-prueba.soporte'
import type { CapasConDatos } from './capas-con-datos'
import { conLasQueNoCargaron } from './imagenes-que-no-cargaron'

const capa = (id: string, extra: Record<string, unknown>) =>
  ({ ...rect(id), ...extra }) as unknown as CapaDeArte

const FOTO = capa('f', { tipo: 'foto', indice: 2 })
const TARJETA = capa('t', { tipo: 'tarjeta' })
const LOGO = capa('l', { tipo: 'logo' })
const PAGINA = pagina([FOTO, TARJETA, LOGO])

const imagen = (src: string) => ({ tipo: 'imagen' as const, fuente: { src, medidas: null } })

const CON_DATOS: CapasConDatos = {
  resueltas: new Map([
    ['f', imagen('/foto')],
    ['t', imagen('/tarjeta')],
    ['l', imagen('/logo')],
  ]),
  escondidas: new Set(),
  faltan: [{ clave: 'vin', nombre: 'el VIN' }],
}

describe('conLasQueNoCargaron', () => {
  it('sin fallas deja lo que faltaba tal cual', () => {
    expect(conLasQueNoCargaron(PAGINA, CON_DATOS, new Set())).toBe(CON_DATOS.faltan)
  })

  it('suma la foto y la tarjeta que no cargaron, después de lo que faltaba', () => {
    const faltan = conLasQueNoCargaron(PAGINA, CON_DATOS, new Set(['/foto', '/tarjeta', '/logo']))
    expect(faltan.map((f) => f.nombre)).toEqual(['el VIN', 'la foto 3', 'la cotización'])
  })

  it('no repite lo que ya faltaba', () => {
    const yaFaltaba: CapasConDatos = {
      ...CON_DATOS,
      faltan: [{ clave: 'cotizacion', nombre: 'la cotización' }],
    }
    expect(conLasQueNoCargaron(PAGINA, yaFaltaba, new Set(['/tarjeta']))).toBe(yaFaltaba.faltan)
  })
})
