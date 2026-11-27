import type { Route } from 'next'

// Rutas del acceso y la regla que decide quién pasa. Son nombres de rutas, no reglas del negocio:
// las usan `src/proxy.ts`, las actions de ingreso y el route handler que canjea los enlaces.

// El parámetro que deja a la vista el bloque de un módulo de la matriz de Roles (`?bloque=cotizaciones`).
export const PARAMETRO_DEL_BLOQUE = 'bloque'

export const RUTAS = {
  inicio: '/',
  ingreso: '/ingreso',
  registro: '/registro',
  recuperar: '/recuperar',
  canje: '/auth/callback',
  nuevaContrasena: '/auth/nueva-contrasena',
  cierre: '/auth/cerrar',
  perfil: '/perfil',
  notificaciones: '/notificaciones',
  // El inicio de Configuración. `/configuracion` solo lleva aquí en el servidor (`next.config.ts`).
  inicioDeConfiguracion: '/configuracion/inicio',
  equipo: '/configuracion/equipo',
  roles: '/configuracion/roles',
  modoLive: '/configuracion/modo-live',
  // El bloque «Cotizaciones» de la matriz de Roles, a la vista: ahí viven los niveles de acceso y «Quién crea y quién ve». Sólo un enlace (no se revalida).
  cotizacionesEnRoles: '/configuracion/roles?bloque=cotizaciones',
  empresa: '/configuracion/empresa',
  monedasDeEmpresa: '/configuracion/empresa/monedas',
  integracionesDeEmpresa: '/configuracion/empresa/integraciones',
  comprobantesDeEmpresa: '/configuracion/empresa/comprobantes',
  origenes: '/configuracion/origenes',
  // El primer paso de la puesta en marcha de un origen: sus datos. Al crearlo sigue en `rutaDeLaPuestaEnMarcha()`.
  nuevoOrigen: '/configuracion/origenes/nuevo',
  configuracionDeLeads: '/configuracion/leads',
  camposDeLeads: '/configuracion/leads/campos',
  // Los colores y la vigencia de las cotizaciones son de toda la empresa y se configuran en Orígenes, en las tarjetas de «Para todos los orígenes»: cada
  // una abre su modal por `?panel=` (no son rutas: no se revalidan, se enlazan).
  coloresDeCotizacion: '/configuracion/origenes?panel=colores',
  vigenciaDeCotizacion: '/configuracion/origenes?panel=vigencia',
  configuracionDeWeb: '/configuracion/web',
  ajustesDelSitio: '/configuracion/web/ajustes',
  legalesDelSitio: '/configuracion/web/legales',
  guiasDelSitio: '/configuracion/web/guias',
  faqsDelSitio: '/configuracion/web/faqs',
  testimoniosDelSitio: '/configuracion/web/testimonios',
  configuracionDeColaWeb: '/configuracion/cola-web',
  leads: '/leads',
  papeleraDeLeads: '/leads/papelera',
  importarLeads: '/leads/importar',
  vehiculos: '/vehiculos',
  nuevoVehiculo: '/vehiculos?panel=nuevo',
  papeleraDeVehiculos: '/vehiculos/papelera',
  logistica: '/logistica',
  bandejaDeLogistica: '/logistica/bandeja',
  embarques: '/logistica/embarques',
  aduana: '/logistica/aduana',
  gastosDeLogistica: '/logistica/gastos',
  repuestos: '/repuestos',
  // La configuración de los repuestos vive en Repuestos: una sub-ruta por pestaña (Flujo, Cotizador, Catálogos). La raíz abre el flujo.
  configuracionDeRepuestos: '/repuestos/configuracion',
  flujoDeRepuestos: '/repuestos/configuracion/flujo',
  cotizadorDeRepuestos: '/repuestos/configuracion/cotizador',
  catalogosDeRepuestos: '/repuestos/configuracion/catalogos',
  cotizaciones: '/cotizaciones',
  nuevaCotizacion: '/cotizaciones/nuevo',
  artes: '/artes',
} as const

// El valor de `?panel=` que abre el alta de un vehículo (`RUTAS.nuevoVehiculo`). Vive acá porque lo leen el módulo `vehiculos` y la paleta del buscador (que no puede importarlo).
export const PANEL_NUEVO_DE_VEHICULOS = 'nuevo'

