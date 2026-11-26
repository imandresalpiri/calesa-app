import { itemSeDibuja, propsDeCelda, type ContextoDeHoja } from './binding'
import type { BloqueEnLaHoja, CeldaDeHoja, SeccionDeHoja } from './hoja'
import { enOrdenDeLectura } from './rejilla-de-la-hoja'

// Lo que la hoja dibuja en cada lugar (`docs/COTIZADOR.md` › «El diseño de la hoja (D7)»): las secciones `principal` en orden de lectura (fila y luego columna;
// sin posiciones, en su orden) y **un** bloque del avanzado (docs/GLOSARIO.md › «Bloque del avanzado») con las `avanzado` detrás del botón «Avanzado», la
// tarjeta del total sola justo antes con `totalSuelto` (el diseño no la ubica, o la hoja va en par) y el cierre justo después con `conCierre` (la hoja guarda:
// «Guardar», su motivo y lo que dijo el guardado). El bloque va en su fila (`filaDelBloque`, de `rejillaDeLasSecciones()`) o, sin posiciones, donde estaba la
// primera avanzada; sin avanzadas, al final. Puro: la hoja recibe sólo las secciones que se dibujan (`seccionSeDibuja`).
export type LugarDeLaHoja =
  | { tipo: 'seccion'; seccion: SeccionDeHoja }
  | { tipo: 'bloque'; avanzadas: SeccionDeHoja[]; total: boolean; cierre: boolean }

const posicionDe = (s: SeccionDeHoja) => s.posicion
const esAvanzada = (s: SeccionDeHoja) => s.presentacion === 'avanzado'

export function ordenDeLaHoja(
  secciones: readonly SeccionDeHoja[],
  {
    totalSuelto = false,
    conCierre = false,
    filaDelBloque,
  }: { totalSuelto?: boolean; conCierre?: boolean; filaDelBloque?: number } = {},
): LugarDeLaHoja[] {
  const principales = enOrdenDeLectura(
    secciones.filter((s) => !esAvanzada(s)),
    posicionDe,
  )
  const avanzadas = enOrdenDeLectura(secciones.filter(esAvanzada), posicionDe)
  const lugares: LugarDeLaHoja[] = principales.map((seccion) => ({ tipo: 'seccion', seccion }))
  if (avanzadas.length === 0 && !totalSuelto && !conCierre) return lugares
  lugares.splice(dondeVaElBloque(secciones, principales, filaDelBloque), 0, {
    tipo: 'bloque',
    avanzadas,
    total: totalSuelto,
    cierre: conCierre,
  })
  return lugares
}

// Cuántas principales van antes del bloque: con su fila, las que empiezan más arriba; sin ella, las que la lista declara antes de la primera avanzada.
function dondeVaElBloque(
  secciones: readonly SeccionDeHoja[],
  principales: readonly SeccionDeHoja[],
  filaDelBloque: number | undefined,
): number {
  if (filaDelBloque !== undefined) {
    const despues = principales.findIndex((s) => (s.posicion?.fila ?? 0) > filaDelBloque)
    return despues === -1 ? principales.length : despues
  }
  const primera = secciones.findIndex(esAvanzada)
  return primera === -1
    ? principales.length
    : secciones.slice(0, primera).filter((s) => !esAvanzada(s)).length
}

// La tarjeta del total va sola (arriba de «Avanzado») si ninguna sección principal que se dibuja la ubica, o si la hoja va en par (la pieza no dibuja nada: mandan los
// dos totales).
export const totalSuelto = (secciones: readonly SeccionDeHoja[], enPar: boolean): boolean =>
  enPar ||
  !secciones.some((s) => s.presentacion === 'principal' && s.items.some((i) => i.tipo === 'total'))

// Lo que dice el botón «Avanzado» de lo que esconde: los títulos de sus secciones, en su orden (sin título, nada).
export const titulosDeAvanzado = (secciones: readonly SeccionDeHoja[]): string =>
  secciones
    .map((s) => s.titulo)
    .filter((titulo): titulo is string => titulo !== null)
    .join(' · ')

