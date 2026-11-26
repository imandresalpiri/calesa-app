import { Fragment, type CSSProperties } from 'react'
import { COLOR_TINTA } from '@/shared/config/app'
import { MontoConDecimales } from '@/shared/ui/monto-con-decimales'
import { RELLENO_DE_LA_CELDA } from '../../../entities/tarjeta/estilo-de-la-celda'
import type { CeldaDibujada } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { TramoDelTexto } from '../../../entities/tarjeta/valor-del-dato'
import { FotoDelAsesorDeLaCelda } from './foto-del-asesor-de-la-celda'
import { LogoDeLaCelda } from './logo-de-la-celda'

const JUSTIFICAR = { arriba: 'flex-start', centro: 'center', abajo: 'flex-end' } as const
const ALINEAR = { izquierda: 'left', centro: 'center', derecha: 'right' } as const

// El rectángulo de la celda con su estilo: posiciones absolutas en px (la geometría ya las calculó), el fondo y el texto en hex (del catálogo o `auto`), el
// borde «negro» de la tarjeta (#1b2130) por lado y el relleno que completa 4 px con él. Son datos ya validados: van en línea.
function estiloDe(c: CeldaDibujada): CSSProperties {
  const { estilo: e, x, y, ancho, alto } = c
  const borde = (px: number) => `${String(px)}px solid ${COLOR_TINTA}`
  const relleno = (px: number) => Math.max(0, RELLENO_DE_LA_CELDA - px)
  return {
    position: 'absolute',
    left: x,
    top: y,
    width: ancho,
    height: alto,
    boxSizing: 'border-box',
    paddingTop: relleno(e.bordes.arriba),
    paddingRight: relleno(e.bordes.derecha),
    paddingBottom: relleno(e.bordes.abajo),
    paddingLeft: relleno(e.bordes.izquierda),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: JUSTIFICAR[e.alinearVertical],
    overflow: 'hidden',
    background: e.fondo,
    color: e.texto,
    fontSize: e.tamano,
    lineHeight: 1.4,
    fontWeight: e.negrita ? 600 : 400,
    fontStyle: e.cursiva ? 'italic' : 'normal',
    textAlign: ALINEAR[e.alinear],
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    borderTop: borde(e.bordes.arriba),
    borderRight: borde(e.bordes.derecha),
    borderBottom: borde(e.bordes.abajo),
    borderLeft: borde(e.bordes.izquierda),
  }
}

type Logo = { nombre: string; url: string } | null

// Un texto con datos que lleva un monto, por tramos: cada monto con `<Monto>` (el Modo Live lo tapa) y nunca su texto entero, que dejaría la cifra a la vista.
function TextoPorTramos({ tramos }: { tramos: readonly TramoDelTexto[] }) {
  return (
    <span>
      {tramos.map((t, i) => (
        <Fragment key={i}>
          {typeof t === 'string' ? (
            t
          ) : (
            <MontoConDecimales valor={t.valor} moneda={t.moneda} decimales={t.decimales} />
          )}
        </Fragment>
      ))}
    </span>
  )
}

function Contenido({
  celda,
  logo,
  alFallarElLogo,
}: {
  celda: CeldaDibujada
  logo: Logo
  alFallarElLogo: (() => void) | undefined
}) {
  const c = celda.contenido
  switch (c.tipo) {
    case 'texto':
      if (c.tramos !== undefined) return <TextoPorTramos tramos={c.tramos} />
      return c.lineas.length === 0 ? null : <span>{c.lineas.join('\n')}</span>
    case 'monto':
      return (
        <>
          <MontoConDecimales valor={c.valor} moneda={c.moneda} decimales={c.decimales} />
          {c.segunda === null ? null : (
            <span data-total-bs-de-la-tarjeta="">
              <MontoConDecimales
                valor={c.segunda.valor}
                moneda={c.segunda.moneda}
                decimales={c.segunda.decimales}
              />
            </span>
          )}
        </>
      )
    case 'logo':
      // La caja interior: la celda menos `RELLENO_DE_LA_CELDA` por lado (el borde va adentro del relleno).
      return logo === null ? null : (
        <LogoDeLaCelda
          logo={logo}
          ancho={Math.max(0, celda.ancho - 2 * RELLENO_DE_LA_CELDA)}
          alto={Math.max(0, celda.alto - 2 * RELLENO_DE_LA_CELDA)}
          estilo={celda.estilo}
          {...(alFallarElLogo ? { alFallar: alFallarElLogo } : {})}
        />
      )
    case 'foto_del_asesor':
      return <FotoDelAsesorDeLaCelda celda={celda} foto={c} />
    case 'vacio':
      return null
  }
}

// Una celda de la tarjeta, con sus `data-*` para las pruebas (la fila, la columna, el nodo y qué muestra, la variable, el color, el total y el texto con datos).
// Los montos van con `<Monto>`, también los de un texto con datos: el Modo Live los tapa. La celda logo dibuja sólo el logo, a la medida de la celda (`<LogoDeLaCelda>`); si no carga, `alFallarElLogo`. La foto del
// asesor, `<FotoDelAsesorDeLaCelda>` (sin foto, sus iniciales en un círculo).
export function CeldaDeLaTarjeta({
  celda,
  logo,
  alFallarElLogo,
}: {
  celda: CeldaDibujada
  logo: Logo
  alFallarElLogo?: () => void
}) {
  const m = celda.marca
  return (
    <div
      data-celda={celda.id}
      data-fila={celda.fila}
      data-columna={celda.columna}
      {...(m.nodo === undefined ? {} : { 'data-nodo': m.nodo, 'data-mostrar': m.mostrar })}
      {...(m.variable === undefined ? {} : { 'data-variable': m.variable })}
      {...(m.color === undefined ? {} : { 'data-color': m.color })}
      {...(m.total === true ? { 'data-total-usd': '' } : {})}
      {...(m.conDatos === true ? { 'data-texto-con-datos': '' } : {})}
      style={estiloDe(celda)}
    >
      <Contenido celda={celda} logo={logo} alFallarElLogo={alFallarElLogo} />
    </div>
  )
}
