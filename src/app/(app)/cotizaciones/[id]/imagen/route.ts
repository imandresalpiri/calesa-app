import { z } from 'zod'
import {
  anchoDeLaImagen,
  armarLaImagen,
  CLAVE_DEL_ANCHO,
  CLAVE_SIN_MONEDA,
  coincideLaEtiqueta,
  etiquetaDeLaImagen,
  leerHuellaDeLaImagen,
  sinMonedaDeLaImagen,
  type ContextoLeido,
} from '@/modules/cotizaciones'
import { requerirSesion } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'
import { asesorLeido, clienteDe, vehiculoDe, vehiculoDeLaTarjeta } from '../../datos-de-la-tarjeta'
import {
  origenesElegidosEnElLive,
  origenOcultoEnElLive,
  rutaOcultaEnElLive,
} from '../../../_live/guarda'

// La imagen de la tarjeta de una cotización guardada (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): lo guardado en WebP, armado al pedirlo para quien lo pide
// (su asesor es esa persona; el cliente, sólo si lo ve), con su sesión (la base decide; nunca la secret key). No se guarda en ningún lado del servidor.
//
//   GET /cotizaciones/<id>/imagen[?ancho=480][&sin-moneda=1]
//   200 image/webp | 304 | 307 al ingreso o a cerrar la sesión | 404 text/plain | 500 text/plain
//
// `?sin-moneda=1` es la variante que se ve con el Modo Live: los montos sin su moneda (otro valor se ignora, como un ancho que no es de la lista).
// La ETag es la huella de lo que dibuja para quien pide (`cotizacion_imagen_huella()`), quien pide, la versión del dibujo, el ancho y la variante; con `private, no-cache` el
// navegador pregunta cada vez y, si nada cambió, recibe un 304 sin que se arme nada. Con «Ver como» (la interfaz muestra los permisos de otro rol) o sin el primer
// recálculo (la tarjeta sale sólo con el total) o incompleta (una lectura falló o el logo o la foto no llegaron: con la ETag quedaría fija), `no-store` y sin ETag.
// Lo que no existe, está en la papelera o no se ve es el mismo 404 que el PDF, nunca 403.
// Si armarla falla, 500 `no-store`: nunca una vieja.
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar la imagen. Vuelve a intentarlo.'
const SIN_ADIVINAR = { 'X-Content-Type-Options': 'nosniff' }
const SIN_GUARDAR = { 'Cache-Control': 'private, no-store', ...SIN_ADIVINAR }

const texto = (cuerpo: string, status: number) =>
  new Response(cuerpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SIN_GUARDAR },
  })

// Lo que no existe, está en la papelera o no se ve, 404; lo demás, 500.
const falla = (codigo: string) =>
  codigo === 'sin_permiso' || codigo === 'no_encontrado'
    ? texto(NO_DISPONIBLE, 404)
    : texto(NO_SE_PUDO, 500)

const conEtiqueta = (etiqueta: string) => ({
  'Cache-Control': 'private, no-cache',
  ETag: etiqueta,
  ...SIN_ADIVINAR,
})

// Cuánto tardó cada paso, para la pestaña de red (`Server-Timing`), en ms enteros: es una cabecera, no un número que se muestra.
const tiempos = (pasos: Record<string, number>) =>
  Object.entries(pasos)
    .map(([paso, ms]) => `${paso};dur=${String(Math.round(ms))}`)
    .join(', ')

// Una lectura y si salió: un error deja el dato nulo.
const leida = <T>(lectura: Promise<T>) =>
  lectura.then(
    (valor) => ({ valor, ok: true }),
    () => ({ valor: null, ok: false }),
  )

