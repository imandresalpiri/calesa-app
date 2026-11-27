import 'server-only'
import { PESO_MAXIMO_LOGO, leerAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leerHojaDeUnaGuardada } from '../../areas/nucleo/composicion'
import { webpDeUnaGuardada } from '../../areas/tarjeta/composicion'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import type { AnchoDeLaImagen } from '../../entities/ruta-de-la-hoja'
import { contextoDeLaPagina } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  paginaDeLaImagen,
  type ContextoDeQuienMira,
} from '../../entities/tarjeta/pagina-de-la-imagen'

export type ImagenArmada = {
  bytes: Uint8Array<ArrayBuffer>
  // Con el primer recálculo: sin él la tarjeta sale sólo con el total, y esa imagen se entrega sin que el navegador la guarde (la ruta responde `no-store`).
  conRecalculo: boolean
  // Con todo lo que dibuja: el contexto leído sin fallos y el logo y la foto que pide, bajados. Si no, la tarjeta sale sin eso y tampoco se deja guardar: con la
  // ETag, un fallo de un momento quedaría fijo (la huella no lo mira).
  completa: boolean
}

// El contexto de quien mira y si se leyó entero (`completo`: ninguna lectura falló).
export type ContextoLeido = { contexto: ContextoDeQuienMira; completo: boolean }

// Arma la imagen de la tarjeta de una guardada para quien la pide, con su sesión (`docs/COTIZADOR.md` › «La imagen de la tarjeta»): la hoja de lo guardado y el
// primer recálculo (`leerHojaDeUnaGuardada`), los ajustes de la empresa (`leerAjustes()`, que falla en vez de dar lo de fábrica: la zona, el formato y el logo) y
// el contexto de quien mira (el cliente si lo ve, el vehículo y él como asesor, que lo arma `src/app`), en el ancho pedido. Va en `features/` porque cruza con
// `empresa`. Con `sinMoneda`, los montos sin su moneda (la variante que se ve con el Modo Live). Lo que no existe, está en la papelera o no se ve, `sin_permiso`; lo
// demás que falle al armar, `inesperado`.
export async function armarLaImagen(
  id: string,
  {
    contextoDe,
    ancho,
    sinMoneda = false,
  }: {
    contextoDe: (hoja: HojaDeUnaGuardada) => Promise<ContextoLeido>
    ancho: AnchoDeLaImagen | null
    sinMoneda?: boolean
  },
): Promise<Resultado<ImagenArmada>> {
  const lectura = await leerHojaDeUnaGuardada(id)
  if (!lectura.ok) {
    return { ok: false, error: lectura.error }
  }
  const { hoja, inicial } = lectura.data
  const [{ contexto, completo }, ajustes] = await Promise.all([contextoDe(hoja), leerAjustes()])
  if (!ajustes.ok) {
    return fallo('inesperado', 'No se pudieron leer los ajustes de la empresa.')
  }
  const { nombre, logoRuta, locale, zonaHoraria } = ajustes.data.ajustes
  const url = urlPublicaONull('marca', logoRuta)
  const imagen = await webpDeUnaGuardada(
    {
      lectura: lectura.data,
      // El día del último guardado y el del vencimiento, en la zona de la empresa: lo mismo que la vista previa de esa guardada y que su PDF.
      contexto: contextoDeLaPagina(
        paginaDeLaImagen({
          hoja,
          contexto,
          empresa: nombre,
          logo: url === null ? null : { nombre, url },
        }),
        { zona: zonaHoraria, hoy: hoja.cotizacion.actualizadoEn },
      ),
      locale,
      empresa: nombre,
      topeDelLogo: PESO_MAXIMO_LOGO,
    },
    { ancho, sinMoneda },
  )
  if (!imagen.ok) {
    return imagen
  }
  return ok({
    bytes: imagen.data.bytes,
    conRecalculo: inicial.respuesta !== null,
    completa: completo && imagen.data.completa,
  })
}
