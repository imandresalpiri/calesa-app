import { describe, expect, it } from 'vitest'
import {
  AVISO_DE_LA_PAGINA_CON_PERMISO,
  AVISO_DE_LA_PAGINA_SIN_PERMISO,
  avisosDeLaPagina,
  avisosDelRol,
  nombreDelBotonDeAvisos,
  tituloDeAvisosDelRol,
} from './avisos-de-roles'
import { MOTIVO_SIN_GESTIONAR_ROLES } from './cuadro-de-cotizaciones'
import { MOTIVO_ROL_NO_DOMINADO } from './dominancia'

const NADIE = { n: 0, hayMas: false }
const ALGUIEN = { n: 3, hayMas: false }

describe('avisosDelRol', () => {
  it('un rol propio que domino y nadie tiene no avisa nada', () => {
    expect(
      avisosDelRol({ esSistema: false, personas: NADIE }, { dominado: true, puedeGestionar: true }),
    ).toEqual([])
  })

  it('un rol que no domino avisa que no se puede cambiar ni asignar', () => {
    expect(
      avisosDelRol(
        { esSistema: false, personas: NADIE },
        { dominado: false, puedeGestionar: true },
      ),
    ).toEqual([MOTIVO_ROL_NO_DOMINADO])
  })

  it('un rol con personas, que domino, dice que se las quite antes de eliminarlo', () => {
    expect(
      avisosDelRol(
        { esSistema: false, personas: ALGUIEN },
        { dominado: true, puedeGestionar: true },
      ),
    ).toEqual(['Quítaselo a las personas que lo tienen antes de eliminarlo.'])
  })

  it('un rol de sistema avisa que no se elimina, y antes que no lo domino', () => {
    expect(
      avisosDelRol(
        { esSistema: true, personas: ALGUIEN },
        { dominado: true, puedeGestionar: true },
      ),
    ).toEqual(['Un rol de sistema no se elimina.'])
    expect(
      avisosDelRol(
        { esSistema: true, personas: ALGUIEN },
        { dominado: false, puedeGestionar: true },
      ),
    ).toEqual([MOTIVO_ROL_NO_DOMINADO, 'Un rol de sistema no se elimina.'])
  })

  it('no repite el aviso de que no lo domino cuando también es el motivo de no eliminarlo', () => {
    expect(
      avisosDelRol(
        { esSistema: false, personas: ALGUIEN },
        { dominado: false, puedeGestionar: true },
      ),
    ).toEqual([MOTIVO_ROL_NO_DOMINADO])
  })

  it('a quien no gestiona roles no le avisa nada: no hay qué ofrecerle', () => {
    expect(
      avisosDelRol(
        { esSistema: true, personas: ALGUIEN },
        { dominado: false, puedeGestionar: false },
      ),
    ).toEqual([])
  })
})

describe('avisosDeLaPagina', () => {
  it('dice uno u otro según pueda gestionar roles', () => {
    expect(avisosDeLaPagina(true)).toEqual([AVISO_DE_LA_PAGINA_CON_PERMISO])
    expect(avisosDeLaPagina(false)).toEqual([
      AVISO_DE_LA_PAGINA_SIN_PERMISO,
      MOTIVO_SIN_GESTIONAR_ROLES,
    ])
  })
})

describe('el botón de avisos', () => {
  it('se llama «Avisos de <rol>» y, con varios, suma la cantidad', () => {
    const titulo = tituloDeAvisosDelRol('Asesor')
    expect(titulo).toBe('Avisos de Asesor')
    expect(nombreDelBotonDeAvisos(titulo, 1)).toBe('Avisos de Asesor')
    expect(nombreDelBotonDeAvisos(titulo, 2)).toBe('Avisos de Asesor (2)')
  })
})
