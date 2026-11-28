// Lo que responden las rutas del vehículo de ejemplo (`src/app/(app)/artes/ejemplo/*`, `GET`, `private, no-store`): las arma `src/app` con
// `vehiculos`, `cotizaciones` y `leads`, y el editor las lee desde el navegador (`infra/ejemplo.client.ts`) con estos esquemas. Los cursores
// son opacos: el editor devuelve tal cual el `siguiente` que recibió. Nunca un teléfono ni un dato que quien mira no ve. Puro.
import { z } from 'zod'
import { TAMANO_DE_ESTE_VEHICULO, TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { esquemaDeLaCotizacionDelArte, esquemaDelVehiculoDelArte } from './tipos'

const cursor = z.string().min(1).max(400).nullable()

// `GET /artes/ejemplo/vehiculos?origen=<id>&q=<texto>&cursor=<siguiente>`: una página de los vehículos del origen que quien mira ve, lo más
// nuevo primero (con `q` de 3 o más letras o números, los que coinciden). `miniatura`: la de 480 px (para un `<img>`, no para el lienzo).
export const esquemaDeLaFilaDeVehiculo = z.object({
  id: z.guid(),
  titulo: z.string(),
  anio: z.number().int().nullable(),
  lote: z.string().nullable(),
  miniatura: z.url({ protocol: /^https?$/ }).nullable(),
})
export type FilaDeVehiculoDeEjemplo = z.infer<typeof esquemaDeLaFilaDeVehiculo>

export const esquemaDeLosVehiculosDeEjemplo = z.object({
  filas: z.array(esquemaDeLaFilaDeVehiculo).max(TAMANO_DE_VER_MAS),
  siguiente: cursor,
})
export type VehiculosDeEjemplo = z.infer<typeof esquemaDeLosVehiculosDeEjemplo>

// Los leads relacionados del vehículo, por grupo de «Relacionados» (los primeros de cada uno), sólo con su nombre. `motivo` en vez de los
// grupos: «Oculto en Modo Live» (el Live con los clientes apagados) o «No ves los leads de este origen.».
export const GRUPOS_DE_LEADS_DE_EJEMPLO = ['vinculado', 'interesado', 'cotizado'] as const
export type GrupoDeLeadsDeEjemplo = (typeof GRUPOS_DE_LEADS_DE_EJEMPLO)[number]

export const esquemaDelLeadDeEjemplo = z.object({ leadId: z.guid(), nombre: z.string().min(1) })
export type LeadDeEjemplo = z.infer<typeof esquemaDelLeadDeEjemplo>

export const esquemaDeLosLeadsDeEjemplo = z.union([
  z.object({
    grupos: z
      .array(
        z.object({
          tipo: z.enum(GRUPOS_DE_LEADS_DE_EJEMPLO),
          leads: z.array(esquemaDelLeadDeEjemplo).max(TAMANO_DE_VER_MAS),
        }),
      )
      .max(GRUPOS_DE_LEADS_DE_EJEMPLO.length),
  }),
  z.object({ motivo: z.string().min(1) }),
])
export type LeadsDeEjemplo = z.infer<typeof esquemaDeLosLeadsDeEjemplo>

// `GET /artes/ejemplo/vehiculos/<id>?origen=<id>`: los datos del vehículo para el arte y sus leads. 404 si no existe, no se ve o es de otro
// origen que el de la plantilla.
export const esquemaDelVehiculoDeEjemplo = z.object({
  vehiculo: esquemaDelVehiculoDelArte,
  leads: esquemaDeLosLeadsDeEjemplo,
})
export type VehiculoDeEjemplo = z.infer<typeof esquemaDelVehiculoDeEjemplo>

// `GET /artes/ejemplo/vehiculos/<id>/cotizaciones?cursor=<siguiente>`: las que quien mira ve de ese vehículo («De este vehículo»: la aprobada
// primero, luego lo más nuevo), de a `TAMANO_DE_ESTE_VEHICULO`. `total` y `moneda` para `<Monto>`; nulos si no tiene total.
export const esquemaDeLaFilaDeCotizacion = z.object({
  id: z.guid(),
  numero: z.number().int(),
  titulo: z.string(),
  total: z.number().nullable(),
  moneda: z.string().nullable(),
  modo: z.string().nullable(),
  aprobada: z.boolean(),
})
export type FilaDeCotizacionDeEjemplo = z.infer<typeof esquemaDeLaFilaDeCotizacion>

export const esquemaDeLasCotizacionesDeEjemplo = z.object({
  filas: z.array(esquemaDeLaFilaDeCotizacion).max(TAMANO_DE_ESTE_VEHICULO + 1),
  siguiente: cursor,
})
export type CotizacionesDeEjemplo = z.infer<typeof esquemaDeLasCotizacionesDeEjemplo>

// `GET /artes/ejemplo/cotizaciones/<id>`: la cotización para el arte y su lead (si quien mira lo ve), para elegirlo de entrada. 404 si no se ve.
export const esquemaDeLaCotizacionDeEjemplo = z.object({
  cotizacion: esquemaDeLaCotizacionDelArte,
  leadId: z.guid().nullable(),
})
export type CotizacionDeEjemplo = z.infer<typeof esquemaDeLaCotizacionDeEjemplo>
