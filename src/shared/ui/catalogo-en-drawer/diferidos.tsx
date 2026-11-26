'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoListado } from '@/shared/ui/esqueletos/esqueleto-listado'
import type { PropsDelCatalogo } from './tipos'

// El cuerpo del panel se pide al abrirlo: con la lista, el formulario y el diálogo de quitar, viajaría en la pantalla del editor.
export const CuerpoDelCatalogo = diferido<PropsDelCatalogo>(
  () => import('./cuerpo-del-catalogo').then((modulo) => modulo.CuerpoDelCatalogo),
  { esqueleto: <EsqueletoListado filas={2} columnas={2} />, aviso: 'pantalla' },
)
