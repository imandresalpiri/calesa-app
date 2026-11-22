// La forma de lo que la lista de respaldo y las condiciones de la tarjeta suman a la forma 2, espejo de `_plantilla_cuadricula_dato()`,
// `_plantilla_cuadricula_condiciones()` y `_plantilla_cuadricula_simple()`: un dato, el `si` (de 1 a 3 condiciones; cada una con su forma según `es`), un
// contenido simple (texto, dato o vacío), la lista (hasta 5 datos: que lleve al menos 2 es `respaldo_vacio`, después de la forma) y las condiciones (de 1 a 4
// ramas con su `si` y su contenido, y el «si no»). Mismo orden y mismas rutas que la base (`celdas[3].contenido.ramas[0].si[1].a`).
import {
  DATOS_DEL_RESPALDO,
  ES_CON_NUMERO,
  ES_DE_LA_CONDICION,
  ES_SOBRE_UN_DATO,
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  MAXIMO_DE_CONDICIONES,
  MAXIMO_DE_RAMAS,
  MOSTRAR,
} from '../cuadricula-de-la-tarjeta'
import { caracteres, esObjetoJsonb } from '../json-de-la-base'
import { campo, conClaveDeMas, enLista, esId, formaRota } from './campos-de-cuadricula'
import type { RechazoDePlantilla } from './motivos-de-plantilla'

type Objeto = Readonly<Record<string, unknown>>
type Rechazo = RechazoDePlantilla | null

const DE_LA_VARIABLE = new Set(['tipo', 'variable'])
const DEL_NODO = new Set(['tipo', 'nodo', 'mostrar'])
const DEL_TEXTO = new Set(['tipo', 'texto'])
const SOLO_EL_TIPO = new Set(['tipo'])
const DEL_RESPALDO = new Set(['tipo', 'datos'])
const DE_LAS_CONDICIONES = new Set(['tipo', 'ramas', 'si_no'])
const DE_UNA_RAMA = new Set(['si', 'contenido'])
const SIMPLES = ['texto', 'dato', 'vacio'] as const
const SOBRE_UN_DATO: readonly string[] = ES_SOBRE_UN_DATO
const CON_NUMERO: readonly string[] = ES_CON_NUMERO

// Las claves de una condición sobre un nodo, por su `es`.
const clavesSobreUnNodo = (es: string): ReadonlySet<string> =>
  new Set(['es', 'nodo', ...(CON_NUMERO.includes(es) ? ['a'] : es === 'opcion' ? ['opcion'] : [])])

export const textoAdmitido = (v: unknown) =>
  typeof v === 'string' && caracteres(v) <= MAXIMO_DE_CARACTERES_DE_UN_TEXTO && !v.includes('{{')

// Un dato con su `tipo` ya leído: una variable (`{tipo, variable}`) o un nodo (`{tipo, nodo, mostrar}`); lo decide la clave `variable`. Que la variable exista
// es otra regla (`variable_inexistente`, después de la forma).
export function revisarDatoDeUnaCelda(c: Objeto, donde: string): Rechazo {
  if (Object.hasOwn(c, 'variable')) {
    if (conClaveDeMas(c, DE_LA_VARIABLE)) return formaRota(donde)
    return esId(c['variable']) ? null : formaRota(`${donde}.variable`)
  }
  if (conClaveDeMas(c, DEL_NODO)) return formaRota(donde)
  if (!esId(campo(c, 'nodo'))) return formaRota(`${donde}.nodo`)
  return enLista(campo(c, 'mostrar'), MOSTRAR) ? null : formaRota(`${donde}.mostrar`)
}

// Un dato suelto (en una lista, una rama, una condición o un texto con datos): un objeto con `tipo` `dato`.
export function revisarDato(d: unknown, donde: string): Rechazo {
  if (!esObjetoJsonb(d)) return formaRota(donde)
  if (campo(d, 'tipo') !== 'dato') return formaRota(`${donde}.tipo`)
  return revisarDatoDeUnaCelda(d, donde)
}

