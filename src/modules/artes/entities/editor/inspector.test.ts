import { describe, expect, it } from 'vitest'
import type { CapaDe, CapaDeArte } from '../documento'
import { pagina, rect } from './capas-de-prueba.soporte'
import {
  acotar,
  claveDeFusion,
  conBorde,
  conElAlfaDe,
  conFlecha,
  conMedidas,
  conSombra,
  fondoDeTipo,
  GROSOR_AL_PONER_BORDE,
  leerColorTipeado,
  LIMITES_DEL_INSPECTOR,
  loElegido,
  normalizarGrados,
  redondear,
  SOMBRA_NUEVA,
  unidadesQueSeMueven,
  valorComun,
} from './inspector'

const texto: CapaDe<'texto'> = {
  id: 't',
  tipo: 'texto',
  nombre: null,
  grupoId: null,
  x: 0,
  y: 0,
  ancho: 200,
  alto: 50,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
  texto: 'Hola',
  fuente: 'geist',
  tamano: 40,
  peso: 400,
  interlineado: 1.2,
  color: '#111111',
  alineacion: 'izquierda',
  borde: null,
  grosor: 0,
}

const bloqueada = (capa: CapaDeArte): CapaDeArte => ({ ...capa, bloqueada: true })

describe('lo elegido', () => {
  const conGrupo = pagina([rect('a', 'g'), rect('b', 'g'), rect('c'), rect('d')], ['g'])

  it('sin nada, una capa, el grupo entero o varias', () => {
    expect(loElegido(conGrupo, []).tipo).toBe('nada')
    expect(loElegido(conGrupo, ['c'])).toMatchObject({ tipo: 'capa', bloqueada: false })
    expect(loElegido(conGrupo, ['a', 'b'])).toMatchObject({ tipo: 'grupo', bloqueada: false })
    expect(loElegido(conGrupo, ['a', 'c']).tipo).toBe('varias')
    expect(loElegido(conGrupo, ['a', 'b', 'c']).tipo).toBe('varias')
  })

  it('un id que ya no está no cuenta', () => {
    expect(loElegido(conGrupo, ['zz']).tipo).toBe('nada')
    expect(loElegido(conGrupo, ['c', 'zz']).tipo).toBe('capa')
  })

  it('la caja del grupo encierra a sus miembros', () => {
    const p = pagina([rect('a', 'g', { x: 10, y: 20 }), rect('b', 'g', { x: 50, y: 0 })], ['g'])
    expect(loElegido(p, ['a', 'b'])).toMatchObject({
      tipo: 'grupo',
      caja: { x: 10, y: 0, ancho: 50, alto: 30 },
    })
  })

  it('lo bloqueado, por la capa o por su grupo', () => {
    const p = pagina([bloqueada(rect('a')), rect('b', 'g'), rect('c', 'g')], ['g'])
    expect(loElegido(p, ['a'])).toMatchObject({ tipo: 'capa', bloqueada: true })
    const conElGrupoBloqueado = { ...p, grupos: p.grupos.map((g) => ({ ...g, bloqueado: true })) }
    expect(loElegido(conElGrupoBloqueado, ['b', 'c'])).toMatchObject({
      tipo: 'grupo',
      bloqueada: true,
    })
  })
})

describe('las unidades que se mueven', () => {
  const p = pagina([rect('a', 'g'), rect('b', 'g'), rect('c'), bloqueada(rect('d'))], ['g'])

  it('el grupo entero cuenta como una y lo bloqueado no cuenta', () => {
    expect(unidadesQueSeMueven(p, ['a', 'b', 'c', 'd'])).toBe(2)
  })

  it('un miembro suelto de un grupo cuenta solo', () => {
    expect(unidadesQueSeMueven(p, ['a', 'c'])).toBe(2)
    expect(unidadesQueSeMueven(p, [])).toBe(0)
  })
})

describe('el valor común', () => {
  const capas = [rect('a'), rect('b'), { ...rect('c'), opacidad: 0.5 }]

  it('el mismo en todas, o mixto', () => {
    expect(valorComun(capas.slice(0, 2), (c) => c.opacidad)).toEqual({ mixto: false, valor: 1 })
    expect(valorComun(capas, (c) => c.opacidad)).toEqual({ mixto: true })
  })

  it('sin capas, mixto; un nulo también es un valor', () => {
    expect(valorComun([], (c) => c.opacidad)).toEqual({ mixto: true })
    expect(valorComun(capas, (c) => c.sombra)).toEqual({ mixto: false, valor: null })
  })
})

describe('los números del inspector', () => {
  it('acota a los límites del campo', () => {
    expect(acotar(140, LIMITES_DEL_INSPECTOR.opacidad)).toBe(100)
    expect(acotar(-3, LIMITES_DEL_INSPECTOR.lado)).toBe(0)
    expect(acotar(20, LIMITES_DEL_INSPECTOR.lados)).toBe(12)
    expect(acotar(0.1, LIMITES_DEL_INSPECTOR.interlineado)).toBe(0.5)
    expect(acotar(0, LIMITES_DEL_INSPECTOR.tamano)).toBe(1)
  })

  it('↑ y ↓ de a uno, de a diez con Mayús, sin restos de la coma flotante', () => {
    expect(conFlecha(5, 1, false)).toBe(6)
    expect(conFlecha(5, -1, true)).toBe(-5)
    expect(conFlecha(1.2, 1, false, 0.1)).toBe(1.3)
    expect(conFlecha(1.2, -1, true, 0.1)).toBe(0.2)
  })

  it('redondea a los decimales que se muestran', () => {
    expect(redondear(12.3456, 2)).toBe(12.35)
    expect(redondear(12.5, 0)).toBe(13)
    expect(redondear(-0.004, 2)).toBe(-0)
  })

  it('la rotación queda en (-180, 180]', () => {
    expect(normalizarGrados(270)).toBe(-90)
    expect(normalizarGrados(180)).toBe(180)
    expect(normalizarGrados(-190)).toBe(170)
    expect(normalizarGrados(720)).toBe(0)
  })
})

