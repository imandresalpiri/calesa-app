import { describe, expect, it } from 'vitest'
import {
  ANCHO_MINIMO_DE_LA_VENTANA,
  MARGEN_DE_LA_VENTANA,
  VENTANA_POR_DEFECTO,
  altoDelVideo,
  anchoMaximoDe,
  cargoAMostrar,
  contactoAMostrar,
  direccionLegible,
  esquemaDeLaVentanaDeCamara,
  limitarElAncho,
  llevarAdentro,
  porcentajeDePosicion,
  posicionEnPx,
  logoDeLaVentana,
  ventanaDesde,
  type DatosDeQuienPresenta,
} from './ventana-de-camara'

const NAVEGADOR = { ancho: 1440, alto: 900 }
const VENTANA = { ancho: 280, alto: 300 }

describe('la forma guardada (espejo del check de la base)', () => {
  it('acepta lo que guarda la interfaz y lo de fábrica', () => {
    expect(esquemaDeLaVentanaDeCamara.safeParse(VENTANA_POR_DEFECTO).success).toBe(true)
    expect(
      esquemaDeLaVentanaDeCamara.safeParse({
        ...VENTANA_POR_DEFECTO,
        x: 0,
        y: 100,
        ancho: 200,
        datos: ['nombre_y_cargo', 'contacto', 'logo', 'redes_y_web'],
        camara: 'abc',
      }).success,
    ).toBe(true)
  })

  it.each([
    ['una posición fuera de 0–100', { x: 101 }],
    ['una posición negativa', { y: -1 }],
    ['un ancho menor al mínimo', { ancho: 199 }],
    ['un ancho que la base no admite', { ancho: 4001 }],
    ['un dato que no existe', { datos: ['telefono'] }],
    ['una cámara de más de 300 letras', { camara: 'a'.repeat(301) }],
    ['un booleano que no lo es', { espejo: 'si' }],
    ['un logo que no es «oscuro» ni un id', { logo: 'monocromo' }],
  ])('rechaza %s', (_motivo, cambio) => {
    expect(
      esquemaDeLaVentanaDeCamara.safeParse({ ...VENTANA_POR_DEFECTO, ...cambio }).success,
    ).toBe(false)
  })
})

describe('ventanaDesde(): lo guardado, tolerante', () => {
  it('sin nada guardado, lo de fábrica', () => {
    expect(ventanaDesde(null)).toEqual(VENTANA_POR_DEFECTO)
    expect(ventanaDesde([])).toEqual(VENTANA_POR_DEFECTO)
    expect(ventanaDesde({})).toEqual(VENTANA_POR_DEFECTO)
  })

  it('lo que sirve se queda y lo que no vuelve a lo de fábrica, campo por campo', () => {
    const leida = ventanaDesde({
      x: 20,
      y: 500,
      ancho: 320,
      minimizada: true,
      datos: ['logo', 'viejo'],
    })
    expect(leida.x).toBe(20)
    expect(leida.ancho).toBe(320)
    expect(leida.minimizada).toBe(true)
    expect(leida.y).toBe(VENTANA_POR_DEFECTO.y)
    expect(leida.datos).toEqual(VENTANA_POR_DEFECTO.datos)
  })

  it('el logo elegido: null (el principal), «oscuro» o el id de una variante; otra cosa vuelve a null', () => {
    const id = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f'
    expect(ventanaDesde({ logo: null }).logo).toBeNull()
    expect(ventanaDesde({ logo: 'oscuro' }).logo).toBe('oscuro')
    expect(ventanaDesde({ logo: id }).logo).toBe(id)
    expect(ventanaDesde({ logo: 'monocromo' }).logo).toBeNull()
    expect(esquemaDeLaVentanaDeCamara.safeParse({ ...VENTANA_POR_DEFECTO, logo: id }).success).toBe(
      true,
    )
  })

  it('una cámara null se conserva como «la primera»', () => {
    expect(ventanaDesde({ camara: null }).camara).toBeNull()
    expect(ventanaDesde({ camara: 'abc' }).camara).toBe('abc')
  })
})

describe('el tamaño', () => {
  it('el máximo es la mitad de la ventana del navegador y el mínimo, 200 px', () => {
    expect(anchoMaximoDe(1440)).toBe(720)
    expect(anchoMaximoDe(1024)).toBe(512)
    expect(anchoMaximoDe(300)).toBe(ANCHO_MINIMO_DE_LA_VENTANA)
  })

  it('limita el ancho a esos topes', () => {
    expect(limitarElAncho(100, 1440)).toBe(200)
    expect(limitarElAncho(5000, 1440)).toBe(720)
    expect(limitarElAncho(333.4, 1440)).toBe(333)
  })

  it('el video es 16:9 también sin cámara', () => {
    expect(altoDelVideo(320)).toBe(180)
    expect(altoDelVideo(200)).toBe(113)
  })
})