// La unidad de logística (6.01) tiene su propia página: a ella apuntan las notificaciones de demora. `RUTAS` es un objeto fijo; la que lleva un id es una función.
export function unidadDeLogistica(id: string): string {
  return `${RUTAS.logistica}/vehiculo/${encodeURIComponent(id)}`
}

// Un embarque, un contenedor y una declaración por su id (las enlazan transporte, aduana y la actividad, que no se importan entre sí). `origen` es la clave de URL del origen en
// Logística (`CLAVE_DE_ORIGEN_DE_LOGISTICA` de `logistica`, que `shared` no importa); sin él, la página resuelve el último origen. El contenedor y la declaración abren su drawer sobre
// la lista de su pestaña.
function consultaDeLogistica(pares: Record<string, string | undefined>): string {
  const consulta = new URLSearchParams()
  for (const [clave, valor] of Object.entries(pares)) {
    if (valor !== undefined) consulta.set(clave, valor)
  }
  const texto = consulta.toString()
  return texto === '' ? '' : `?${texto}`
}

export function embarqueDeLogistica(id: string, origenId?: string): string {
  return `${RUTAS.embarques}/${encodeURIComponent(id)}${consultaDeLogistica({ origen: origenId })}`
}

export function contenedorDeLogistica(id: string, origenId?: string): string {
  return `${RUTAS.embarques}${consultaDeLogistica({ origen: origenId, contenedor: id })}`
}

export function declaracionDeAduana(id: string, origenId?: string): string {
  return `${RUTAS.aduana}${consultaDeLogistica({ origen: origenId, declaracion: id })}`
}

// «Mover el contenedor»: el lote de la Cadena con las unidades del contenedor (`?panel=lote&contenedor=<id>`, las claves de `logistica/entities/mover/claves-del-lote.ts`, que lo
// comprueba en su test). Lo abren el drawer del contenedor (transporte) y el hueco «Mover el contenedor» (mover), que no se importan entre sí.
export function loteDelContenedor(id: string, origenId?: string | null): string {
  return `${RUTAS.logistica}${consultaDeLogistica({ origen: origenId ?? undefined, panel: 'lote', contenedor: id })}`
}

// Las pestañas de la página de un origen, en su orden: cada una es una sub-ruta `/configuracion/origenes/<id>/<parte>`. Viven acá porque
// las arman las actions y los enlaces de otros módulos (cotizaciones, flujos), que no pueden importar `src/app`.
export const PARTES_DEL_ORIGEN = [
  'fases',
  'planilla',
  'hoja',
  'tarjeta',
  'campos',
  'categorias',
] as const

export type ParteDelOrigen = (typeof PARTES_DEL_ORIGEN)[number]

function conConsulta(ruta: string, consulta?: Record<string, string>): Route {
  const parametros = new URLSearchParams(consulta).toString()
  return (parametros === '' ? ruta : `${ruta}?${parametros}`) as Route
}

// La página de un origen sin pestaña (`/configuracion/origenes/<id>`): su `route.ts` lleva a la última pestaña que la persona abrió ahí (o a la primera que
// abre), con la consulta (`?panel=datos`).
export function rutaDelOrigen(origenId: string, consulta?: Record<string, string>): Route {
  return conConsulta(`${RUTAS.origenes}/${encodeURIComponent(origenId)}`, consulta)
}

// Una pestaña de un origen, con su consulta en el orden en que viene (`?fase=`, `?panel=`); sin consulta, sin `?`.
export function rutaDeParteDelOrigen(
  origenId: string,
  parte: ParteDelOrigen,
  consulta?: Record<string, string>,
): Route {
  return conConsulta(`${RUTAS.origenes}/${encodeURIComponent(origenId)}/${parte}`, consulta)
}

// Los catálogos de logística de un origen (puertos, navieras, categorías de gasto y tipos de documento) se configuran en su pestaña Fases, arriba del
// diagrama: cada uno abre su drawer (`?panel=puertos`). El flujo de repuestos sólo tiene los tipos de documento. Viven acá porque los nombran el editor
// del flujo, la oferta de transporte, el buscador y los avisos de logística.
export const PANELES_DE_LOS_CATALOGOS = [
  'puertos',
  'navieras',
  'categorias-de-gasto',
  'tipos-de-documento',
] as const
export type PanelDeCatalogo = (typeof PANELES_DE_LOS_CATALOGOS)[number]

