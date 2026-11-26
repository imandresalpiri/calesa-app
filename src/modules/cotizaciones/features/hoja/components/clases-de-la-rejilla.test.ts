import { describe, expect, it } from 'vitest'
import { esquemaDiseno, type Diseno } from '../../../entities/diseno'
import { corteDe } from '../../../entities/rejilla-de-la-hoja'
import { juegoDisenos, sembrada, SEMILLAS, type Clave } from '../../../entities/semilla-lectura'
import {
  claseDeLaCabecera,
  claseDeLaRejillaDeCeldas,
  claseDeLaSeccionEnLaRejilla,
  claseDelItem,
  claseDelMarcoDeLaSeccion,
  claseDelTitulo,
  COLUMNAS_DE_LA_SECCION,
  COLUMNAS_DEL_ITEM,
  FILAS_DE_LA_SECCION,
  FILAS_DEL_ITEM,
} from './clases-de-la-rejilla'

// Las clases de antes del aspecto, congeladas: un diseño sin aspecto se dibuja letra por letra igual.
const ANTES = {
  item: {
    completo: 'col-span-12',
    mitad: 'col-span-12 @lg:col-span-6',
    tercio: 'col-span-12 @3xl:col-span-4',
  },
  otroItem: 'col-span-12',
  seccion:
    '@container grid min-w-0 content-start gap-3 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4',
  celdas: 'grid grid-cols-12 gap-x-0 gap-y-3 @lg:gap-x-3',
  cabecera: 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1',
} as const

const CLAVES_DEL_ASPECTO = ['alto', 'letra', 'enfasis', 'relleno', 'separacion', 'densidad', 'tono']
const conAspecto = (d: unknown) =>
  JSON.stringify(d).match(new RegExp(`"(${CLAVES_DEL_ASPECTO.join('|')})":`)) !== null ||
  (d as Diseno).secciones.some(
    (s) =>
      s.ancho !== undefined || s.items.some((i) => i.tipo !== 'celda' && i.ancho !== undefined),
  )

// El título de una sección, como en V1 (chico, en mayúsculas y en la tinta suave), con o sin aspecto.
const TITULO =
  'text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase'

// Los diseños de antes: los de las tres semillas y los válidos del juego sin aspecto (los de las celdas con ancho en número entran aparte).
const viejos: [string, Diseno][] = [
  ...(Object.keys(SEMILLAS) as Clave[]).map((c): [string, Diseno] => [
    `semilla ${c}`,
    esquemaDiseno.parse(sembrada(c).diseno),
  ]),
  ...juegoDisenos.casos
    .filter((c) => c.valida && !conAspecto(c.diseno))
    .map((c): [string, Diseno] => [c.nombre, esquemaDiseno.parse(c.diseno)]),
]

describe('un diseño viejo se ve igual', () => {
  it('trae las semillas y decenas de diseños del juego', () => {
    expect(viejos.length).toBeGreaterThan(40)
  })

  it.each(viejos)('%s', (_nombre, d) => {
    expect(claseDeLaCabecera(d.cabecera)).toBe(ANTES.cabecera)
    for (const s of d.secciones) {
      expect(claseDeLaSeccionEnLaRejilla(s)).toBe(COLUMNAS_DE_LA_SECCION.AUTOMATICA)
      expect(claseDelMarcoDeLaSeccion(s)).toBe(ANTES.seccion)
      expect(claseDeLaRejillaDeCeldas(s)).toBe(ANTES.celdas)
      expect(claseDelTitulo(s)).toBe(TITULO)
      for (const i of s.items) {
        const antes =
          i.tipo === 'celda'
            ? typeof i.ancho === 'number'
              ? undefined
              : ANTES.item[i.ancho]
            : ANTES.otroItem
        if (antes !== undefined) expect(claseDelItem(i)).toBe(antes)
      }
    }
  })

  it('12, 6 y 4 columnas dan lo mismo que completo, mitad y tercio', () => {
    expect(claseDelItem({ tipo: 'celda', ancho: 12 })).toBe(ANTES.item.completo)
    expect(claseDelItem({ tipo: 'celda', ancho: 6 })).toBe(ANTES.item.mitad)
    expect(claseDelItem({ tipo: 'celda', ancho: 4 })).toBe(ANTES.item.tercio)
  })
})

