// Lo que el servidor manda para «Compartir la cotización» (`GET /cotizaciones/<id>/compartir`): de esto, y de nada más, el navegador arma el texto en cada formato y
// zona sin volver a pedir. Las cifras llegan ya escritas desde la geometría de la tarjeta de lo guardado (sólo lo del nivel «todos», `cotizacion_tarjeta`), con el
// formato del PDF; nunca valores sueltos de lo guardado. El vehículo, sólo si quien pide lo ve. Las fotos, aparte y al pedirlas (`esquemaDeLasFotos`).
import { z } from 'zod'

// Las fotos de un vehículo, como mucho (el tope de `vehiculos_imagenes`).
export const TOPE_DE_FOTOS_PARA_COMPARTIR = 24

// El monto y su segunda línea, con su moneda (lo que se copia y se comparte) y sin ella (lo que el panel muestra con el Modo Live).
const esquemaDeLaLinea = z.object({
  concepto: z.string().nullable(),
  monto: z.string(),
  segunda: z.string().nullable(),
  montoSinMoneda: z.string(),
  segundaSinMoneda: z.string().nullable(),
})

const esquemaDeLaVersion = z.object({
  etiqueta: z.string(),
  cotizacionId: z.guid(),
  conceptos: z.array(esquemaDeLaLinea),
  total: esquemaDeLaLinea.nullable(),
})

// Un enlace que se puede pegar: http o https, nunca otro esquema.
const esquemaDelEnlace = z.url({ protocol: /^https?$/ })

export const esquemaDeLosDatos = z.object({
  numero: z.number().int(),
  // El título que se muestra y de dónde sale (`tituloDeLaCotizacion()`): con `vehiculo`, el texto no repite el título del vehículo.
  titulo: z.object({ texto: z.string(), fuente: z.enum(['titulo', 'vehiculo', 'numero']) }),
  // Quien la creó: «Creado por» del panel.
  autor: z.string().nullable(),
  // El asesor (quien comparte): su nombre, su cargo y su WhatsApp tal como se guardó, para la firma del texto; nulo si su perfil no se leyó.
  asesor: z
    .object({ nombre: z.string(), cargo: z.string().nullable(), telefono: z.string().nullable() })
    .nullable(),
  vehiculo: z
    .object({
      titulo: z.string(),
      lote: z.string().nullable(),
      anio: z.number().nullable(),
      kilometraje: z.number().nullable(),
      vin: z.string().nullable(),
      enlace: esquemaDelEnlace.nullable(),
      // ISO: el cierre de la subasta (su fin o, sin él, su inicio); nulo sin subasta.
      cierre: z.iso.datetime({ offset: true }).nullable(),
      // La zona IANA del patio, o nula si no se conoce.
      zonaDelPatio: z.string().nullable(),
      // Si tiene fotos (su portada): sin ellas no se ofrece «Fotos».
      hayFotos: z.boolean(),
    })
    .nullable(),
  conceptos: z.array(esquemaDeLaLinea),
  total: esquemaDeLaLinea.nullable(),
  // El nombre del modo de tipo de cambio con que se guardó; nulo si la hoja no declara modos.
  modo: z.string().nullable(),
  zonaDeLaEmpresa: z.string(),
  locale: z.string(),
  // Las cotizaciones hermanas (glosario: «Cotizaciones hermanas»): los conceptos y el total de cada opción, en el orden de las opciones (con su cotización, para su
  // imagen). Sin ellas, la cotización sola.
  versiones: z.tuple([esquemaDeLaVersion, esquemaDeLaVersion]).optional(),
})

export type DatosParaCompartir = z.infer<typeof esquemaDeLosDatos>
export type VehiculoParaCompartir = NonNullable<DatosParaCompartir['vehiculo']>

export const esquemaDeLasFotos = z.object({
  fotos: z
    .array(z.object({ id: z.guid(), miniatura: z.url(), completa: z.url() }))
    .max(TOPE_DE_FOTOS_PARA_COMPARTIR),
})

export type FotoParaCompartir = z.infer<typeof esquemaDeLasFotos>['fotos'][number]

// El enlace del vehículo si se puede pegar tal cual (http o https); si no, ninguno.
export function enlaceParaCompartir(texto: string | null): string | null {
  return texto !== null && esquemaDelEnlace.safeParse(texto).success ? texto : null
}
