import { itemSeDibuja, propsDeCelda, type ContextoDeHoja } from './binding'
import type { BloqueEnLaHoja, CeldaDeHoja, EnlaceDeLaAyuda, SeccionDeHoja } from './hoja'

// Lo que la hoja dibuja en cada lugar (paso 4.13-4a, `docs/COTIZADOR.md` › «El diseño de la hoja (D7)»): las secciones `principal` en su orden, y las `avanzado` juntas detrás de **un**
// botón «Avanzado» que va donde estaba la primera de ellas. Puro: la hoja recibe sólo las secciones que se dibujan (`seccionSeDibuja`).
export type LugarDeLaHoja =
  { tipo: 'seccion'; seccion: SeccionDeHoja } | { tipo: 'avanzado'; secciones: SeccionDeHoja[] }

export function ordenDeLaHoja(secciones: readonly SeccionDeHoja[]): LugarDeLaHoja[] {
  const avanzadas = secciones.filter((s) => s.presentacion === 'avanzado')
  const lugares: LugarDeLaHoja[] = []
  let puesto = false
  for (const seccion of secciones) {
    if (seccion.presentacion !== 'avanzado') {
      lugares.push({ tipo: 'seccion', seccion })
    } else if (!puesto) {
      puesto = true
      lugares.push({ tipo: 'avanzado', secciones: avanzadas })
    }
  }
  return lugares
}

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

// La ayuda de una celda llega como bloques (`ayuda-de-la-hoja.ts`); hasta que se abra entera, su botón abre el texto (con sus enlaces) si tiene algún bloque
// que no es una tabla, y si no la primera tabla: el texto, los enlaces y la tabla salen del primer bloque de cada tipo.
export type TipoDeAyuda = 'texto' | 'tabla'

const primero = <T extends BloqueEnLaHoja['tipo']>(
  celda: CeldaDeHoja,
  tipo: T,
): Extract<BloqueEnLaHoja, { tipo: T }> | undefined =>
  celda.ayuda?.find((b): b is Extract<BloqueEnLaHoja, { tipo: T }> => b.tipo === tipo)

export const tipoDeAyuda = (celda: CeldaDeHoja): TipoDeAyuda | null =>
  celda.ayuda === null ? null : celda.ayuda.some((b) => b.tipo !== 'tabla') ? 'texto' : 'tabla'

// El texto de la ayuda de una celda (el del primer bloque de texto o, sin él, el del título), o nulo si no tiene.
export const ayudaDeTexto = (celda: CeldaDeHoja): string | null =>
  (primero(celda, 'texto') ?? primero(celda, 'titulo'))?.texto ?? null

// Los enlaces de la ayuda de una celda (hasta 5, todos `https://`: el esquema de la hoja ya lo exigió), en su orden; vacío si no tiene.
export const enlacesDeLaAyuda = (celda: CeldaDeHoja): readonly EnlaceDeLaAyuda[] =>
  primero(celda, 'enlaces')?.enlaces ?? []

// La clave de la primera tabla de la ayuda de una celda, o nulo si no tiene.
export const tablaDeAyuda = (celda: CeldaDeHoja): string | null =>
  primero(celda, 'tabla')?.tabla ?? null

// El tipo de ayuda de cada celda de estas secciones, por nodo (para que el callback único de las celdas sepa qué abrir sin cambiar).
export const tiposDeAyuda = (secciones: readonly SeccionDeHoja[]): Map<string, TipoDeAyuda> =>
  new Map(
    secciones
      .flatMap((s) => s.items)
      .flatMap((item) => {
        const tipo = item.tipo === 'celda' ? tipoDeAyuda(item) : null
        return item.tipo === 'celda' && tipo !== null ? [[item.nodo, tipo] as const] : []
      }),
  )

// La celda a la que apunta `?nodo=` si se dibuja ahora en estas secciones y su ayuda es de ese tipo; si no (otro nivel, un id inventado, una ayuda de otro tipo, una celda
// apagada), nada: la URL no abre lo que la hoja no muestra.
export const celdaConAyuda = (
  secciones: readonly SeccionDeHoja[],
  nodo: string | null,
  tipo: TipoDeAyuda,
  c: ContextoDeHoja,
): CeldaDeHoja | null =>
  nodo === null
    ? null
    : (celdasQueSeDibujan(secciones, c).find(
        (celda) => celda.nodo === nodo && tipoDeAyuda(celda) === tipo,
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
