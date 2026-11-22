'use client'

import type { ClipboardEvent, KeyboardEvent } from 'react'
import { accionDeLaTecla, type AccionDelTeclado } from '../../../entities/plantilla/edicion/atajos'
import { anclaEn, celdaEn } from '../../../entities/plantilla/edicion/mapa-de-la-grilla'
import { copiar, textoDelBloque } from '../../../entities/plantilla/edicion/portapapeles'
import type { AccionDelEditor } from '../../../entities/plantilla/edicion/reductor'
import { casillaActiva, rangoDe } from '../../../entities/plantilla/edicion/seleccion'
import { seEscribeEnElLugar } from '../../../entities/plantilla/edicion/texto-con-datos'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'

type Args = {
  editor: EditorDeLaCuadricula
  // Los índices de las filas que se dibujan con la referencia: las flechas saltan las demás.
  visibles: readonly number[]
  // Un dato, el logo o un texto con datos no se escriben en el lugar: Enter o F2 llevan al panel (al campo «Texto» de un texto con datos, a «Contenido» lo demás).
  alEditarContenido: () => void
  alAbrirMenu: () => void
  // Desde la columna A, ← va al asa de la fila; desde la primera fila, ↑ va al borde de la cabecera de la columna.
  alSalirPorLaIzquierda: (fila: number) => void
  alSalirPorArriba: (columna: number) => void
}

// `escribible`: tipear una letra reemplaza lo de la celda (un texto, también con datos, o nada); `enElLugar`: Enter o F2 la escriben ahí (`seEscribeEnElLugar()`).
type Contexto = Args & { escribible: boolean; enElLugar: boolean }

const conTexto = (tipo: string | undefined) =>
  tipo === undefined || tipo === 'texto' || tipo === 'vacio'

// Lo que hace cada tecla; `false` si la grilla no la toma (y no se frena).
type Manejador<T extends AccionDelTeclado['tipo']> = (
  a: Extract<AccionDelTeclado, { tipo: T }>,
  c: Contexto,
) => boolean

const hecho = (c: Contexto, accion: AccionDelEditor) => {
  c.editor.hacer(accion)
  return true
}

function mover(a: Extract<AccionDelTeclado, { tipo: 'mover' }>, c: Contexto): boolean {
  const { seleccion } = c.editor.estado
  const actual = casillaActiva(seleccion, c.visibles)
  if (seleccion !== null && !a.extender && a.direccion === 'izquierda' && actual.k === 0) {
    c.alSalirPorLaIzquierda(actual.f)
    return true
  }
  if (seleccion !== null && !a.extender && a.direccion === 'arriba' && actual.f === c.visibles[0]) {
    c.alSalirPorArriba(actual.k)
    return true
  }
  return hecho(c, { ...a, visibles: c.visibles })
}

const MANEJADORES: { readonly [T in AccionDelTeclado['tipo']]: Manejador<T> } = {
  mover,
  editar: (_, c) => {
    if (c.enElLugar) return hecho(c, { tipo: 'empezarAEscribir', visibles: c.visibles })
    c.alEditarContenido()
    return true
  },
  escribir: (a, c) =>
    c.escribible && hecho(c, { tipo: 'empezarAEscribir', texto: a.texto, visibles: c.visibles }),
  // Ctrl+C no se frena: el navegador dispara `copy` con el texto para el sistema.
  copiar: (_, c) => {
    c.editor.hacer({ tipo: 'copiar' })
    return false
  },
  // Sin nada copiado en el editor, Ctrl+V llega como `paste` con el texto del sistema.
  pegar: (_, c) => c.editor.estado.bloque !== null && hecho(c, { tipo: 'pegar' }),
  menu: (_, c) => {
    c.alAbrirMenu()
    return true
  },
  soltar: (_, c) => hecho(c, { tipo: 'seleccionar', seleccion: null }),
  fila: (_, c) => hecho(c, { tipo: 'filaActiva', visibles: c.visibles }),
  columna: (_, c) => hecho(c, { tipo: 'columnaActiva', visibles: c.visibles }),
  vaciar: (_, c) => hecho(c, { tipo: 'vaciar' }),
  deshacer: (_, c) => hecho(c, { tipo: 'deshacer' }),
  rehacer: (_, c) => hecho(c, { tipo: 'rehacer' }),
  todo: (_, c) => hecho(c, { tipo: 'todo' }),
}

// El teclado y el portapapeles de la grilla del lienzo (`accionDeLaTecla()`): lo que la grilla toma se frena (`preventDefault` y `stopPropagation`: una letra no le
// llega al marco), salvo Ctrl+C, que el navegador convierte en `copy` (el texto en TSV al portapapeles del sistema), y Ctrl+V sin nada copiado en el editor, que
// llega como `paste` (el texto del sistema va a la celda activa).
export function useAtajosDelLienzo(args: Args) {
  const { estado, hacer, mapa, plantilla } = args.editor
  const contenidoActivo = () =>
    celdaEn(
      mapa,
      plantilla,
      anclaEn(mapa, plantilla, casillaActiva(estado.seleccion, args.visibles)),
    )?.celda.contenido
  return {
    alTeclear: (e: KeyboardEvent<HTMLElement>) => {
      // Sólo con el foco en la grilla: el asa de una fila (dnd-kit escucha sus flechas en la ventana) y el borde de una cabecera atienden las suyas.
      if (e.target !== e.currentTarget) return
      const accion = accionDeLaTecla({
        key: e.key,
        ctrl: e.ctrlKey,
        meta: e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey,
      })
      if (accion === null) return
      const manejar = MANEJADORES[accion.tipo] as Manejador<AccionDelTeclado['tipo']>
      const activo = contenidoActivo()
      const tomada = manejar(accion, {
        ...args,
        escribible: conTexto(activo?.tipo),
        enElLugar: seEscribeEnElLugar(activo),
      })
      if (tomada || accion.tipo === 'copiar') e.stopPropagation()
      if (tomada) e.preventDefault()
    },
    alCopiar: (e: ClipboardEvent<HTMLElement>) => {
      if (estado.seleccion === null) return
      e.clipboardData.setData(
        'text/plain',
        textoDelBloque(copiar(plantilla, rangoDe(estado.seleccion, mapa, plantilla))),
      )
      e.preventDefault()
    },
    alPegar: (e: ClipboardEvent<HTMLElement>) => {
      const texto = e.clipboardData.getData('text/plain')
      e.preventDefault()
      if (texto !== '') hacer({ tipo: 'pegarTexto', texto })
    },
  }
}
