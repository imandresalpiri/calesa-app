// Las redirecciones que quedan (`.claude/rules/rutas.md` › 5): las estructurales, que llevan a donde está la persona hoy, nunca a una ruta
// o un parámetro mudado. Una ruta mudada no redirige: da «no existe» y sus enlaces se actualizan en el mismo PR. La prueba
// (`sin-redirecciones.test.ts`) exige que el conjunto de archivos de `src/app` que redirigen sea exactamente el de esta lista, que
// `redirects()` de `next.config.ts` tenga sólo sus dos entradas y que el proxy no reescriba ni redirija fuera del acceso.

export interface Permitida {
  /** El archivo, desde la raíz del repo. */
  archivo: string
  /** Un texto del archivo que dice a dónde lleva (en `next.config.ts`, el destino de la entrada). */
  destino: string
  /** Sólo en `next.config.ts`: la fuente de la entrada de `redirects()`. */
  desde?: string
  motivo: string
}

const CONFIGURACION = 'src/app/(app)/configuracion'
const PUESTA_EN_MARCHA = `${CONFIGURACION}/origenes/[id]/puesta-en-marcha`

export const PERMITIDAS: readonly Permitida[] = [
  {
    archivo: 'next.config.ts',
    desde: '/configuracion',
    destino: '/configuracion/inicio',
    motivo: '`/configuracion` no tiene página: su inicio',
  },
  {
    archivo: 'next.config.ts',
    desde: '/repuestos/configuracion',
    destino: '/repuestos/configuracion/flujo',
    motivo: 'La configuración de Repuestos no tiene página índice: su primera pestaña',
  },
  {
    archivo: `${CONFIGURACION}/con-parametros.ts`,
    destino: 'status: 308',
    motivo: 'Define `redireccionPermanente()`, la respuesta de las estructurales de un `route.ts`',
  },
  {
    archivo: `${CONFIGURACION}/empresa/comprobantes/page.tsx`,
    destino: 'primeraSubseccionAbierta(SECCION_DE_EMPRESA, permisos)',
    motivo: 'Una sub-sección sin permiso: la primera de Empresa que la persona puede abrir',
  },
  {
    archivo: `${CONFIGURACION}/web/page.tsx`,
    destino: 'primeraSubseccionAbierta(SECCION_DE_WEB, permisos)',
    motivo: 'Sitio web no tiene página índice: su primera sub-sección que la persona puede abrir',
  },
  {
    archivo: `${CONFIGURACION}/web/entrar.ts`,
    destino: 'primeraSubseccionAbierta(SECCION_DE_WEB, permisos)',
    motivo: 'Una sub-sección de Sitio web sin permiso: la primera que la persona puede abrir',
  },
  {
    archivo: `${CONFIGURACION}/leads/page.tsx`,
    destino: 'RUTAS.camposDeLeads',
    motivo: 'Configuración › Leads sin `leads.configurar`: los campos, que sí abre',
  },
  {
    archivo: `${CONFIGURACION}/leads/abrir.ts`,
    destino: 'RUTAS.configuracionDeLeads',
    motivo: 'Una sub-sección de Leads sin permiso: la sección, que dice qué puede abrir',
  },
  {
    archivo: `${CONFIGURACION}/origenes/[id]/entrada.ts`,
    destino: 'destinoAlEntrar(',
    motivo:
      '`/configuracion/origenes/<id>` no tiene página: la última pestaña que la persona abrió ahí',
  },
  {
    archivo: `${PUESTA_EN_MARCHA}/route.ts`,
    destino: 'pasoPendiente(abierta.estado)',
    motivo: 'La puesta en marcha sin paso: el primero que falta',
  },
  {
    archivo: `${PUESTA_EN_MARCHA}/listo/page.tsx`,
    destino: 'rutaDeLaPuestaEnMarcha(id)',
    motivo: '«Listo» con pasos pendientes: el que falta',
  },
  {
    archivo: `${PUESTA_EN_MARCHA}/publicar/page.tsx`,
    destino: "rutaDeLaPuestaEnMarcha(id, 'listo')",
    motivo: '«Publicar» ya hecho: «Listo»',
  },
  {
    archivo: 'src/app/(app)/chat/page.tsx',
    destino: '/chat?c=',
    motivo: '`/chat?con=` abre (o crea) la conversación con esa persona',
  },
  {
    archivo: 'src/app/auth/callback/route.ts',
    destino: 'canjearAcceso(',
    motivo: 'El acceso: canjea el código o el enlace del correo por una sesión',
  },
  {
    archivo: 'src/app/auth/cerrar/route.ts',
    destino: 'cerrarSiInactiva(',
    motivo: 'El acceso: cierra la sesión de una cuenta bloqueada o dada de baja',
  },
  {
    archivo: 'src/app/iconos/vigente/[tamano]/route.ts',
    destino: 'urlDeIcono(',
    motivo: 'La dirección fija del ícono: al generado desde el logo o al neutro',
  },
  {
    archivo: 'src/app/api/portal/documentos/[id]/route.ts',
    destino: 'Location: url.data',
    motivo: 'Un documento del portal: a su URL firmada de Storage',
  },
]

// Un texto entre comillas (se conserva) o un comentario (se borra). Las plantillas con `${…}` anidados no se separan; alcanza para buscar llamadas.
const TEXTO_O_COMENTARIO =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

/** El código sin sus comentarios: un 308 o un `redirect(` que sólo se nombra no cuenta. */
export function sinComentarios(texto: string): string {
  return texto.replace(TEXTO_O_COMENTARIO, (_todo, comillas: string | undefined) => comillas ?? '')
}

const LLAMADAS = /\b(?:redirigir|redirect|permanentRedirect|redireccionPermanente)\(/g
// Un estado 30x escrito como número en un `route.ts` (`status: 307`, `vacia(302, …)`); fuera de un `route.ts` un 301 puede ser cualquier cosa.
const ESTADOS = /\b30[12378]\b/g

/**
 * Lo que redirige en un archivo de `src/app`: las llamadas (`redirigir(`, `redirect(`, `NextResponse.redirect(`, `permanentRedirect(`,
 * `redireccionPermanente(`) y, en un `route.ts`, un estado 301, 302, 303, 307 o 308. Vacío si no redirige.
 */
export function redireccionesEn(texto: string, tipo: 'ruta' | 'otro'): string[] {
  const codigo = sinComentarios(texto)
  const llamadas = [...codigo.matchAll(LLAMADAS)].map((m) => m[0])
  const estados = tipo === 'ruta' ? [...codigo.matchAll(ESTADOS)].map((m) => m[0]) : []
  return [...llamadas, ...estados]
}

/** Lo que el proxy no puede hacer: reescribir, o redirigir a otro lado que el que decide el acceso (`decidirAcceso()`). Vacío si cumple. */
export function faltasDelProxy(texto: string): string[] {
  const codigo = sinComentarios(texto)
  const faltas: string[] = []
  if (/NextResponse\.rewrite\(/.test(codigo)) faltas.push('reescribe (NextResponse.rewrite)')
  const redirecciones = [...codigo.matchAll(/NextResponse\.redirect\(([^\n]*)/g)]
  if (redirecciones.length !== 1 || !redirecciones[0]?.[1]?.includes('decision.destino')) {
    faltas.push(
      `redirige ${String(redirecciones.length)} veces; sólo puede una, a decision.destino (decidirAcceso)`,
    )
  }
  return faltas
}
