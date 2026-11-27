'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelTransporte } from './esqueleto-del-transporte'

// El hueco «Transporte» se pide recién al abrirse su tarjeta (su drawer no lo monta antes): el panel de la unidad no carga su código para dibujarse. Un hueco recibe sólo `{ unidad }`. El esqueleto
// reserva la línea del aviso.
export const HuecoDeTransporteDiferido = diferido(
  () => import('./hueco-de-transporte').then((modulo) => modulo.HuecoDeTransporte),
  { aviso: 'aqui', esqueleto: <EsqueletoDelTransporte /> },
)