// Lo que dibuja la imagen de quien pide: lo que esa persona ve, como el PDF (el cliente sólo con `leads.ver`; un error al leerlo, sin ese dato y sin que la imagen
// quede `completa`) y ella como asesor.
async function contextoDeQuienMira(
  permisos: Permisos,
  cotizacion: { leadId: string | null; vehiculoId: string | null },
): Promise<ContextoLeido> {
  const [cliente, vehiculo, asesor] = await Promise.all([
    leida(clienteDe(permisos, cotizacion.leadId)),
    leida(vehiculoDe(cotizacion.vehiculoId)),
    asesorLeido(),
  ])
  return {
    contexto: {
      cliente: cliente.valor?.nombre ?? null,
      vehiculo: vehiculoDeLaTarjeta(vehiculo.valor),
      asesor: asesor.asesor,
    },
    completo: cliente.ok && vehiculo.ok && asesor.leido,
  }
}

// La etiqueta de quien mira con sus permisos, o nula con «Ver como» (y con el Live en algunos orígenes). Un fallo de la huella es la respuesta (404 o 500).
async function etiquetaDe(
  id: string,
  sesion: { usuarioId: string; perspectiva: { rol: unknown } },
  variante: { ancho: ReturnType<typeof anchoDeLaImagen>; sinMoneda: boolean },
): Promise<{ etiqueta: string | null } | { respuesta: Response }> {
  // Con «Ver como», o con el Modo Live en algunos orígenes (el de la cotización se sabe recién al leerla): sin ETag ni 304, se arma y se comprueba.
  if (sesion.perspectiva.rol !== null || (await origenesElegidosEnElLive())) {
    return { etiqueta: null }
  }
  const huella = await leerHuellaDeLaImagen(id)
  if (!huella.ok) {
    return { respuesta: falla(huella.error.codigo) }
  }
  return {
    etiqueta: etiquetaDeLaImagen({ huella: huella.data, usuarioId: sesion.usuarioId, ...variante }),
  }
}

export async function GET(
  peticion: Request,
  { params }: RouteContext<'/cotizaciones/[id]/imagen'>,
) {
  // La segunda barrera tras el proxy: sin sesión, al ingreso; con la cuenta dada de baja, a cerrar la sesión. Antes de leer nada.
  const sesion = await requerirSesion()
  if (await rutaOcultaEnElLive('cotizaciones')) {
    return texto(NO_DISPONIBLE, 404)
  }
  const { id } = await params
  if (!z.guid().safeParse(id).success) {
    return texto(NO_DISPONIBLE, 404)
  }
  const consulta = new URL(peticion.url).searchParams
  const ancho = anchoDeLaImagen(consulta.get(CLAVE_DEL_ANCHO))
  const sinMoneda = sinMonedaDeLaImagen(consulta.get(CLAVE_SIN_MONEDA))
  const inicio = performance.now()
  const leida = await etiquetaDe(id, sesion, { ancho, sinMoneda })
  if ('respuesta' in leida) {
    return leida.respuesta
  }
  const { etiqueta } = leida
  const huella = performance.now() - inicio
  if (etiqueta !== null && coincideLaEtiqueta(peticion.headers.get('if-none-match'), etiqueta)) {
    return new Response(null, {
      status: 304,
      headers: { ...conEtiqueta(etiqueta), 'Server-Timing': tiempos({ huella }) },
    })
  }
  let origenId: string | null = null
  const armada = await armarLaImagen(id, {
    contextoDe: (hoja) => {
      origenId = hoja.cotizacion.origenId
      return contextoDeQuienMira(sesion.permisos, hoja.cotizacion)
    },
    ancho,
    sinMoneda,
  })
  if (!armada.ok) {
    return falla(armada.error.codigo)
  }
  if (await origenOcultoEnElLive(origenId)) {
    return texto(NO_DISPONIBLE, 404)
  }
  const { conRecalculo, completa } = armada.data
  const cabeceras =
    etiqueta !== null && conRecalculo && completa ? conEtiqueta(etiqueta) : SIN_GUARDAR
  return new Response(armada.data.bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      ...cabeceras,
      'Server-Timing': tiempos({ huella, armar: performance.now() - inicio - huella }),
    },
  })
}
