// Editar una tabla de referencia desde la ayuda de una celda (glosario: «Bloque de la ayuda»): la tabla viva entera en memoria, una fila en edición a la vez, las filas
// quitadas tachadas hasta guardar («Volver» las devuelve) y un solo «Guardar» que publica la tabla entera (`tabla_referencia_publicar()`). Se editan las columnas que
// muestra el bloque; las demás de cada fila se conservan. Puro: lo usan el hueco del área `tablas` y su prueba.
import { ok, type Resultado } from '@/shared/lib/errores'
import type { ColumnaDeTabla, FilaDeTabla } from '../tabla-de-ayuda'
import { sumarFila, type FilaEditable } from './edicion'
import {
  aplicarTexto,
  destinoDeCamino,
  hayCambios,
  primerError,
  type EstadoDelEditor,
} from './vista-del-editor'

export type EdicionEnLaAyuda = {
  // Lo que se leyó de la tabla viva: «Descartar» vuelve a esto.
  leidas: readonly FilaEditable[]
  // Todas las filas que se dibujan (también las quitadas), con lo tipeado que no se leyó.
  estado: EstadoDelEditor
  quitadas: ReadonlySet<string>
  // Las sumadas en esta edición: «Cancelar» en una que sigue vacía la saca.
  nuevas: ReadonlySet<string>
  // La fila abierta con sus campos; nula, ninguna.
  editando: string | null
}

// El motivo de una celda que la base rechazó al guardar (`filas.<i>.<clave>` del 22023), en la fila que lo causó.
export type RechazoEnLaFila = { filaId: string; clave: string | null; mensaje: string }

export const MENSAJE_DE_LA_TABLA_QUE_CAMBIO =
  'La tabla cambió desde que abriste la hoja: estás editando la de hoy.'

export function abrirEdicion(leidas: readonly FilaEditable[]): EdicionEnLaAyuda {
  return {
    leidas,
    estado: { filas: leidas, crudos: {} },
    quitadas: new Set(),
    nuevas: new Set(),
    editando: null,
  }
}

// Lo que se publicaría: las filas sin las quitadas, con sus crudos.
export function publicables(e: EdicionEnLaAyuda): EstadoDelEditor {
  return { filas: e.estado.filas.filter((f) => !e.quitadas.has(f.id)), crudos: e.estado.crudos }
}

export const hayCambiosEnLaAyuda = (e: EdicionEnLaAyuda): boolean =>
  hayCambios(e.leidas, publicables(e))

// El primer error de lo que se publicaría (un crudo o una celda que la base no acepta): apaga «Guardar».
export const errorDeLaEdicion = (columnas: readonly ColumnaDeTabla[], e: EdicionEnLaAyuda) =>
  primerError(columnas, publicables(e))

// Abre una fila (cierra la que estaba abierta tal como quedó).
export const editarFila = (e: EdicionEnLaAyuda, filaId: string): EdicionEnLaAyuda =>
  e.estado.filas.some((f) => f.id === filaId) ? { ...e, editando: filaId } : e

// «+ Añadir fila»: una vacía al final, abierta. Con la tabla llena (las quitadas cuentan hasta guardar), el tope.
export function sumarAlFinal(e: EdicionEnLaAyuda, id: string): Resultado<EdicionEnLaAyuda> {
  const hecho = sumarFila(e.estado.filas, e.estado.filas.length, id)
  if (!hecho.ok) return hecho
  return ok({
    ...e,
    estado: { filas: hecho.data, crudos: e.estado.crudos },
    nuevas: new Set([...e.nuevas, id]),
    editando: id,
  })
}

// 🗑: la fila queda tachada (no se publica) y se cierra si estaba abierta.
export function quitar(e: EdicionEnLaAyuda, filaId: string): EdicionEnLaAyuda {
  return {
    ...e,
    quitadas: new Set([...e.quitadas, filaId]),
    editando: e.editando === filaId ? null : e.editando,
  }
}

export function volver(e: EdicionEnLaAyuda, filaId: string): EdicionEnLaAyuda {
  const quitadas = new Set(e.quitadas)
  quitadas.delete(filaId)
  return { ...e, quitadas }
}

const tieneCrudos = (estado: EstadoDelEditor, filaId: string) =>
  Object.keys(estado.crudos[filaId] ?? {}).length > 0

// «Listo»: lo tipeado en cada campo de la fila abierta pasa a la fila (lo que no se lee queda como crudo, con su motivo). Si queda alguno, la fila sigue abierta.
export function aplicarFila(
  e: EdicionEnLaAyuda,
  columnas: readonly ColumnaDeTabla[],
  textos: Readonly<Record<string, string>>,
  locale: string,
): EdicionEnLaAyuda {
  const filaId = e.editando
  if (filaId === null) return e
  let estado = e.estado
  for (const columna of columnas) {
    const texto = textos[columna.clave]
    if (texto !== undefined) {
      estado = aplicarTexto(estado, { columna, filaId }, texto, locale)
    }
  }
  return { ...e, estado, editando: tieneCrudos(estado, filaId) ? filaId : null }
}

// «Cancelar»: cierra la fila sin aplicar lo tipeado (lo que no se leyó también se va); una sumada en esta edición que sigue vacía se va entera.
export function cancelarFila(e: EdicionEnLaAyuda): EdicionEnLaAyuda {
  const filaId = e.editando
  if (filaId === null) return e
  const crudos = Object.fromEntries(Object.entries(e.estado.crudos).filter(([id]) => id !== filaId))
  const fila = e.estado.filas.find((f) => f.id === filaId)
  const vacia = fila !== undefined && Object.keys(fila.valores).length === 0
  if (!e.nuevas.has(filaId) || !vacia) {
    return { ...e, estado: { filas: e.estado.filas, crudos }, editando: null }
  }
  const nuevas = new Set(e.nuevas)
  nuevas.delete(filaId)
  return {
    ...e,
    estado: { filas: e.estado.filas.filter((f) => f.id !== filaId), crudos },
    nuevas,
    editando: null,
  }
}

// La celda que nombra un rechazo de la base (`filas.<i>.<clave>`: el índice es el de lo publicado, sin las quitadas), con la fila abierta para corregirla. Nulo si el
// camino no nombra una fila.
export function abrirElRechazo(
  e: EdicionEnLaAyuda,
  columnas: readonly ColumnaDeTabla[],
  rechazo: { camino: string; mensaje: string },
): { edicion: EdicionEnLaAyuda; rechazo: RechazoEnLaFila } | null {
  const destino = destinoDeCamino(columnas, publicables(e), rechazo)
  if (destino.filaId === null) return null
  return {
    edicion: { ...e, editando: destino.filaId },
    rechazo: { filaId: destino.filaId, clave: destino.clave, mensaje: rechazo.mensaje },
  }
}

// Si la tabla viva no es la que la hoja mostraba (otra versión publicada después de abrir la hoja): las mismas filas, en el mismo orden, con los mismos valores en las
// columnas que muestra el bloque. Con la lectura de la hoja cortada en su tope (`cortada`), sólo cuentan las que mostraba: la viva puede tener más.
export function tablaCambio(
  mostradas: readonly FilaDeTabla[],
  vivas: readonly FilaEditable[],
  columnas: readonly string[],
  cortada = false,
): boolean {
  if (cortada ? vivas.length < mostradas.length : vivas.length !== mostradas.length) return true
  return mostradas.some((mostrada, i) => {
    const viva = vivas[i]
    return (
      viva === undefined ||
      columnas.some((clave) => (mostrada[clave] ?? null) !== (viva.valores[clave] ?? null))
    )
  })
}