export const esPanelDeCatalogo = (valor: string | null | undefined): valor is PanelDeCatalogo =>
  (PANELES_DE_LOS_CATALOGOS as readonly (string | null | undefined)[]).includes(valor)

// El drawer de un catálogo de logística en la pestaña Fases de su origen.
export function rutaDeUnCatalogo(origenId: string, panel: PanelDeCatalogo): Route {
  return rutaDeParteDelOrigen(origenId, 'fases', { panel })
}

// Una plantilla de arte: la abre el editor de artes.
export function rutaDeLaPlantillaDeArte(id: string): Route {
  return `/artes/${encodeURIComponent(id)}` as Route
}

// El drawer de los tipos de documento del flujo de repuestos.
export function rutaDeTiposDeRepuestos(): Route {
  return conConsulta(RUTAS.flujoDeRepuestos, { panel: 'tipos-de-documento' })
}

// El drawer de las tablas de un origen (`?panel=tablas`, sobre la Planilla) y el panel de una tabla adentro (`&accion=publicar-tabla`: convive con el drawer,
// que ya usa `panel`). Viven acá porque los nombran el área `tablas` y los enlaces de otros módulos.
export const PANEL_DE_LAS_TABLAS = 'tablas'
export const CLAVE_DE_LA_ACCION_DE_LA_TABLA = 'accion'

// La consulta del drawer de las tablas: `panel=tablas`, lo que traiga (`?tabla=`) y el panel de una tabla en `accion`.
export function consultaDelDrawerDeLasTablas(
  consulta: Record<string, string> = {},
): Record<string, string> {
  const { panel, ...resto } = consulta
  return {
    panel: PANEL_DE_LAS_TABLAS,
    ...resto,
    ...(panel === undefined || panel === PANEL_DE_LAS_TABLAS
      ? {}
      : { [CLAVE_DE_LA_ACCION_DE_LA_TABLA]: panel }),
  }
}

// Las pestañas de la página del origen que editan una fórmula: llevan la elegida en `?formula=<id>` (sin ella, la de trabajo).
export const PARTES_DE_LA_FORMULA = ['planilla', 'hoja', 'tarjeta'] as const

export type ParteDeLaFormula = (typeof PARTES_DE_LA_FORMULA)[number]

export const esParteDeLaFormula = (parte: string): parte is ParteDeLaFormula =>
  (PARTES_DE_LA_FORMULA as readonly string[]).includes(parte)

// La fórmula elegida en la barra de la fórmula (`?formula=<id>`).
export const CLAVE_DE_LA_FORMULA = 'formula'

// Una pestaña de la fórmula del origen con la elegida (`…/origenes/<id>/planilla|hoja|tarjeta?formula=<f>`) y el resto de su consulta (`?fila=`, `?lugar=`,
// `?panel=`); sin fórmula, la de trabajo (sin `?formula=`).
export function rutaDeLaFormula(
  origenId: string,
  formulaId: string | null,
  parte: ParteDeLaFormula,
  consulta?: Record<string, string>,
): Route {
  return rutaDeParteDelOrigen(
    origenId,
    parte,
    formulaId === null ? consulta : { [CLAVE_DE_LA_FORMULA]: formulaId, ...consulta },
  )
}

// Los pasos de la puesta en marcha de un origen nuevo (docs/GLOSARIO.md › «Puesta en marcha»), en su orden, después de crearlo: cada uno es una sub-ruta
// `…/origenes/<id>/puesta-en-marcha/<paso>`, y al final `listo`. Viven acá porque los nombran el módulo `origenes` (qué paso falta) y `src/app` (las rutas).
export const PASOS_DE_LA_PUESTA_EN_MARCHA = [
  'datos',
  'campos',
  'flujo',
  'formula',
  'tarjeta',
  'publicar',
] as const

export type PasoDeLaPuestaEnMarcha = (typeof PASOS_DE_LA_PUESTA_EN_MARCHA)[number]

// Un paso de la puesta en marcha (o `listo`); sin paso, la raíz, que lleva al que falta.
export function rutaDeLaPuestaEnMarcha(
  origenId: string,
  paso?: PasoDeLaPuestaEnMarcha | 'listo',
): Route {
  const raiz = `${RUTAS.origenes}/${encodeURIComponent(origenId)}/puesta-en-marcha`
  return (paso === undefined ? raiz : `${raiz}/${paso}`) as Route
}

