'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelHueco } from '../../nucleo/components/esqueleto-del-hueco'

// Los huecos «Gastos», «Pagos» y «Margen» se piden recién al abrirse su tarjeta (su drawer no los monta antes): el panel de la unidad no carga el código del formulario, la lista ni el margen
// para dibujarse. Un hueco recibe sólo `{ unidad }`.
export const HuecoDeGastosDiferido = diferido(
  () => import('./hueco-de-gastos').then((modulo) => modulo.HuecoDeGastos),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHueco /> },
)

export const HuecoDePagosDiferido = diferido(
  () => import('./hueco-de-pagos').then((modulo) => modulo.HuecoDePagos),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHueco /> },
)

export const HuecoDeMargenDiferido = diferido(
  () => import('./hueco-de-margen').then((modulo) => modulo.HuecoDeMargen),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHueco /> },
)

// El hueco de prorrateo del resumen de un grupo (6.11-4): también se pide al abrir su bloque.
export const HuecoDeProrrateoDiferido = diferido(() =>
  import('./hueco-de-prorrateo').then((modulo) => modulo.HuecoDeProrrateo),
)

// La pestaña «Pagos» de un proyecto de repuestos (8.13-5): se pide al abrirla.
export const PagosDelProyectoDiferido = diferido(() =>
  import('./pagos-del-proyecto').then((modulo) => modulo.PagosDelProyecto),
)
