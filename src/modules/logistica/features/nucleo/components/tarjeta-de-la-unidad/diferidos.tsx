'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelHueco } from '../esqueleto-del-hueco'

// Las pestañas de una tarjeta con varios huecos (Dinero) se piden al abrir su drawer: la página de la unidad no carga el código de las pestañas para dibujarse.
export const VistasDeLaTarjetaDiferidas = diferido(
  () => import('./vistas-de-la-tarjeta').then((modulo) => modulo.VistasDeLaTarjeta),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHueco /> },
)
