import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '../guion-live'
import {
  PARADA_DE_ACCIONES_DESDE,
  PARADA_DE_AJUSTES,
  PARADA_DE_AYUDA,
  PARADA_DEL_CANDADO,
  PARADA_DE_RESTABLECER,
} from './cabecera-de-xcell'
import { ID_DEL_ATAJO, SimbolosDeXCell, TEXTO_DEL_ATAJO } from './simbolos-de-xcell'
import { BASE, celda } from './xcell.soporte'
import { XCell } from './index'

// El Modo Live es una clase en <html> (`../live.ts`): se enciende para una prueba y se apaga al terminar.
const conLive = () => {
  document.documentElement.classList.add(CLASE_LIVE)
}
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

const ACCIONES = () => ({ hasHelp: true, onHelp: vi.fn(), hasSettings: true, onSettings: vi.fn() })

describe('la ayuda y el ⚙', () => {
  it('sin banderas no hay botones', () => {
    const c = celda()
    expect(c.parada(PARADA_DE_AYUDA)).toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).toBeNull()
  })

  it('con la bandera y sin el callback (o al revés) no se dibujan: la celda no inventa una acción muerta', () => {
    const c = celda({ hasHelp: true, onSettings: vi.fn() })
    expect(c.parada(PARADA_DE_AYUDA)).toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).toBeNull()
  })

  it('cada una se llama como el glosario, con la etiqueta de la celda, y no es parada de Tab', () => {
    const c = celda(ACCIONES())
    const ayuda = c.parada(PARADA_DE_AYUDA)
    const ajustes = c.parada(PARADA_DE_AJUSTES)
    expect(ayuda?.getAttribute('aria-label')).toBe('Ayuda de Fees')
    expect(ajustes?.getAttribute('aria-label')).toBe('Cambiar el valor por defecto de Fees')
    expect(ayuda?.getAttribute('tabindex')).toBe('-1')
    expect(ajustes?.getAttribute('tabindex')).toBe('-1')
  })

  it('emiten el id de la celda (no el del secundario) y no mueven el foco', () => {
    const props = ACCIONES()
    const c = celda({
      ...props,
      secondaryId: 'p',
      secondaryFormat: 'porcentaje',
      secondaryValue: 0.1,
    })
    const ayuda = c.parada(PARADA_DE_AYUDA)
    if (!ayuda) throw new Error('sin ayuda')
    ayuda.focus()
    fireEvent.click(ayuda)
    fireEvent.click(c.parada(PARADA_DE_AJUSTES) as HTMLElement)
    expect(props.onHelp).toHaveBeenCalledExactlyOnceWith('fees')
    expect(props.onSettings).toHaveBeenCalledExactlyOnceWith('fees')
    expect(document.activeElement).toBe(ayuda)
  })

  it('el orden de la ranura es el de V1: candado → ⚙ → ayuda → ↺, y el DOM lo sigue', () => {
    const orden = (props: Parameters<typeof celda>[0]) =>
      [...celda(props).raiz.querySelectorAll('[data-parada]')]
        .map((e) => Number(e.getAttribute('data-parada')))
        .filter((n) => n >= PARADA_DE_ACCIONES_DESDE)
    expect(orden({ ...ACCIONES(), overridden: true })).toEqual([
      PARADA_DE_AJUSTES,
      PARADA_DE_AYUDA,
      PARADA_DE_RESTABLECER,
    ])
    cleanup()
    // Un par con un lado bloqueado: el candado y ↺ conviven.
    expect(
      orden({
        ...ACCIONES(),
        overridden: true,
        secondaryId: 'p',
        secondaryFormat: 'porcentaje',
        secondaryValue: 0.1,
        disabledReason: 'Se calcula',
      }),
    ).toEqual([PARADA_DEL_CANDADO, PARADA_DE_AJUSTES, PARADA_DE_AYUDA, PARADA_DE_RESTABLECER])
  })

  it('deshabilitada: la ayuda y el ⚙ siguen (no escriben aquí); ↺ no', () => {
    const c = celda({ ...ACCIONES(), overridden: true, disabledReason: 'Apagado' })
    expect(c.parada(PARADA_DE_AYUDA)).not.toBeNull()
    expect(c.parada(PARADA_DE_AJUSTES)).not.toBeNull()
    expect(c.parada(PARADA_DE_RESTABLECER)).toBeNull()
  })

  it('en Modo Live siguen y no dicen ningún símbolo de moneda', () => {
    conLive()
    const { container } = render(<XCell {...BASE} {...ACCIONES()} />)
    const texto = [...container.querySelectorAll('[data-parada]')]
      .filter((e) => Number(e.getAttribute('data-parada')) >= PARADA_DE_ACCIONES_DESDE)
      .map((e) => `${e.getAttribute('aria-label') ?? ''}${e.getAttribute('title') ?? ''}`)
      .join(' ')
    expect(container.querySelectorAll('[data-parada]')).toHaveLength(3)
    expect(texto).not.toMatch(/USD|US\$|\$|Bs/u)
  })
})