// Quien ya tiene sesión no tiene nada que hacer acá.
const SOLO_SIN_SESION: readonly string[] = [RUTAS.ingreso, RUTAS.registro]

// Se ven sin sesión. `/auth/*` incluye el canje de enlaces y la pantalla de contraseña nueva,
// que decide por su cuenta qué mostrar si la sesión de recuperación no llegó.
const PUBLICAS: readonly string[] = [RUTAS.ingreso, RUTAS.registro, RUTAS.recuperar]
const PREFIJO_PUBLICO = '/auth/'
// El portal del cliente no tiene sesión de Supabase: su cookie firmada la valida cada handler de `api/portal/*`.
const PREFIJO_DEL_PORTAL = '/api/portal/'

export function esRutaPublica(ruta: string): boolean {
  return (
    PUBLICAS.includes(ruta) ||
    ruta.startsWith(PREFIJO_PUBLICO) ||
    ruta.startsWith(PREFIJO_DEL_PORTAL)
  )
}

// Un `returnTo` viene de la URL: lo puede escribir cualquiera. Sólo vale una ruta interna
// (`/algo`), nunca otro sitio (`//otro.com`, `/\otro.com`) ni una pantalla de acceso, que
// devolvería a la persona al punto de partida.
export function returnToSeguro(valor: string | null | undefined): string | null {
  if (!valor?.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) {
    return null
  }
  // Caracteres de control: un salto de línea en una cabecera `Location` es una inyección.
  if ([...valor].some((caracter) => caracter.charCodeAt(0) < 32)) {
    return null
  }
  const ruta = valor.split(/[?#]/)[0] ?? valor
  return esRutaPublica(ruta) ? null : valor
}

// La clave de la URL con la página a la que vuelve una pantalla a la que se llegó de otra (la hoja de cotizar desde el «⋯» de un lead,
// «Comparar cotizaciones»). Se lee siempre con `returnToSeguro()`.
export const CLAVE_DE_VUELTA = 'returnTo'

// La ruta con `returnTo` = `volverA` (reemplaza uno que ya tuviera); sin `volverA`, igual.
export function conVuelta(ruta: string, volverA: string | null): string {
  if (volverA === null) {
    return ruta
  }
  const [camino = ruta, consulta = ''] = ruta.split('?', 2)
  const parametros = new URLSearchParams(consulta)
  parametros.set(CLAVE_DE_VUELTA, volverA)
  return `${camino}?${parametros.toString()}`
}

// A dónde va alguien después de ingresar.
export function destinoTrasIngresar(returnTo: string | null | undefined): string {
  return returnToSeguro(returnTo) ?? RUTAS.inicio
}

export function rutaDeIngreso(returnTo?: string | null): string {
  const seguro = returnToSeguro(returnTo)
  if (!seguro || seguro === RUTAS.inicio) {
    return RUTAS.ingreso
  }
  return `${RUTAS.ingreso}?returnTo=${encodeURIComponent(seguro)}`
}

export type PeticionDeAcceso = {
  ruta: string
  // La query tal cual llega, con su `?` (o vacía).
  busqueda: string
  haySesion: boolean
  // Una Server Action no se redirige: tiene que poder responder «tu sesión venció» sin que la
  // persona pierda el formulario que tiene abierto.
  esAccion: boolean
}

export type DecisionDeAcceso = { tipo: 'seguir' } | { tipo: 'redirigir'; destino: string }

export function decidirAcceso(peticion: PeticionDeAcceso): DecisionDeAcceso {
  const { ruta, busqueda, haySesion, esAccion } = peticion
  if (esAccion) {
    return { tipo: 'seguir' }
  }
  if (haySesion) {
    if (!SOLO_SIN_SESION.includes(ruta)) {
      return { tipo: 'seguir' }
    }
    const returnTo = new URLSearchParams(busqueda).get('returnTo')
    return { tipo: 'redirigir', destino: destinoTrasIngresar(returnTo) }
  }
  if (esRutaPublica(ruta)) {
    return { tipo: 'seguir' }
  }
  return { tipo: 'redirigir', destino: rutaDeIngreso(`${ruta}${busqueda}`) }
}

// Un parámetro de `searchParams` puede venir repetido (`?a=1&a=2`): vale el primero.
export function unParametro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor
}
