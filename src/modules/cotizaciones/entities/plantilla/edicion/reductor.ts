// Cómo cambia el estado del editor de la tarjeta con cada acción, como Excel (`estado-del-editor.ts`). Cada operación pasa por su función pura (`contenido.ts`,
// `combinar.ts`…), ya medida contra los topes: si no se puede, el estado queda igual con el motivo en `rechazo`. Elegir no es un paso del historial y corta lo que se
// junta por clave. Puro.
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { combinar, separar } from './combinar'
import { escribirTexto, motivoDelTexto, ponerContenido, vaciar } from './contenido'
import { eliminarColumnas, eliminarFilas } from './eliminar'
import {
  MOTIVO_SIN_SELECCION,
  type AccionDelEditor,
  type EstadoDelEditor,
} from './estado-del-editor'
import { ponerEstilo } from './estilo'
import { altoDeFila, anchoDeColumna, moverFila, ocultarSegun, ocultarSi } from './filas-y-columnas'
import { cortar } from './historial'
import { insertarColumna, insertarFila, sumarColumna } from './insertar'
import { anclaEn, celdaEn, mapaDeLaGrilla, type MapaDeLaGrilla } from './mapa-de-la-grilla'
import { conResultado, decir, elegir, rechazar, sobreLoElegido, volver } from './pasos-del-editor'
import { copiar, pegar, pegarTexto } from './portapapeles'
import {
  casillaActiva,
  moverFoco,
  rangoDe,
  seleccionarColumnas,
  seleccionarFilas,
} from './seleccion'
import type { Pos } from './tipos'

export type { AccionDelEditor, EstadoDelEditor } from './estado-del-editor'
export { estadoInicial } from './estado-del-editor'

function copiarLoElegido(e: EstadoDelEditor): EstadoDelEditor {
  if (e.seleccion === null) return rechazar(e, MOTIVO_SIN_SELECCION)
  const mapa = mapaDeLaGrilla(e.plantilla)
  const bloque = copiar(e.plantilla, rangoDe(e.seleccion, mapa, e.plantilla))
  const n = bloque.celdas.length
  const texto =
    n === 0
      ? 'Se copió un rango vacío.'
      : n === 1
        ? 'Se copió una celda.'
        : `Se copiaron ${String(n)} celdas.`
  return { ...e, bloque, rechazo: null, anuncio: decir(e, texto) }
}

// El texto de la celda de una casilla, si es un texto fijo (un texto con datos no se escribe en el lugar: se edita en el panel).
function textoEn(p: PlantillaEnCuadricula, mapa: MapaDeLaGrilla, pos: Pos): string {
  const c = celdaEn(mapa, p, pos)?.celda.contenido
  return c?.tipo === 'texto' && 'texto' in c ? c.texto : ''
}

function empezarAEscribir(
  e: EstadoDelEditor,
  texto: string | undefined,
  visibles: readonly number[],
): EstadoDelEditor {
  const mapa = mapaDeLaGrilla(e.plantilla)
  if (mapa.filas === 0 || mapa.columnas === 0) return e
  const pos = anclaEn(mapa, e.plantilla, casillaActiva(e.seleccion, visibles))
  return {
    ...e,
    seleccion: { tipo: 'celdas', ancla: pos, foco: pos },
    historial: cortar(e.historial),
    escribiendo: { pos, texto: texto ?? textoEn(e.plantilla, mapa, pos) },
    rechazo: null,
  }
}

function confirmarEscritura(e: EstadoDelEditor): EstadoDelEditor {
  const escritura = e.escribiendo
  if (escritura === null) return e
  const motivo = motivoDelTexto(escritura.texto)
  if (motivo !== null) return rechazar(e, motivo)
  const mapa = mapaDeLaGrilla(e.plantilla)
  if (escritura.texto === textoEn(e.plantilla, mapa, escritura.pos))
    return { ...e, escribiendo: null, rechazo: null }
  return {
    ...conResultado(e, 'escribir', escribirTexto(e.plantilla, escritura.pos, escritura.texto)),
    escribiendo: null,
  }
}

type Manejadores = {
  readonly [T in AccionDelEditor['tipo']]: (
    e: EstadoDelEditor,
    a: Extract<AccionDelEditor, { tipo: T }>,
  ) => EstadoDelEditor
}

const todo = (e: EstadoDelEditor): EstadoDelEditor => {
  const p = e.plantilla
  if (p.filas.length === 0 || p.columnas.length === 0) return e
  return elegir(e, {
    tipo: 'celdas',
    ancla: { f: 0, k: 0 },
    foco: { f: p.filas.length - 1, k: p.columnas.length - 1 },
  })
}