// Las celdas que se dibujan de una sección (lo que apaga un interruptor no cuenta).
const celdasQueSeDibujan = (secciones: readonly SeccionDeHoja[], c: ContextoDeHoja) =>
  secciones.flatMap((s) =>
    s.items.filter((item): item is CeldaDeHoja => item.tipo === 'celda' && itemSeDibuja(item, c)),
  )

// El botón «Avanzado» dice con texto si alguna celda de lo que esconde tiene un aviso (un dato que falta, fuera de rango): lo de adentro no se ve y un error escondido no se puede ignorar.
export const hayDatosPorRevisar = (
  secciones: readonly SeccionDeHoja[],
  c: ContextoDeHoja,
): boolean => celdasQueSeDibujan(secciones, c).some((celda) => propsDeCelda(celda, c).error)

// La ayuda de una celda llega como bloques (`ayuda-de-la-hoja.ts`) y se abre entera en un panel: su título es el texto del primer bloque de título, que no se repite en el
// cuerpo; sin él, «Ayuda de <rótulo>».
export const tituloDeLaAyuda = (celda: CeldaDeHoja): string =>
  celda.ayuda?.find((b) => b.tipo === 'titulo')?.texto ?? `Ayuda de ${celda.etiqueta}`

// Los bloques que dibuja el cuerpo del panel, en su orden: todos menos el primer título (ya es el del panel). Sin ayuda, ninguno.
export function bloquesDeLaAyuda(celda: CeldaDeHoja): readonly BloqueEnLaHoja[] {
  const ayuda = celda.ayuda ?? []
  const titulo = ayuda.findIndex((b) => b.tipo === 'titulo')
  return titulo < 0 ? ayuda : ayuda.filter((_, i) => i !== titulo)
}

// La celda a la que apunta `?nodo=` si se dibuja ahora en estas secciones y tiene ayuda; si no (otro nivel, un id inventado, una celda sin ayuda, una apagada), nada: la URL no
// abre lo que la hoja no muestra.
export const celdaConAyuda = (
  secciones: readonly SeccionDeHoja[],
  nodo: string | null,
  c: ContextoDeHoja,
): CeldaDeHoja | null =>
  nodo === null
    ? null
    : (celdasQueSeDibujan(secciones, c).find(
        (celda) => celda.nodo === nodo && celda.ayuda !== null,
      ) ?? null)

// La celda a la que apunta `?nodo=` si se dibuja ahora en estas secciones y la base le dio el ⚙ (en ella o en su secundario); si no (otro nivel, un id inventado, una celda sin
// ajustes, una apagada), nada: la URL no abre lo que la hoja no muestra.
export const celdaConAjuste = (
  secciones: readonly SeccionDeHoja[],
  nodo: string | null,
  c: ContextoDeHoja,
): CeldaDeHoja | null =>
  nodo === null
    ? null
    : (celdasQueSeDibujan(secciones, c).find(
        (celda) => celda.nodo === nodo && (celda.ajustes || celda.secundario?.ajustes === true),
      ) ?? null)

// La línea de arriba de «Avanzado», como en V1: qué cambia tocar un valor y, sólo a quien tiene el ⚙ en alguna celda del modal (la base lo dice por celda, `ajustes`, y
// el área llenó el hueco), qué cambia el ⚙.
export const LINEA_DEL_AVANZADO = 'Tocar un valor lo cambia sólo en esta cotización.'
export const LINEA_DEL_AJUSTE = 'El ⚙ cambia el valor por defecto de las cotizaciones nuevas.'

export function explicacionDelAvanzado(
  secciones: readonly SeccionDeHoja[],
  conAjuste: boolean,
): string {
  const algunAjuste =
    conAjuste &&
    secciones.some((s) =>
      s.items.some((i) => i.tipo === 'celda' && (i.ajustes || i.secundario?.ajustes === true)),
    )
  return algunAjuste ? `${LINEA_DEL_AVANZADO} ${LINEA_DEL_AJUSTE}` : LINEA_DEL_AVANZADO
}
