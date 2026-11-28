// Lo que el editor de artes lee del vehículo de ejemplo desde el navegador, con la sesión de quien mira: las rutas GET de
// `src/app/(app)/artes/ejemplo/*` (las arma `src/app` con `vehiculos`, `cotizaciones` y `leads`; `artes` no los importa), validadas con los
// esquemas de `entities/datos/respuestas.ts`. Un `fetch` que no sigue la redirección (sin sesión la ruta manda al ingreso) y da textos propios,
// nunca el cuerpo: un 404 es «ya no se ve» (`no_encontrado`, la elección recordada se suelta en silencio) y un pedido que no llegó, sin
// conexión (`causa: 'sin_red'`).
import { MENSAJE_SIN_CONEXION, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  esquemaDeLaCotizacionDeEjemplo,
  esquemaDeLasCotizacionesDeEjemplo,
  esquemaDeLosVehiculosDeEjemplo,
  esquemaDelVehiculoDeEjemplo,
  type CotizacionDeEjemplo,
  type CotizacionesDeEjemplo,
  type VehiculoDeEjemplo,
  type VehiculosDeEjemplo,
} from '../entities/datos/respuestas'

export const MENSAJE_SIN_LOS_VEHICULOS = 'No se pudieron leer los vehículos.'
const MENSAJE_SESION_QUE_NO_VALE = 'Tu sesión ya no vale: vuelve a entrar.'
const MENSAJE_QUE_YA_NO_SE_VE = 'Ese vehículo ya no se ve.'

const RUTA_DEL_EJEMPLO = '/artes/ejemplo'

type Esquema<T> = { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }

async function leer<T>(
  ruta: string,
  esquema: Esquema<T>,
  senal?: AbortSignal,
): Promise<Resultado<T>> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      redirect: 'manual',
      cache: 'no-store',
      ...(senal === undefined ? {} : { signal: senal }),
    })
  } catch {
    return fallo('inesperado', MENSAJE_SIN_CONEXION, 'sin_red')
  }
  if (respuesta.type === 'opaqueredirect' || (respuesta.status >= 300 && respuesta.status < 400)) {
    return fallo('no_autenticado', MENSAJE_SESION_QUE_NO_VALE)
  }
  if (respuesta.status === 404) {
    return fallo('no_encontrado', MENSAJE_QUE_YA_NO_SE_VE)
  }
  if (!respuesta.ok || !/^application\/json\b/.test(respuesta.headers.get('content-type') ?? '')) {
    return fallo('inesperado', MENSAJE_SIN_LOS_VEHICULOS)
  }
  try {
    const leido = esquema.safeParse(await respuesta.json())
    return leido.success ? ok(leido.data) : fallo('inesperado', MENSAJE_SIN_LOS_VEHICULOS)
  } catch {
    return fallo('inesperado', MENSAJE_SIN_LOS_VEHICULOS)
  }
}

function conParametros(ruta: string, parametros: Readonly<Record<string, string | null>>): string {
  const busqueda = new URLSearchParams()
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== null && valor !== '') {
      busqueda.set(clave, valor)
    }
  }
  const texto = busqueda.toString()
  return texto === '' ? ruta : `${ruta}?${texto}`
}

// Una página de los vehículos del origen (lo más nuevo primero; con `texto` de 3 o más letras o números, los que coinciden).
export function leerVehiculosDeEjemplo(
  pedido: { origenId: string; texto: string | null; cursor: string | null },
  senal?: AbortSignal,
): Promise<Resultado<VehiculosDeEjemplo>> {
  const ruta = conParametros(`${RUTA_DEL_EJEMPLO}/vehiculos`, {
    origen: pedido.origenId,
    q: pedido.texto,
    cursor: pedido.cursor,
  })
  return leer(ruta, esquemaDeLosVehiculosDeEjemplo, senal)
}

// Los datos del vehículo para el arte y sus leads; 404 si es de otro origen que el de la plantilla.
export function leerDatosDelVehiculo(
  pedido: { id: string; origenId: string },
  senal?: AbortSignal,
): Promise<Resultado<VehiculoDeEjemplo>> {
  const ruta = conParametros(`${RUTA_DEL_EJEMPLO}/vehiculos/${encodeURIComponent(pedido.id)}`, {
    origen: pedido.origenId,
  })
  return leer(ruta, esquemaDelVehiculoDeEjemplo, senal)
}

// Una página de «De este vehículo» (la aprobada primero).
export function leerCotizacionesDelVehiculo(
  pedido: { id: string; cursor: string | null },
  senal?: AbortSignal,
): Promise<Resultado<CotizacionesDeEjemplo>> {
  const ruta = conParametros(
    `${RUTA_DEL_EJEMPLO}/vehiculos/${encodeURIComponent(pedido.id)}/cotizaciones`,
    { cursor: pedido.cursor },
  )
  return leer(ruta, esquemaDeLasCotizacionesDeEjemplo, senal)
}

// La cotización para el arte y su lead (si quien mira lo ve).
export function leerDatosDeLaCotizacion(
  id: string,
  senal?: AbortSignal,
): Promise<Resultado<CotizacionDeEjemplo>> {
  return leer(
    `${RUTA_DEL_EJEMPLO}/cotizaciones/${encodeURIComponent(id)}`,
    esquemaDeLaCotizacionDeEjemplo,
    senal,
  )
}

// Si el fallo es de la red (la lectura se reintenta al volver) y no de lo pedido.
export function esSinRed(error: { causa?: string }): boolean {
  return error.causa === 'sin_red'
}