describe('el anuncio de las flechas', () => {
  it('el candado no anuncia el atajo: sólo con ⚙, ayuda o ↺ el valor dice «Más acciones…»', () => {
    const c = celda({ disabledReason: 'Apagado' })
    expect(c.parada(PARADA_DEL_CANDADO)).not.toBeNull()
    expect(c.parada(0)?.getAttribute('aria-keyshortcuts')).toBeNull()
    expect(c.parada(0)?.getAttribute('aria-describedby')).not.toContain(ID_DEL_ATAJO)
  })

  const descripcion = (e: HTMLElement | null) => e?.getAttribute('aria-describedby') ?? ''

  it('el valor lo dice sólo cuando la celda tiene acciones, en los dos lados del par', () => {
    const par = {
      secondaryId: 'p',
      secondaryFormat: 'porcentaje' as const,
      secondaryValue: 0.1,
    }
    const sin = celda(par)
    expect(descripcion(sin.parada(0))).toBe('')
    expect(sin.parada(0)?.getAttribute('aria-keyshortcuts')).toBeNull()
    cleanup()
    for (const props of [{ hasHelp: true, onHelp: vi.fn() }, { overridden: true }]) {
      const con = celda({ ...par, ...props })
      for (const lado of [0, 1]) {
        expect(descripcion(con.parada(lado))).toContain(ID_DEL_ATAJO)
        expect(con.parada(lado)?.getAttribute('aria-keyshortcuts')).toBe('ArrowRight')
      }
      cleanup()
    }
  })

  it('el candado va antes que el atajo, y el texto vive una vez en el sprite', () => {
    const { container } = render(
      <>
        <SimbolosDeXCell />
        <XCell {...BASE} {...ACCIONES()} disabledReason="Apagado" />
      </>,
    )
    const boton = container.querySelector('[data-parada="0"]')
    const candado = container.querySelector('[role="img"]')
    expect(boton?.getAttribute('aria-describedby')).toBe(`${candado?.id ?? ''} ${ID_DEL_ATAJO}`)
    expect(candado?.getAttribute('aria-label')).toBe('Apagado')
    expect(container.querySelector(`#${ID_DEL_ATAJO}`)?.textContent).toBe(TEXTO_DEL_ATAJO)
  })
})

describe('la entrada con el Modo Live', () => {
  const abrirEntrada = (live: boolean) => {
    if (live) conLive()
    const { container } = render(<XCell {...BASE} />)
    fireEvent.click(container.querySelector('[data-parada="0"]') as HTMLElement)
    return container.querySelector('input') as HTMLInputElement
  }

  it('con Live y sin él es un cuadro de texto con el número a la vista, sin moneda', () => {
    for (const live of [true, false]) {
      const entrada = abrirEntrada(live)
      expect(entrada.type).toBe('text')
      expect(entrada.getAttribute('autocomplete')).toBe('off')
      expect(entrada.value).not.toMatch(/[A-Z$]/u)
      cleanup()
      document.documentElement.classList.remove(CLASE_LIVE)
    }
  })
})
