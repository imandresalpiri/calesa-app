import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from '../../../entities/binding'
import { entradasIniciales, indiceDeHoja } from '../../../entities/entradas'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import { hojaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { COLUMNAS_DE_LA_SECCION } from './clases-de-la-rejilla'
import { SeccionDeHoja } from './seccion-de-hoja'

afterEach(cleanup)

const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones, hoja.cabecera.modos)
const contexto: ContextoDeHoja = { indice, entradas: entradasIniciales(indice), respuesta: null }
const nada = () => undefined
const acciones: AccionesDeHoja = {
  alConfirmar: nada,
  alRestablecer: nada,
  alAlternarBandera: nada,
  alElegirVariante: nada,
  alElegirModo: nada,
  alElegirAtajo: nada,
}
const MARCO_DE_SIEMPRE =
  '@container grid min-w-0 content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4'

function dibujar(
  seccion: Seccion,
  enLaRejilla?: boolean,
  sinMarco?: boolean,
  corte?: 'siempre' | '5xl',
) {
  const { container } = render(
    <SeccionDeHoja
      seccion={seccion}
      contexto={contexto}
      acciones={acciones}
      enLaRejilla={enLaRejilla}
      sinMarco={sinMarco}
      {...(corte === undefined ? {} : { corte })}
    />,
  )
  const nodo = container.querySelector('[data-seccion]')
  if (!nodo) throw new Error('no se dibujó la sección')
  return nodo
}

describe('SeccionDeHoja', () => {
  const vieja = hoja.secciones[0]
  if (!vieja) throw new Error('la hoja de prueba no trae secciones')

  it('una sección sin aspecto se dibuja como siempre: sin `style`, sin `data-tono`, con su marco de siempre', () => {
    const nodo = dibujar(vieja)
    expect(nodo.hasAttribute('style')).toBe(false)
    expect(nodo.hasAttribute('data-tono')).toBe(false)
    expect(nodo.getAttribute('class')).toBe(MARCO_DE_SIEMPRE)
    // En la rejilla de las secciones, «Automática»: la mitad desde 64 rem, como antes.
    expect(dibujar(vieja, true).getAttribute('class')).toBe(
      `${COLUMNAS_DE_LA_SECCION.AUTOMATICA} ${MARCO_DE_SIEMPRE}`,
    )
  })

  it('con aspecto: el tono en `data-tono` y el aspecto en clases, sin nodos de más', () => {
    const conAspecto = dibujar({ ...vieja, ancho: 8, tono: 'verde', densidad: 'compacta' }, true)
    const sinAspecto = dibujar(vieja, true)
    expect(conAspecto.getAttribute('data-tono')).toBe('verde')
    expect(conAspecto.className).toContain('@lg/secciones:col-span-8')
    expect(conAspecto.className).toContain('[--xcell-relleno:calc(var(--spacing)*1)]')
    expect(conAspecto.hasAttribute('style')).toBe(false)
    expect(conAspecto.querySelectorAll('*').length).toBe(sinAspecto.querySelectorAll('*').length)
  })

  it('sin marco (el modal «Avanzado»): sin borde, fondo ni relleno, con los mismos nodos', () => {
    const sinMarco = dibujar({ ...vieja, tono: 'verde' }, false, true)
    expect(sinMarco.className).toBe('@container grid min-w-0 content-start gap-3')
    expect(sinMarco.getAttribute('data-tono')).toBe('verde')
    expect(sinMarco.querySelectorAll('*').length).toBe(dibujar(vieja).querySelectorAll('*').length)
  })

  it('con posiciones: los ítems en orden de lectura, cada uno con sus variables, y la rejilla con sus filas desde su corte', () => {
    const [primero, segundo] = vieja.items
    if (!primero || !segundo) throw new Error('la sección de prueba trae menos de dos ítems')
    // Declarados al revés: el segundo arriba, el primero dos filas debajo (la del medio, vacía).
    const enRejilla: Seccion = {
      ...vieja,
      posicion: { columna: 1, fila: 3 },
      items: [
        { ...primero, posicion: { columna: 1, fila: 3 } },
        { ...segundo, posicion: { columna: 1, fila: 1 } },
      ],
    }
    const nodo = dibujar(enRejilla, true, false, 'siempre')
    expect(nodo.getAttribute('style')).toBe(
      '--seccion-columna: 1; --seccion-fila: 3; --seccion-alto: 1;',
    )
    expect(nodo.className).toContain('col-start-(--seccion-columna)')
    const rejilla = nodo.querySelector(':scope > div')
    expect(rejilla?.getAttribute('style')).toBe('--filas-de-la-seccion: auto 2.5rem auto;')
    const items = [...(rejilla?.children ?? [])]
    expect(items.map((i) => i.getAttribute('data-nodo') ?? i.getAttribute('data-atajos'))).toEqual([
      segundo.nodo,
      primero.nodo,
    ])
    expect(items[0]?.getAttribute('style')).toBe(
      '--pieza-columna: 1; --pieza-fila: 1; --pieza-alto: 1;',
    )
    // Sin el corte de la rejilla de las secciones, la sección va en el flujo aunque traiga posición.
    expect(dibujar(enRejilla, true).hasAttribute('style')).toBe(false)
  })
})