describe('el aspecto en clases', () => {
  it('cada ancho de un ítem va desde el corte de la regla de 16 rem, y cada uno de una sección también', () => {
    for (let n = 1; n <= 12; n++) {
      const corte = corteDe(n)
      const item = COLUMNAS_DEL_ITEM[n] ?? ''
      const seccion = COLUMNAS_DE_LA_SECCION[n] ?? ''
      if (corte === 'siempre') {
        expect([item, seccion]).toEqual(['col-span-12', 'col-span-12'])
      } else {
        expect(item).toBe(`col-span-12 @${corte}:col-span-${String(n)}`)
        expect(seccion).toBe(`col-span-12 @${corte}/secciones:col-span-${String(n)}`)
      }
    }
  })

  it('el alto va desde el mismo corte que las columnas, estira lo de adentro y no se aplica a lo que ocupa la fila', () => {
    expect(claseDelItem({ tipo: 'celda', ancho: 8, alto: 3 })).toBe(
      'col-span-12 @lg:col-span-8 @lg:row-span-3 [&>*]:h-full',
    )
    expect(claseDelItem({ tipo: 'subtotal', ancho: 4, alto: 2 })).toBe(
      `${COLUMNAS_DEL_ITEM[4] ?? ''} ${FILAS_DEL_ITEM['3xl'][2]} [&>*]:h-full`,
    )
    expect(claseDelItem({ tipo: 'celda', ancho: 'completo', alto: 4 })).toBe('col-span-12')
    expect(claseDelItem({ tipo: 'variante', alto: 2 })).toBe('col-span-12')
    expect(claseDeLaSeccionEnLaRejilla({ alto: 2 })).toBe(
      `${COLUMNAS_DE_LA_SECCION.AUTOMATICA} ${FILAS_DE_LA_SECCION['5xl'][2]} self-stretch`,
    )
    expect(claseDeLaSeccionEnLaRejilla({ ancho: 3, alto: 4 })).toBe(
      'col-span-12 @5xl/secciones:col-span-3 @5xl/secciones:row-span-4 self-stretch',
    )
  })

  it('letra, énfasis, relleno, separación, densidad y tono', () => {
    expect(claseDelItem({ tipo: 'interruptor', ancho: 6, letra: 'chica', enfasis: 'fuerte' })).toBe(
      'col-span-12 @lg:col-span-6 [--text-sm:var(--text-xs)] font-semibold',
    )
    const s = {
      relleno: 'grande',
      separacion: 'chica',
      densidad: 'compacta',
      letra: 'grande',
      enfasis: 'fuerte',
      tono: 'verde',
    } as const
    expect(claseDelMarcoDeLaSeccion(s)).toBe(
      '@container grid min-w-0 content-start gap-3 rounded-(--radius-card) border border-[color:var(--tono-borde,var(--color-line))] bg-(--color-surface) p-6 [--xcell-relleno:calc(var(--spacing)*1)] [--xcell-separacion:calc(var(--spacing)*0.5)] [--xcell-alto:40px] [--text-sm:var(--text-base)] font-semibold',
    )
    expect(claseDeLaRejillaDeCeldas(s)).toBe('grid grid-cols-12 gap-x-0 gap-y-2 @lg:gap-x-2')
    expect(claseDelTitulo(s)).toBe(
      'text-(length:--text-sm) font-semibold tracking-wide text-(--color-ink-soft) uppercase',
    )
    // La letra chica no achica el título.
    expect(claseDelTitulo({ letra: 'chica' })).toBe(TITULO)
    // Sin marco (el modal «Avanzado»): sin borde, fondo ni relleno; la densidad y la letra quedan.
    expect(claseDelMarcoDeLaSeccion(s, { sinMarco: true })).toBe(
      '@container grid min-w-0 content-start gap-3 [--xcell-relleno:calc(var(--spacing)*1)] [--xcell-separacion:calc(var(--spacing)*0.5)] [--xcell-alto:40px] [--text-sm:var(--text-base)] font-semibold',
    )
  })

  it('la cabecera es una caja sólo con tono o relleno', () => {
    expect(claseDeLaCabecera({ letra: 'grande' })).toBe(
      'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 [--text-sm:var(--text-base)]',
    )
    expect(claseDeLaCabecera({ tono: 'verde' })).toBe(
      'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-card) border border-[color:var(--tono-borde,var(--color-line))] bg-(--color-surface) px-3 py-1',
    )
    expect(claseDeLaCabecera({ relleno: 'chico', enfasis: 'fuerte' })).toBe(
      'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-2 py-0.5 font-semibold',
    )
  })
})