describe('el lugar', () => {
  it('0 y 100 son los dos extremos, siempre adentro y con margen', () => {
    expect(posicionEnPx({ x: 0, y: 0 }, VENTANA, NAVEGADOR)).toEqual({
      x: MARGEN_DE_LA_VENTANA,
      y: MARGEN_DE_LA_VENTANA,
    })
    expect(posicionEnPx({ x: 100, y: 100 }, VENTANA, NAVEGADOR)).toEqual({
      x: NAVEGADOR.ancho - VENTANA.ancho - MARGEN_DE_LA_VENTANA,
      y: NAVEGADOR.alto - VENTANA.alto - MARGEN_DE_LA_VENTANA,
    })
  })

  it('el mismo % en otra ventana del navegador cae en el mismo lugar relativo', () => {
    const grande = posicionEnPx({ x: 50, y: 50 }, VENTANA, NAVEGADOR)
    const chica = posicionEnPx({ x: 50, y: 50 }, VENTANA, { ancho: 1100, alto: 700 })
    expect(grande.x).toBeGreaterThan(chica.x)
    expect(chica.x + VENTANA.ancho).toBeLessThanOrEqual(1100)
    expect(chica.y + VENTANA.alto).toBeLessThanOrEqual(700)
  })

  it('el % y los px se convierten uno en el otro', () => {
    const px = posicionEnPx({ x: 37.5, y: 62.5 }, VENTANA, NAVEGADOR)
    const vuelta = porcentajeDePosicion(px, VENTANA, NAVEGADOR)
    expect(vuelta.x).toBeCloseTo(37.5, 1)
    expect(vuelta.y).toBeCloseTo(62.5, 1)
  })

  it('una posición fuera del navegador queda en el borde (0 o 100)', () => {
    expect(porcentajeDePosicion({ x: -500, y: 5000 }, VENTANA, NAVEGADOR)).toEqual({ x: 0, y: 100 })
  })

  it('sin espacio libre la ventana queda contra el margen y el % es 0', () => {
    const chico = { ancho: 250, alto: 250 }
    expect(posicionEnPx({ x: 100, y: 100 }, VENTANA, chico)).toEqual({
      x: MARGEN_DE_LA_VENTANA,
      y: MARGEN_DE_LA_VENTANA,
    })
    expect(porcentajeDePosicion({ x: 50, y: 50 }, VENTANA, chico)).toEqual({ x: 0, y: 0 })
  })

  it('al achicar el navegador, una esquina que quedó afuera vuelve adentro', () => {
    const adentro = llevarAdentro({ x: 1300, y: 800 }, VENTANA, { ancho: 1000, alto: 600 })
    expect(adentro).toEqual({
      x: 1000 - 280 - MARGEN_DE_LA_VENTANA,
      y: 600 - 300 - MARGEN_DE_LA_VENTANA,
    })
    expect(llevarAdentro({ x: -40, y: -9 }, VENTANA, NAVEGADOR)).toEqual({
      x: MARGEN_DE_LA_VENTANA,
      y: MARGEN_DE_LA_VENTANA,
    })
    // Una que ya está adentro no se mueve.
    expect(llevarAdentro({ x: 100, y: 120 }, VENTANA, NAVEGADOR)).toEqual({ x: 100, y: 120 })
  })
})

const PERSONA: DatosDeQuienPresenta = {
  nombre: 'Ana Pérez',
  cargo: 'Asesora',
  cargoWeb: 'Asesora comercial',
  telefono: '+591 70000000',
  whatsapp: null,
  empresa: {
    nombre: 'Importadora',
    logoUrl: null,
    logoOscuroUrl: null,
    logos: [],
    redes: [],
    web: null,
  },
}

describe('el logo que dibuja la ventana', () => {
  const empresa = {
    ...PERSONA.empresa,
    logoUrl: 'https://x/principal.png',
    logoOscuroUrl: 'https://x/oscuro.png',
    logos: [
      { id: 'principal', nombre: 'Principal', url: 'https://x/principal.png' },
      { id: 'oscuro', nombre: 'Para fondo oscuro', url: 'https://x/oscuro.png' },
      { id: 'abc', nombre: 'Ícono', url: 'https://x/icono.png' },
    ],
  }

  it('sin elegir, el principal con su pareja oscura', () => {
    expect(logoDeLaVentana(empresa, null)).toEqual({
      url: 'https://x/principal.png',
      oscuro: 'https://x/oscuro.png',
      enOscuro: false,
    })
  })

  it('una variante elegida va sola; la de fondo oscuro, sobre fondo oscuro', () => {
    expect(logoDeLaVentana(empresa, 'abc')).toEqual({
      url: 'https://x/icono.png',
      oscuro: null,
      enOscuro: false,
    })
    expect(logoDeLaVentana(empresa, 'oscuro')?.enOscuro).toBe(true)
  })

  it('una variante que ya no está vuelve al principal, y sin principal no hay logo', () => {
    expect(logoDeLaVentana(empresa, 'quitada')?.url).toBe('https://x/principal.png')
    expect(logoDeLaVentana({ ...empresa, logoUrl: null }, 'quitada')).toBeNull()
  })
})

describe('los datos de quien presenta', () => {
  it('con la ficha web, el cargo de la ficha; sin ella o sin cargo web, el del equipo', () => {
    expect(cargoAMostrar(PERSONA, false)).toBe('Asesora')
    expect(cargoAMostrar(PERSONA, true)).toBe('Asesora comercial')
    expect(cargoAMostrar({ ...PERSONA, cargoWeb: null }, true)).toBe('Asesora')
    expect(cargoAMostrar({ ...PERSONA, cargo: null, cargoWeb: null }, true)).toBeNull()
    expect(cargoAMostrar({ ...PERSONA, cargo: '' }, false)).toBeNull()
  })

  it('WhatsApp primero, después el teléfono, y nada si no hay ninguno', () => {
    expect(contactoAMostrar(PERSONA)).toBe('+591 70000000')
    expect(contactoAMostrar({ ...PERSONA, whatsapp: '+591 71111111' })).toBe('+591 71111111')
    expect(contactoAMostrar({ ...PERSONA, telefono: null })).toBeNull()
  })

  it('la dirección se lee sin esquema ni barra final', () => {
    expect(direccionLegible('https://www.instagram.com/importadora/')).toBe(
      'instagram.com/importadora',
    )
    expect(direccionLegible(' http://sitio.bo ')).toBe('sitio.bo')
  })
})
