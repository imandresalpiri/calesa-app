'use client'

import { diferido } from '@/shared/ui/diferido'

// El catálogo «Categorías de gasto» de Logística › Configuración (6.11-4) se pide al abrir su pestaña: la página de configuración no carga el código de la lista, el formulario ni el diálogo.
export const CategoriasDeGastoDiferido = diferido(() =>
  import('./categorias-de-gasto').then((modulo) => modulo.CategoriasDeGasto),
)
