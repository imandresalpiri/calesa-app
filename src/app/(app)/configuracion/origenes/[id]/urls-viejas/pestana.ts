import {
  PARTES_DEL_ORIGEN,
  consultaDelDrawerDeLasTablas,
  rutaDeParteDelOrigen,
  type ParteDelOrigen,
} from '@/shared/lib/rutas'
import { conParametros, type ParametrosDeLaUrl } from '../../../con-parametros'

// El drawer de los datos del origen (`?panel=datos`): ya no es pestaña.
export const PANEL_DE_LOS_DATOS = 'datos'

type Entrada = {
  id: string
  parametros: ParametrosDeLaUrl
  // La última pestaña que la persona abrió en este origen (`origenes.ultima_pestana`), si la hay.
  recordada: ParteDelOrigen | null
  // Las pestañas que la persona abre en este origen, en su orden.
  abiertas: readonly ParteDelOrigen[]
}

const primero = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor)

// Los nombres de `?seccion=` de antes (las pestañas viejas) y los de hoy.
const DE_LA_SECCION: Readonly<Record<string, ParteDelOrigen | 'datos' | 'tablas'>> = {
  ...Object.fromEntries(PARTES_DEL_ORIGEN.map((parte) => [parte, parte])),
  datos: 'datos',
  flujo: 'fases',
  formula: 'planilla',
  formulas: 'planilla',
  tablas: 'tablas',
}

// La pestaña de entrada sin una pedida: la última que la persona abrió ahí si todavía la abre; si no, la primera que abre; si no abre ninguna, Fases (la
// pestaña dice por qué no se abre).
function deEntrada({ recordada, abiertas }: Entrada): ParteDelOrigen {
  if (recordada !== null && abiertas.includes(recordada)) {
    return recordada
  }
  return abiertas[0] ?? 'fases'
}

// A dónde lleva `/configuracion/origenes/<id>` con lo que traiga: `?seccion=` elige la pestaña (con los nombres de antes: `flujo` es Fases; `formula`,
// `formulas` y `tablas` son la Planilla, las tablas con su drawer; `datos`, la de entrada con el drawer de los datos); sin ella (o desconocida), un `?campo=`
// abierto lleva a Campos, una `?categoria=` a Categorías y lo demás a la de entrada. Conserva todo lo demás (`?campo=`, `?fase=`, `?panel=`…), salvo
// `seccion`. Nunca vuelve a `/<id>` sin pestaña.
export function destinoAlEntrar(entrada: Entrada): string {
  const { id, parametros } = entrada
  const seccion = primero(parametros['seccion'])
  const elegida = seccion === undefined ? undefined : DE_LA_SECCION[seccion]
  if (elegida === 'datos') {
    const conPanel =
      parametros['panel'] === undefined ? { ...parametros, panel: PANEL_DE_LOS_DATOS } : parametros
    return conParametros(rutaDeParteDelOrigen(id, deEntrada(entrada)), conPanel)
  }
  if (elegida === 'tablas') {
    return rutaDeParteDelOrigen(
      id,
      'planilla',
      consultaDelDrawerDeLasTablas(textos(parametros, ['seccion'])),
    )
  }
  const parte: ParteDelOrigen =
    elegida ??
    (parametros['campo'] ? 'campos' : parametros['categoria'] ? 'categorias' : deEntrada(entrada))
  return conParametros(rutaDeParteDelOrigen(id, parte), parametros)
}

// La consulta con un valor por clave (el primero de un repetido), sin `quitar`: la que arma una ruta nueva.
export function textos(
  parametros: ParametrosDeLaUrl,
  quitar: readonly string[] = [],
): Record<string, string> {
  const salida: Record<string, string> = {}
  for (const [nombre, valor] of Object.entries(parametros)) {
    const uno = primero(valor)
    if (uno !== undefined && !quitar.includes(nombre)) {
      salida[nombre] = uno
    }
  }
  return salida
}
