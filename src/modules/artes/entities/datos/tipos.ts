// Los datos con que se llena un arte (docs/GLOSARIO.md › «Elemento con datos»): el vehículo de ejemplo con una de sus cotizaciones y uno de sus
// leads, quien comparte y la empresa. `artes` no lee vehículos, cotizaciones ni la web: los arma `src/app` (`src/app/(app)/_arte/`) y llegan por
// las rutas de `/artes/ejemplo/*` o por props; de acá sale sólo la forma, con su esquema para leer lo que llega. Los montos llegan ya escritos,
// con su moneda y sin ella (el Modo Live): el lienzo no formatea dinero. Las fechas, como ISO. Puro.
import { z } from 'zod'
import { MAXIMO_DE_FOTOS_DEL_VEHICULO } from '../capas-del-documento'

// Las redes de la empresa que un arte puede nombrar: las de Sitio web › Ajustes, en su orden (`REDES_DEL_SITIO` de `web`).
export const REDES_DEL_ARTE = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
] as const
export type RedDelArte = (typeof REDES_DEL_ARTE)[number]

export type TipoDeOrigenDelArte = 'subasta' | 'manual'

// Un monto escrito dos veces: con su moneda y sin ella (lo que se ve con el Modo Live).
export const esquemaDelMontoDelArte = z.object({ conMoneda: z.string(), sinMoneda: z.string() })
export type MontoDelArte = z.infer<typeof esquemaDelMontoDelArte>

// Una foto del vehículo por su id y sus medidas: el archivo entra al lienzo por `/artes/fotos/<vehiculo>/<foto>` (del mismo origen).
export const esquemaDeLaFotoDelArte = z.object({
  id: z.guid(),
  ancho: z.number().positive(),
  alto: z.number().positive(),
})

// `cierre`: el de la subasta (su fin o, sin él, su inicio); `zonaDelPatio`: la zona IANA del patio o nula. `ficha`: el valor ya escrito de cada
// campo activo de la ficha del origen, por su clave (sólo los que tienen valor). `fotos`: en el orden de la galería, la portada primero.
export const esquemaDelVehiculoDelArte = z.object({
  id: z.guid(),
  titulo: z.string(),
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  anio: z.number().int().nullable(),
  color: z.string().nullable(),
  kilometraje: z.number().nullable(),
  vin: z.string().nullable(),
  lote: z.string().nullable(),
  ubicacion: z.string().nullable(),
  enlace: z.url({ protocol: /^https?$/ }).nullable(),
  origen: z.string(),
  cierre: z.iso.datetime({ offset: true }).nullable(),
  zonaDelPatio: z.string().nullable(),
  ficha: z.record(z.string(), z.string()),
  fotos: z.array(esquemaDeLaFotoDelArte).max(MAXIMO_DE_FOTOS_DEL_VEHICULO),
})
export type DatosDelVehiculo = z.infer<typeof esquemaDelVehiculoDelArte>

// La imagen de la tarjeta de la cotización, siempre la del mismo origen (`GET /cotizaciones/<id>/imagen`, sin la moneda con `?sin-moneda=1`).
const rutaDeLaTarjeta = z
  .string()
  .regex(/^\/cotizaciones\/[0-9a-f-]{36}\/imagen(\?sin-moneda=1)?$/i)

// `venceEl`: el día (`YYYY-MM-DD`, en la zona de la empresa). `celdas`: los montos de la tarjeta de lo guardado por su concepto (sólo lo del
// nivel «todos»).
export const esquemaDeLaCotizacionDelArte = z.object({
  id: z.guid(),
  numero: z.number().int(),
  total: esquemaDelMontoDelArte.nullable(),
  modo: z.string().nullable(),
  venceEl: z.iso.date().nullable(),
  celdas: z.record(z.string(), esquemaDelMontoDelArte),
  imagen: z.object({ src: rutaDeLaTarjeta, srcSinMoneda: rutaDeLaTarjeta }),
})
export type DatosDeLaCotizacion = z.infer<typeof esquemaDeLaCotizacionDelArte>

// Quien comparte: quien mira el editor (la firma del texto de hoy).
export type AsesorDelArte = { nombre: string; cargo: string | null; whatsapp: string | null }

export type EmpresaDelArte = {
  nombre: string
  web: string | null
  redes: Partial<Record<RedDelArte, string>>
  zona: string
  locale: string
}

// `deEjemplo`: sin nada elegido, el vehículo, la cotización y el lead son los de ejemplo (fotos y tarjeta de `public/artes/ejemplo/`); con un
// vehículo elegido, todo es real, sin mezclar. Quien comparte y la empresa son siempre los de verdad.
export type DatosDelArte = {
  deEjemplo: boolean
  vehiculo: DatosDelVehiculo | null
  cotizacion: DatosDeLaCotizacion | null
  lead: { nombre: string } | null
  asesor: AsesorDelArte | null
  empresa: EmpresaDelArte
}

// Lo que no depende del vehículo elegido: lo lee la página una vez.
export type FijosDelArte = Pick<DatosDelArte, 'asesor' | 'empresa'>