const MANEJADORES: Manejadores = {
  seleccionar: (e, a) => elegir(e, a.seleccion),
  mover: (e, a) =>
    elegir(
      e,
      moverFoco(e.seleccion, a.direccion, a.extender, {
        mapa: mapaDeLaGrilla(e.plantilla),
        p: e.plantilla,
        visibles: a.visibles,
      }),
    ),
  todo,
  filaActiva: (e, a) => elegir(e, seleccionarFilas(casillaActiva(e.seleccion, a.visibles).f)),
  columnaActiva: (e, a) => elegir(e, seleccionarColumnas(casillaActiva(e.seleccion, a.visibles).k)),
  combinar: (e) => sobreLoElegido(e, 'combinar', (r) => combinar(e.plantilla, r)),
  separar: (e) => sobreLoElegido(e, 'separar', (r) => separar(e.plantilla, r)),
  insertarFila: (e, a) =>
    sobreLoElegido(e, 'insertar una fila', (r) =>
      insertarFila(e.plantilla, a.lado === 'arriba' ? r.f0 : r.f1, a.lado),
    ),
  insertarColumna: (e, a) =>
    sobreLoElegido(e, 'insertar una columna', (r) =>
      insertarColumna(e.plantilla, a.lado === 'izquierda' ? r.k0 : r.k1, a.lado),
    ),
  eliminarFilas: (e) =>
    sobreLoElegido(e, 'eliminar filas', (r) => eliminarFilas(e.plantilla, r.f0, r.f1)),
  eliminarColumnas: (e) =>
    sobreLoElegido(e, 'eliminar columnas', (r) => eliminarColumnas(e.plantilla, r.k0, r.k1)),
  vaciar: (e) => sobreLoElegido(e, 'vaciar', (r) => vaciar(e.plantilla, r)),
  contenido: (e, a) =>
    sobreLoElegido(
      e,
      'cambiar el contenido',
      (r) => ponerContenido(e.plantilla, r, a.contenido),
      a.clave,
    ),
  estilo: (e, a) =>
    sobreLoElegido(e, 'cambiar el formato', (r) => ponerEstilo(e.plantilla, r, a.cambio)),
  ancho: (e, a) =>
    conResultado(e, 'cambiar el ancho', anchoDeColumna(e.plantilla, a.columna, a.ancho), a.clave),
  alto: (e, a) =>
    conResultado(e, 'cambiar el alto', altoDeFila(e.plantilla, a.fila, a.alto), a.clave),
  ocultarSi: (e, a) =>
    conResultado(e, 'ocultar la fila', ocultarSi(e.plantilla, a.fila, a.ocultar, a.nodo)),
  ocultarSegun: (e, a) =>
    conResultado(e, 'ocultar la fila', ocultarSegun(e.plantilla, a.fila, a.si), a.clave),
  moverFila: (e, a) => conResultado(e, 'mover la fila', moverFila(e.plantilla, a.desde, a.hasta)),
  sumarColumna: (e) => conResultado(e, 'sumar una columna', sumarColumna(e.plantilla)),
  copiar: copiarLoElegido,
  pegar: (e) => {
    const bloque = e.bloque
    if (bloque === null) return rechazar(e, 'No hay nada copiado.')
    return sobreLoElegido(e, 'pegar', (r) => pegar(e.plantilla, { f: r.f0, k: r.k0 }, bloque))
  },
  pegarTexto: (e, a) =>
    sobreLoElegido(e, 'pegar', (r, mapa) =>
      pegarTexto(e.plantilla, anclaEn(mapa, e.plantilla, { f: r.f0, k: r.k0 }), a.texto),
    ),
  deshacer: (e) => volver(e, 'atras'),
  rehacer: (e) => volver(e, 'adelante'),
  reponer: (e, a) =>
    conResultado(e, a.nombre, {
      ok: true,
      plantilla: a.plantilla,
      anuncio: 'Se repuso lo que habías escrito.',
    }),
  empezarAEscribir: (e, a) => empezarAEscribir(e, a.texto, a.visibles),
  escribir: (e, a) =>
    e.escribiendo === null
      ? e
      : { ...e, escribiendo: { ...e.escribiendo, texto: a.texto }, rechazo: null },
  confirmarEscritura,
  descartarEscritura: (e) => ({ ...e, escribiendo: null, rechazo: null }),
  anunciar: (e, a) => ({ ...e, anuncio: decir(e, a.texto) }),
}

export function reductorDelEditor(e: EstadoDelEditor, a: AccionDelEditor): EstadoDelEditor {
  const manejar = MANEJADORES[a.tipo] as (e: EstadoDelEditor, a: AccionDelEditor) => EstadoDelEditor
  return manejar(e, a)
}
