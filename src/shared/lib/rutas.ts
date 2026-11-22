import type { Route } from 'next'

// Rutas del acceso y la regla que decide quién pasa. Son nombres de rutas, no reglas del negocio:
// las usan `src/proxy.ts`, las actions de ingreso y el route handler que canjea los enlaces.

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
  // El inicio de Configuración. `/configuracion` solo redirige aquí en el servidor (`next.config.ts`).
  inicioDeConfiguracion: '/configuracion/inicio',
  equipo: '/configuracion/equipo',
  roles: '/configuracion/roles',
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
  // Catálogos: lo global de la empresa (los niveles y quién crea y quién ve de la cotización; los puertos, las navieras, las categorías de gasto y los
  // tipos de documento de toda la empresa; las tablas compartidas). Lo de cada origen vive en su página.
  catalogos: '/configuracion/catalogos',
  nivelesDeCotizacion: '/configuracion/catalogos/niveles',
  quienCreaYQuienVe: '/configuracion/catalogos/quien-crea-y-quien-ve',
  puertosDeLogistica: '/configuracion/catalogos/puertos',
  navierasDeLogistica: '/configuracion/catalogos/navieras',
  categoriasDeGastoDeLogistica: '/configuracion/catalogos/categorias-de-gasto',
  tiposDeDocumento: '/configuracion/catalogos/tipos-de-documento',
  tablasCompartidas: '/configuracion/catalogos/tablas',
  configuracionDeRepuestos: '/configuracion/repuestos',
  flujoDeRepuestos: '/configuracion/repuestos/flujo',
  catalogosDeRepuestos: '/configuracion/repuestos/catalogos',
  cotizadorDeRepuestos: '/configuracion/repuestos/cotizador',
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
  embarques: '/logistica/embarques',
  aduana: '/logistica/aduana',
  gastosDeLogistica: '/logistica/gastos',
  repuestos: '/repuestos',
  cotizaciones: '/cotizaciones',
  nuevaCotizacion: '/cotizaciones/nuevo',
} as const

// El valor de `?panel=` que abre el alta de un vehículo (`RUTAS.nuevoVehiculo`). Vive acá porque lo leen el módulo `vehiculos` y la paleta del buscador (que no puede importarlo).
export const PANEL_NUEVO_DE_VEHICULOS = 'nuevo'

// La unidad de logística (6.01) tiene su propia página: a ella apuntan las notificaciones de demora. `RUTAS` es un objeto fijo; la que lleva un id es una función.
export function unidadDeLogistica(id: string): string {
  return `${RUTAS.logistica}/vehiculo/${encodeURIComponent(id)}`
}

// Las pestañas de la página de un origen, en su orden: cada una es una sub-ruta `/configuracion/origenes/<id>/<parte>`. Viven acá porque
// las arman las actions y los enlaces de otros módulos (cotizaciones, flujos), que no pueden importar `src/app`.
export const PARTES_DEL_ORIGEN = [
  'datos',
  'campos',
  'categorias',
  'flujo',
  'formulas',
  'tablas',
] as const

export type ParteDelOrigen = (typeof PARTES_DEL_ORIGEN)[number]

function conConsulta(ruta: string, consulta?: Record<string, string>): Route {
  const parametros = new URLSearchParams(consulta).toString()
  return (parametros === '' ? ruta : `${ruta}?${parametros}`) as Route
}

// Una pestaña de un origen, con su consulta en el orden en que viene (`?fase=`, `?panel=`); sin consulta, sin `?`.
export function rutaDeParteDelOrigen(
  origenId: string,
  parte: ParteDelOrigen,
  consulta?: Record<string, string>,
): Route {
  return conConsulta(`${RUTAS.origenes}/${encodeURIComponent(origenId)}/${parte}`, consulta)
}

// Lo que se configura del cotizador de un origen: la Fórmula (con sus sub-pestañas Hoja y Tarjeta) y las Tablas, en su orden.
export const PESTANAS_DE_COTIZACION = ['formula', 'hoja', 'tarjeta', 'tablas'] as const

export type PestanaDeCotizacion = (typeof PESTANAS_DE_COTIZACION)[number]

const RUTA_EN_EL_ORIGEN: Record<PestanaDeCotizacion, string> = {
  formula: 'formula',
  hoja: 'formula/hoja',
  tarjeta: 'formula/tarjeta',
  tablas: 'tablas',
}

// Una pestaña del cotizador de un origen, en la página del origen (`…/origenes/<id>/formula`, `…/formula/hoja`, `…/formula/tarjeta`,
// `…/tablas`), con su consulta en el orden en que viene (`?tabla=`, `?panel=`); sin consulta, sin `?`.
export function rutaDeConfiguracionDeCotizacion(
  origenId: string,
  pestana: PestanaDeCotizacion,
  consulta?: Record<string, string>,
): Route {
  return conConsulta(
    `${RUTAS.origenes}/${encodeURIComponent(origenId)}/${RUTA_EN_EL_ORIGEN[pestana]}`,
    consulta,
  )
}

// Lo que se edita de una fórmula del origen, en su orden: cada parte es una sub-ruta `…/origenes/<id>/formulas/<fórmula>/<parte>`.
export const PARTES_DE_LA_FORMULA = ['planilla', 'hoja', 'tarjeta'] as const

export type ParteDeLaFormula = (typeof PARTES_DE_LA_FORMULA)[number]

// La lista de las fórmulas de un origen (`…/origenes/<id>/formulas`), con su consulta (`?panel=`); sin consulta, sin `?`.
export function rutaDeLasFormulas(origenId: string, consulta?: Record<string, string>): Route {
  return conConsulta(`${RUTAS.origenes}/${encodeURIComponent(origenId)}/formulas`, consulta)
}

// Una parte de una fórmula del origen (`…/formulas/<fórmula>/planilla|hoja|tarjeta`), con su consulta (`?fila=`, `?lugar=`, `?panel=`).
export function rutaDeLaFormula(
  origenId: string,
  formulaId: string,
  parte: ParteDeLaFormula,
  consulta?: Record<string, string>,
): Route {
  return conConsulta(
    `${RUTAS.origenes}/${encodeURIComponent(origenId)}/formulas/${encodeURIComponent(formulaId)}/${parte}`,
    consulta,
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
