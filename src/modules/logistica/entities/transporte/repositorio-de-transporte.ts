// Guardar el transporte de una unidad, dicho como interfaz (6.08-2). La implementación (Supabase, por `transporte_guardar`, con la versión) vive en `infra/transporte/guardar.ts` y se la
// entrega `areas/transporte/composicion.ts`.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { CambiosDeTransporte } from './transporte'

export type PedidoDeTransporte = {
  // El vehículo (el repuesto llega con 8.13).
  vehiculoId: string
  // La versión leída; nula = crear (si ya existía, la base dice `PT409`).
  actualizadoEnEsperado: string | null
  // Las versiones del embarque y del contenedor en que iba al leer (nulas si no iba en uno): un cambio de lo del embarque o del booking de un contenedor los escribe
  // para todos, y la base rechaza con `PT409` si cambiaron desde la lectura.
  embarqueEsperado: string | null
  contenedorEsperado: string | null
  cambios: CambiosDeTransporte
}

export type TransporteGuardado = { id: string; actualizadoEn: string; sinCambios: boolean }

export type RepositorioDeTransporte = {
  guardar: (pedido: PedidoDeTransporte) => Promise<ResultadoDeAccion<TransporteGuardado>>
}