function revisarCondicion(c: unknown, donde: string): Rechazo {
  if (!esObjetoJsonb(c)) return formaRota(donde)
  const es = campo(c, 'es')
  if (typeof es !== 'string' || !enLista(es, ES_DE_LA_CONDICION)) return formaRota(`${donde}.es`)
  if (SOBRE_UN_DATO.includes(es)) {
    if (conClaveDeMas(c, new Set(['es', 'dato']))) return formaRota(donde)
    return revisarDato(campo(c, 'dato'), `${donde}.dato`)
  }
  if (conClaveDeMas(c, clavesSobreUnNodo(es))) return formaRota(donde)
  if (!esId(campo(c, 'nodo'))) return formaRota(`${donde}.nodo`)
  if (CON_NUMERO.includes(es) && typeof campo(c, 'a') !== 'number') return formaRota(`${donde}.a`)
  if (es === 'opcion' && !esId(campo(c, 'opcion'))) return formaRota(`${donde}.opcion`)
  return null
}

// El `si` de una rama o de una fila: de 1 a 3 condiciones, unidas con Y.
export function revisarSi(si: unknown, donde: string): Rechazo {
  if (!Array.isArray(si) || si.length === 0 || si.length > MAXIMO_DE_CONDICIONES)
    return formaRota(donde)
  for (const [k, c] of si.entries()) {
    const rechazo = revisarCondicion(c, `${donde}[${String(k)}]`)
    if (rechazo !== null) return rechazo
  }
  return null
}

// Lo que muestra una rama o el «si no»: un texto, un dato o nada.
function revisarSimple(x: unknown, donde: string): Rechazo {
  if (!esObjetoJsonb(x)) return formaRota(donde)
  const tipo = campo(x, 'tipo')
  if (!enLista(tipo, SIMPLES)) return formaRota(`${donde}.tipo`)
  if (tipo === 'texto') {
    if (conClaveDeMas(x, DEL_TEXTO)) return formaRota(donde)
    return textoAdmitido(campo(x, 'texto')) ? null : formaRota(`${donde}.texto`)
  }
  if (tipo === 'dato') return revisarDatoDeUnaCelda(x, donde)
  return conClaveDeMas(x, SOLO_EL_TIPO) ? formaRota(donde) : null
}

export function revisarRespaldo(c: Objeto, donde: string): Rechazo {
  if (conClaveDeMas(c, DEL_RESPALDO)) return formaRota(donde)
  const datos = campo(c, 'datos')
  if (!Array.isArray(datos) || datos.length > DATOS_DEL_RESPALDO.maximo)
    return formaRota(`${donde}.datos`)
  for (const [j, d] of datos.entries()) {
    const rechazo = revisarDato(d, `${donde}.datos[${String(j)}]`)
    if (rechazo !== null) return rechazo
  }
  return null
}

function revisarRama(r: unknown, donde: string): Rechazo {
  if (!esObjetoJsonb(r) || conClaveDeMas(r, DE_UNA_RAMA)) return formaRota(donde)
  return (
    revisarSi(campo(r, 'si'), `${donde}.si`) ??
    revisarSimple(campo(r, 'contenido'), `${donde}.contenido`)
  )
}

// Las ramas con condición van de 1 a 4: con el «si no», 5.
export function revisarCondiciones(c: Objeto, donde: string): Rechazo {
  if (conClaveDeMas(c, DE_LAS_CONDICIONES)) return formaRota(donde)
  const ramas = campo(c, 'ramas')
  if (!Array.isArray(ramas) || ramas.length === 0 || ramas.length > MAXIMO_DE_RAMAS - 1)
    return formaRota(`${donde}.ramas`)
  for (const [j, r] of ramas.entries()) {
    const rechazo = revisarRama(r, `${donde}.ramas[${String(j)}]`)
    if (rechazo !== null) return rechazo
  }
  return revisarSimple(campo(c, 'si_no'), `${donde}.si_no`)
}
