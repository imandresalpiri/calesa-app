// Los datos con que se llena el PDF de un arte pedido desde el editor, leídos de nuevo con la sesión de quien pide (nunca lo que manda el
// navegador), como los arma el editor (`datos-del-editor.ts` y las rutas del ejemplo): sin nada elegido, los de ejemplo; con un vehículo, todo
// real. La cotización sólo si es de ese vehículo y quien pide la ve; el lead, sólo si está entre sus relacionados (con los clientes apagados en
// el Modo Live, ninguno). Además, el catálogo del origen, los logos con archivo y de dónde salen las imágenes.
//
// `null` si el vehículo elegido ya no se ve (el 404 del vehículo); una cotización que ya no se ve o es de otro vehículo sale sin cotización.
import 'server-only'
import {
  datosDelArteDeEjemplo,
  datosDelEjemploElegido,
  leadsDelEjemplo,
  variablesDelArte,
  type CatalogoDelArte,
  type DatosDelArte,
  type EjemploElegido,
  type FijosDelArte,
  type LogoDelEditor,
} from '@/modules/artes'
import { conArchivo, leerLogos } from '@/modules/empresa'
import type { requerirSesion } from '@/modules/equipo'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leerCotizacionDelArte, type CotizacionDelArte } from '../leer-cotizacion-del-arte'
import { leerFijosDelArte } from '../leer-fijos-del-arte'
import { leerVehiculoDelArte, type VehiculoDelArte } from '../leer-vehiculo-del-arte'
import type { DeDondeSalen } from './imagenes-para-el-pdf'

type Sesion = Awaited<ReturnType<typeof requerirSesion>>

export type DatosParaElPdf = {
  datos: DatosDelArte
  catalogo: CatalogoDelArte
  logos: LogoDelEditor[]
  deDonde: Omit<DeDondeSalen, 'quien'>
}

const NO_SE_LEYO_EL_ORIGEN = 'No pudimos leer el origen de esta plantilla.'

type Elegido = { vehiculo: VehiculoDelArte; cotizacion: CotizacionDelArte | null }

async function leerElElegido(
  sesion: Sesion,
  origen: string,
  eleccion: EjemploElegido,
): Promise<Resultado<Elegido | null>> {
  const sinCotizacion: Resultado<CotizacionDelArte | null> = ok(null)
  const [vehiculo, cotizacion] = await Promise.all([
    leerVehiculoDelArte(sesion, { id: eleccion.vehiculoId, origen }),
    eleccion.cotizacionId === null
      ? sinCotizacion
      : leerCotizacionDelArte(sesion, eleccion.cotizacionId),
  ])
  if (!vehiculo.ok || vehiculo.data === null) {
    return vehiculo.ok ? ok(null) : vehiculo
  }
  if (!cotizacion.ok) {
    return cotizacion
  }
  const deEseVehiculo = cotizacion.data?.vehiculoId === eleccion.vehiculoId ? cotizacion.data : null
  return ok({ vehiculo: vehiculo.data, cotizacion: deEseVehiculo })
}

function conElElegido(
  { vehiculo, cotizacion }: Elegido,
  eleccion: EjemploElegido,
  fijos: FijosDelArte,
) {
  const lead =
    leadsDelEjemplo(vehiculo.respuesta.leads).find((l) => l.leadId === eleccion.leadId) ?? null
  return {
    datos: datosDelEjemploElegido(
      { vehiculo: vehiculo.respuesta, cotizacion: cotizacion?.respuesta ?? null, lead },
      fijos,
    ),
    fotos: vehiculo.fotos,
  }
}

export type ConDatos = { datos: DatosDelArte; fotos: VehiculoDelArte['fotos'] }

// Sin elección, los datos de ejemplo; con ella, los del elegido si todavía se ve (si no, nulo).
function conLosDatos(
  elegido: Resultado<Elegido | null> | null,
  eleccion: EjemploElegido | null,
  { fijos, origen }: { fijos: FijosDelArte; origen: string },
): Resultado<ConDatos | null> {
  if (elegido === null || eleccion === null) {
    return ok({ datos: datosDelArteDeEjemplo({ fijos, origen }), fotos: [] })
  }
  if (!elegido.ok) {
    return elegido
  }
  return ok(elegido.data === null ? null : conElElegido(elegido.data, eleccion, fijos))
}

// Lo que no depende de los datos elegidos: el origen de la plantilla con su catálogo, lo fijo del arte y los logos con archivo.
export type LoComunDelPdf = {
  origen: string
  catalogo: CatalogoDelArte
  fijos: FijosDelArte
  logos: ReturnType<typeof conArchivo>
}

export async function leerLoComunDelPdf(origenId: string): Promise<Resultado<LoComunDelPdf>> {
  const [origenes, layout, fijos, logos] = await Promise.all([
    getOrigenes(true),
    leerLayout(origenId, { conUso: false }),
    leerFijosDelArte(),
    leerLogos(),
  ])
  const origen = origenes.ok ? origenes.data.find((o) => o.id === origenId) : undefined
  if (!origen) {
    return fallo('inesperado', NO_SE_LEYO_EL_ORIGEN)
  }
  return ok({
    origen: origen.nombre,
    catalogo: variablesDelArte({ tipo: origen.tipo, campos: layout.ok ? layout.data.campos : [] }),
    fijos,
    logos: logos.ok ? conArchivo(logos.data) : [],
  })
}

// Los datos ya armados con lo común: los logos van al resolver sin su ruta; las imágenes reales salen sólo de lo que es real.
export function datosParaElPdf(comun: LoComunDelPdf, { datos, fotos }: ConDatos): DatosParaElPdf {
  const real = !datos.deEjemplo
  return {
    datos,
    catalogo: comun.catalogo,
    logos: comun.logos.map(({ id, nombre, ancho, alto }) => ({ id, nombre, ancho, alto })),
    deDonde: {
      vehiculoId: real ? (datos.vehiculo?.id ?? null) : null,
      fotos,
      cotizacionId: real ? (datos.cotizacion?.id ?? null) : null,
      logos: comun.logos,
    },
  }
}

export async function leerDatosParaElPdf(
  sesion: Sesion,
  { origenId, eleccion }: { origenId: string; eleccion: EjemploElegido | null },
): Promise<Resultado<DatosParaElPdf | null>> {
  const [comun, elegido] = await Promise.all([
    leerLoComunDelPdf(origenId),
    eleccion === null ? null : leerElElegido(sesion, origenId, eleccion),
  ])
  if (!comun.ok) {
    return comun
  }
  const { fijos, origen } = comun.data
  const conDatos = conLosDatos(elegido, eleccion, { fijos, origen })
  if (!conDatos.ok || conDatos.data === null) {
    return conDatos.ok ? ok(null) : conDatos
  }
  return ok(datosParaElPdf(comun.data, conDatos.data))
}