describe('el tamaño de la caja', () => {
  it('una forma cambia sólo su caja', () => {
    expect(conMedidas(rect('a'), { ancho: 40 })).toMatchObject({ ancho: 40, alto: 10 })
  })

  it('un texto conserva su alto y el tamaño de su letra', () => {
    const otro = conMedidas(texto, { ancho: 400, alto: 999 })
    expect(otro).toMatchObject({ ancho: 400, alto: 50, tamano: 40 })
  })

  it('los puntos de una línea escalan con la caja', () => {
    const linea: CapaDe<'linea'> = {
      ...texto,
      tipo: 'linea',
      ancho: 100,
      alto: 10,
      puntos: [
        { x: 0, y: 10 },
        { x: 100, y: 0 },
      ],
      borde: '#000000',
      grosor: 2,
    }
    expect(conMedidas(linea, { ancho: 50, alto: 20 })).toMatchObject({
      puntos: [
        { x: 0, y: 20 },
        { x: 50, y: 0 },
      ],
      grosor: 2,
    })
  })

  it('los nodos de un trazo escalan con la caja; una caja sin alto no divide por cero', () => {
    const trazo: CapaDe<'trazo'> = {
      ...texto,
      tipo: 'trazo',
      ancho: 100,
      alto: 0,
      nodos: [
        { x: 0, y: 0, entrada: null, salida: { x: 20, y: 0 } },
        { x: 100, y: 0, entrada: null, salida: null },
      ],
      cerrado: false,
      relleno: null,
      borde: '#000000',
      grosor: 2,
    }
    const otro = conMedidas(trazo, { ancho: 200, alto: 30 })
    expect(otro).toMatchObject({ ancho: 200, alto: 30 })
    expect(otro.tipo === 'trazo' && otro.nodos[1]).toEqual({
      x: 200,
      y: 0,
      entrada: null,
      salida: null,
    })
  })
})

describe('borde y sombra', () => {
  it('poner un borde sin grosor le da uno que se vea; quitarlo conserva el grosor', () => {
    expect(conBorde(rect('a'), '#ff0000')).toMatchObject({
      borde: '#ff0000',
      grosor: GROSOR_AL_PONER_BORDE,
    })
    const conGrosor = { ...rect('a'), borde: '#000000', grosor: 5 }
    expect(conBorde(conGrosor, null)).toMatchObject({ borde: null, grosor: 5 })
  })

  it('la línea no se queda sin borde', () => {
    const linea: CapaDe<'linea'> = {
      ...texto,
      tipo: 'linea',
      puntos: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      borde: '#000000',
      grosor: 2,
    }
    expect(conBorde(linea, null)).toBe(linea)
    expect(conBorde(linea, '#ffffff')).toMatchObject({ borde: '#ffffff', grosor: 2 })
  })

  it('cambia una parte de la sombra; sin sombra, nada', () => {
    const conLaSombra = { ...rect('a'), sombra: SOMBRA_NUEVA }
    expect(conSombra(conLaSombra, { desenfoque: 3 }).sombra).toEqual({
      ...SOMBRA_NUEVA,
      desenfoque: 3,
    })
    const sinSombra = rect('a')
    expect(conSombra(sinSombra, { x: 4 })).toBe(sinSombra)
  })
})

describe('el fondo', () => {
  it('de color a degradado y de vuelta', () => {
    const degradado = fondoDeTipo({ tipo: 'color', color: '#123456' }, 'degradado')
    expect(degradado).toEqual({
      tipo: 'degradado',
      desde: '#123456',
      hasta: '#ffffff',
      angulo: 180,
    })
    expect(fondoDeTipo(degradado, 'color')).toEqual({ tipo: 'color', color: '#123456' })
  })

  it('un blanco va hacia negro; el mismo tipo no cambia', () => {
    expect(fondoDeTipo({ tipo: 'color', color: '#FFFFFF' }, 'degradado')).toMatchObject({
      hasta: '#000000',
    })
    const color = { tipo: 'color', color: '#ffffff' } as const
    expect(fondoDeTipo(color, 'color')).toBe(color)
  })
})

describe('los colores tipeados', () => {
  it('con o sin #, en minúsculas, con alfa o sin él', () => {
    expect(leerColorTipeado('#AABBCC')).toBe('#aabbcc')
    expect(leerColorTipeado(' 112233 ')).toBe('#112233')
    expect(leerColorTipeado('#11223344')).toBe('#11223344')
  })

  it('lo que no es un color, nulo', () => {
    expect(leerColorTipeado('#abc')).toBeNull()
    expect(leerColorTipeado('rojo')).toBeNull()
    expect(leerColorTipeado('#1122334')).toBeNull()
  })

  it('el selector del navegador conserva el alfa que había', () => {
    expect(conElAlfaDe('#FF0000', '#00000080')).toBe('#ff000080')
    expect(conElAlfaDe('#ff0000', '#000000')).toBe('#ff0000')
    expect(conElAlfaDe('#ff0000', null)).toBe('#ff0000')
  })
})

describe('la clave de fusión', () => {
  it('un campo sobre las mismas capas', () => {
    expect(claveDeFusion('x', ['a', 'b'])).toBe('inspector:x:a,b')
  })
})
