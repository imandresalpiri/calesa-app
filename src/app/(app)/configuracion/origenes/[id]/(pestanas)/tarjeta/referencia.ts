import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import {
  UNA,
  calculoDeLoGuardado,
  contextoDeLaPagina,
  leerHojaDeUnaGuardada,
  leerListadoDeCotizaciones,
  referenciaPlana,
  type ReferenciaDeLaTarjeta,
} from '@/modules/cotizaciones'
import { leerAjustes } from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import {
  asesorQueMira,
  clienteDe,
  oNulo,
  type QuienNombraAlCliente,
  tituloDeLaTarjeta,
  vehiculoDe,
  vehiculoDeLaTarjeta,
} from '../../../../../cotizaciones/datos-de-la-tarjeta'

const NO_SE_LEYO: ReferenciaDeLaTarjeta = { estado: 'no_se_leyo' }

async function leer(origenId: string, quien: QuienNombraAlCliente): Promise<ReferenciaDeLaTarjeta> {
  // UNA fila: la más reciente del origen que quien configura ve, sin papelera (`cotizaciones_listado()` como quien mira, por `cotizaciones_origen_creado_idx`; la RLS
  // decide).
  const pagina = await leerListadoDeCotizaciones({ origenId, cursor: null, tamano: UNA })
  if (!pagina.ok) return NO_SE_LEYO
  const [fila] = pagina.data.filas
  if (fila === undefined) return { estado: 'sin_cotizacion' }
  const lectura = await leerHojaDeUnaGuardada(fila.id)
  if (!lectura.ok) return NO_SE_LEYO
  const { hoja, inicial } = lectura.data
  // Como el PDF de esa guardada: el cliente sólo con `leads.ver` y si quien mira lo ve, el vehículo si lo ve, el asesor (quien mira) y los ajustes (la zona y el logo).
  const [cliente, vehiculo, asesor, ajustes] = await Promise.all([
    oNulo(clienteDe(quien, hoja.cotizacion.leadId)),
    oNulo(vehiculoDe(hoja.cotizacion.vehiculoId)),
    asesorQueMira(),
    leerAjustes(),
  ])
  if (!ajustes.ok) return NO_SE_LEYO
  const { nombre, logoRuta, zonaHoraria } = ajustes.data.ajustes
  const url = urlPublicaONull('marca', logoRuta)
  const contexto = contextoDeLaPagina(
    {
      titulo: tituloDeLaTarjeta(hoja.cotizacion, vehiculo),
      cliente: cliente?.nombre ?? null,
      vehiculo: vehiculoDeLaTarjeta(vehiculo),
      asesor,
      numero: hoja.cotizacion.numero,
      venceEl: hoja.venceEl,
      guardadaEl: hoja.cotizacion.actualizadoEn,
      empresa: nombre,
      logo: url === null ? null : { nombre, url },
    },
    { zona: zonaHoraria, hoy: hoja.cotizacion.actualizadoEn },
  )
  // Sin estados (el primer recálculo falló) es `no_se_leyo`: la geometría caería a la tarjeta por omisión y la capa del editor quedaría desalineada.
  return referenciaPlana(calculoDeLoGuardado(hoja, inicial.respuesta), {
    numero: hoja.cotizacion.numero,
    monedaBs: hoja.diseno.cabecera.monedaBs,
    contexto,
  })
}

// La referencia del lienzo del editor de la tarjeta (`docs/GLOSARIO.md` › «Referencia de la tarjeta»): la cotización más reciente del origen que quien configura ve,
// dibujada con **lo guardado** como el PDF (`src/app/(app)/cotizaciones/[id]/pdf/route.ts`), con las lecturas de siempre (el listado, la hoja guardada con su primer
// recálculo, los nombres por clave primaria y los ajustes), con la sesión de quien mira. La compone `src/app` porque cruza el listado, el núcleo y los módulos `leads`,
// `vehiculos` y `empresa`. **Nunca lanza**: un fallo es `no_se_leyo` (cifras de ejemplo y se dice); la página la pasa como promesa y la sección la espera junto a la
// plantilla.
export async function leerReferenciaDeLaTarjeta(
  origenId: string,
  quien: QuienNombraAlCliente,
): Promise<ReferenciaDeLaTarjeta> {
  try {
    return await leer(origenId, quien)
  } catch (error) {
    // Lo de Next (una redirección, la espera de lo dinámico al prerenderizar) sigue su camino; lo demás es «no se leyó».
    unstable_rethrow(error)
    return NO_SE_LEYO
  }
}
