import { RUTAS } from './rutas'

// Los paneles de la fórmula del origen que ya no existen: el Modo avanzado de la planilla (la planilla edita como una hoja de cálculo) y «Empezar desde una
// plantilla» (para empezar está «+ Nueva fórmula»). Un enlace guardado o el historial aún los nombran.
export const PANEL_DEL_MODO_AVANZADO = 'editar-formula'
export const PANEL_DE_LAS_PLANTILLAS_DE_V1 = 'plantillas-de-v1'
const PANELES_QUE_YA_NO_EXISTEN: readonly string[] = [
  PANEL_DEL_MODO_AVANZADO,
  PANEL_DE_LAS_PLANTILLAS_DE_V1,
]

const PARTE_DE_LA_FORMULA = new RegExp(`^${RUTAS.origenes}/[^/]+/(planilla|hoja|tarjeta)/?$`)

type Consulta = Record<string, string | string[] | undefined>

// La consulta sin esos paneles (cada `?panel=` que no existe más); los demás `panel` y el resto de la consulta siguen. `panel` desaparece si no queda ninguno.
export function sinLosPanelesQueYaNoExisten<T extends Consulta>(parametros: T): T {
  const panel = parametros['panel']
  if (panel === undefined) return parametros
  const quedan = (Array.isArray(panel) ? panel : [panel]).filter(
    (p) => !PANELES_QUE_YA_NO_EXISTEN.includes(p),
  )
  return { ...parametros, panel: quedan.length === 0 ? undefined : quedan }
}

// A dónde va una parte de la fórmula abierta (planilla, hoja o tarjeta) con `?panel=editar-formula` o `?panel=plantillas-de-v1`: a la misma parte, sin ese panel y
// con el resto de la consulta. Nulo si la ruta no es una de ellas o no abre ninguno. Lo usa el proxy para responder 308 antes del `loading.tsx`.
export function destinoSinLosPanelesQueYaNoExisten(
  ruta: string,
  busqueda: URLSearchParams,
): string | null {
  if (
    !PARTE_DE_LA_FORMULA.test(ruta) ||
    !busqueda.getAll('panel').some((p) => PANELES_QUE_YA_NO_EXISTEN.includes(p))
  ) {
    return null
  }
  const resto = new URLSearchParams()
  for (const [nombre, valor] of busqueda) {
    if (nombre !== 'panel' || !PANELES_QUE_YA_NO_EXISTEN.includes(valor)) {
      resto.append(nombre, valor)
    }
  }
  const consulta = resto.toString()
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}

// La edición a pantalla completa ya no existe: los editores se usan en su pestaña. A dónde va una ruta de Configuración con `?editar=si`: a la misma, sin
// ese valor y con el resto de la consulta (`?editar=requisito` y los demás del flujo siguen). Nulo si no lo trae.
export function destinoSinLaEdicion(ruta: string, busqueda: URLSearchParams): string | null {
  if (!ruta.startsWith('/configuracion/') || !busqueda.getAll('editar').includes('si')) {
    return null
  }
  const resto = new URLSearchParams()
  for (const [nombre, valor] of busqueda) {
    if (nombre !== 'editar' || valor !== 'si') {
      resto.append(nombre, valor)
    }
  }
  const consulta = resto.toString()
  return consulta === '' ? ruta : `${ruta}?${consulta}`
}

// Los paneles de una fórmula del origen (Renombrar, Activar, Archivar y Eliminar) nombran la suya en `&cual=<id>`: `formula` es la elegida en la barra de la
// fórmula. Antes la nombraban en `&formula=`; las rutas viejas y el proxy la traducen. Viven acá porque los nombra el proxy (`cotizaciones` los reexporta).
export const PANELES_DE_UNA_FORMULA = [
  'renombrar-formula',
  'activar-formula',
  'archivar-formula',
  'eliminar-formula',
] as const
export const CLAVE_DE_LA_FORMULA_DEL_PANEL = 'cual'

// La consulta con `formula` en `cual` si abre un panel de una fórmula (y no trae ya `cual`); si no, la misma.
export function conLaFormulaDelPanel<T extends Consulta>(parametros: T): T {
  const panel = parametros['panel']
  const paneles = Array.isArray(panel) ? panel : panel === undefined ? [] : [panel]
  const abreUno = paneles.some((p) => (PANELES_DE_UNA_FORMULA as readonly string[]).includes(p))
  if (
    !abreUno ||
    parametros['formula'] === undefined ||
    parametros[CLAVE_DE_LA_FORMULA_DEL_PANEL] !== undefined
  ) {
    return parametros
  }
  const { formula, ...resto } = parametros
  return { ...resto, [CLAVE_DE_LA_FORMULA_DEL_PANEL]: formula } as unknown as T
}

const PUBLICAR_DE_LA_PUESTA_EN_MARCHA = new RegExp(
  `^${RUTAS.origenes}/[^/]+/puesta-en-marcha/publicar/?$`,
)

// El paso «Publicar» de la puesta en marcha con `?panel=activar-formula&formula=<id>` (la forma de antes): a la misma ruta con `&cual=<id>`. Nulo si no.
export function destinoConLaFormulaDelPanel(
  ruta: string,
  busqueda: URLSearchParams,
): string | null {
  if (!PUBLICAR_DE_LA_PUESTA_EN_MARCHA.test(ruta)) {
    return null
  }
  const parametros = Object.fromEntries(busqueda)
  const traducidos = conLaFormulaDelPanel(parametros)
  if (traducidos === parametros) {
    return null
  }
  return `${ruta}?${new URLSearchParams(traducidos).toString()}`
}
