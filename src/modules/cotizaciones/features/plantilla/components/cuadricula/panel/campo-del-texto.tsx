'use client'

import { useId, useState } from 'react'
import {
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  type ContenidoDeLaCelda,
  type DatoDeLaCelda,
  type ParteDelTexto,
  type TextoConDatos,
  type TextoSimple,
} from '../../../../../entities/cuadricula-de-la-tarjeta'
import { motivoDelContenidoDeTexto } from '../../../../../entities/plantilla/edicion/contenido'
import {
  cambiarDato,
  contenidoDeLasPartes,
  datoJuntoAlCursor,
  insertarDato,
  largoEnUnidades,
  motivoParaInsertar,
  partesDe,
} from '../../../../../entities/plantilla/edicion/texto-con-datos'
import type { ContextoDePlantilla } from '../../../../../entities/plantilla/validar-plantilla'
import { caracteresDeLasPartes } from '../../../../../entities/texto-con-datos'
import { useTextoConPastillas } from '../../../hooks/use-texto-con-pastillas'
import { InsertarDato } from './insertar-dato'
import { TextoConPastillas } from './texto-con-pastillas'

type Props = {
  contenido: TextoSimple | TextoConDatos
  // La clave que junta en un solo paso lo que se escribe en esta celda.
  clave: string
  contexto: ContextoDePlantilla
  nombrados: ReadonlySet<string>
  alCambiar: (contenido: ContenidoDeLaCelda, clave?: string) => void
  alDeshacer: () => void
  alRehacer: () => void
}

// El buscador de «Insertar dato»: inserta en el cursor o cambia la pastilla `i` (la tocada o la recién insertada, hasta «Listo»); `despues`, dónde queda el
// cursor al cerrarlo.
type Buscador =
  | { readonly modo: 'insertar' }
  | { readonly modo: 'cambiar'; readonly i: number; readonly despues: number }
type Cursor = { readonly desde: number; readonly hasta: number }

const mismas = (a: readonly ParteDelTexto[], b: readonly ParteDelTexto[]) =>
  JSON.stringify(a) === JSON.stringify(b)
const motivoDe = (partes: readonly ParteDelTexto[]) =>
  motivoDelContenidoDeTexto(contenidoDeLasPartes(partes))
const datoEn = (partes: readonly ParteDelTexto[], i: number): DatoDeLaCelda | null => {
  const p = partes[i]
  return p === undefined || typeof p === 'string' ? null : p
}
const cambiarLa = (partes: readonly ParteDelTexto[], i: number): Buscador => ({
  modo: 'cambiar',
  i,
  despues: largoEnUnidades(partes.slice(0, i + 1)),
})

// Elegir un dato en el buscador: las partes nuevas y cómo sigue (cerrado con el cursor en `pos`, o atado a la pastilla de un nodo para «Qué mostrar»).
function conElDato(
  partes: readonly ParteDelTexto[],
  buscador: Buscador,
  c: Cursor,
  dato: DatoDeLaCelda,
): { partes: ParteDelTexto[]; sigue: Buscador | null; pos: number } {
  if (buscador.modo === 'cambiar') {
    const sigue = 'variable' in dato ? null : buscador
    return { partes: cambiarDato(partes, buscador.i, dato), sigue, pos: buscador.despues }
  }
  const r = insertarDato(partes, c.desde, dato, c.hasta)
  const i = datoJuntoAlCursor(r.partes, r.pos, 'antes')
  const sigue: Buscador | null =
    'variable' in dato || i === null ? null : { modo: 'cambiar', i, despues: r.pos }
  return { partes: r.partes, sigue, pos: r.pos }
}

// Las partes escritas: lo que se escribe se manda si se puede guardar (≤ 300 caracteres, ≤ 20 partes, sin «{{»); si no, queda aquí con su motivo. Lo que cambia
// afuera (deshacer) se trae si lo escrito se podía guardar.
function usePartesEscritas(contenido: Props['contenido']) {
  const deAfuera = partesDe(contenido)
  const [escritas, setEscritas] = useState(deAfuera)
  const [previas, setPrevias] = useState(deAfuera)
  if (!mismas(deAfuera, previas)) {
    setPrevias(deAfuera)
    if (motivoDe(escritas) === null) setEscritas(deAfuera)
  }
  return [escritas, setEscritas] as const
}

// «Texto» de una celda: el campo con pastillas, «Insertar dato» (apagado con su motivo si pasaría de 20 partes) con el buscador de «Dato» en línea, y el pie con
// «n de 300» (sólo el texto) y el motivo. Lo tipeado se junta en un paso por `clave`; insertar, cambiar o quitar un dato es su propio paso.
export function CampoDelTexto({
  contenido,
  clave,
  contexto,
  nombrados,
  alCambiar,
  alDeshacer,
  alRehacer,
}: Props) {
  const id = useId()
  const [escritas, setEscritas] = usePartesEscritas(contenido)
  const [buscador, setBuscador] = useState<Buscador | null>(null)
  const mandar = (partes: ParteDelTexto[], deUnDato: boolean) => {
    setEscritas(partes)
    const c = contenidoDeLasPartes(partes)
    if (motivoDelContenidoDeTexto(c) === null) alCambiar(c, deUnDato ? undefined : clave)
  }
  const { campoRef, cursor, enfocarEn, manejadores } = useTextoConPastillas({
    partes: escritas,
    contexto,
    alCambiar: mandar,
    alTocarDato: (i) => {
      setBuscador(cambiarLa(escritas, i))
    },
    alDeshacer,
    alRehacer,
  })
  const fin = largoEnUnidades(escritas)
  const enElCursor = cursor ?? { desde: fin, hasta: fin }
  const motivo = motivoDe(escritas)
  const cerrar = (pos: number) => {
    setBuscador(null)
    enfocarEn(pos)
  }
  return (
    <div className="grid min-w-0 gap-1">
      <span id={`${id}-etiqueta`} className="text-sm leading-none font-medium select-none">
        Texto
      </span>
      <TextoConPastillas
        campoRef={campoRef}
        manejadores={manejadores}
        etiqueta={`${id}-etiqueta`}
        describe={`${id}-pie`}
        invalido={motivo !== null}
      />
      <p id={`${id}-pie`} className="text-(length:--text-xs) text-(--color-ink-soft)">
        {caracteresDeLasPartes(escritas)} de {MAXIMO_DE_CARACTERES_DE_UN_TEXTO}
        {motivo === null ? null : <span className="text-(--color-peligro-ink)"> · {motivo}</span>}
      </p>
      <InsertarDato
        motivo={motivoParaInsertar(escritas, enElCursor.desde, enElCursor.hasta)}
        abierto={buscador !== null}
        actual={buscador?.modo === 'cambiar' ? datoEn(escritas, buscador.i) : null}
        contexto={contexto}
        nombrados={nombrados}
        alAbrir={() => {
          setBuscador({ modo: 'insertar' })
        }}
        alElegir={(dato) => {
          if (buscador === null) return
          const r = conElDato(escritas, buscador, enElCursor, dato)
          mandar(r.partes, true)
          if (r.sigue === null) cerrar(r.pos)
          else setBuscador(r.sigue)
        }}
        alListo={() => {
          cerrar(buscador?.modo === 'cambiar' ? buscador.despues : enElCursor.hasta)
        }}
      />
    </div>
  )
}
