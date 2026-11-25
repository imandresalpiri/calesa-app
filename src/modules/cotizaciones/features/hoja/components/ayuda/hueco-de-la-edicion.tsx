'use client'

import { createContext, type ComponentType } from 'react'
import type { PropsDeLaEdicionDeLaTabla } from '../huecos'

// El hueco de la edición de una tabla desde la ayuda: el proveedor del área `tablas` lo llena con su componente (diferido) sólo en la hoja nueva de quien configura el
// origen (lo decide la página). Sin él, la tabla de la ayuda sólo se consulta.
export const ContextoDeLaEdicionDeLaTabla =
  createContext<ComponentType<PropsDeLaEdicionDeLaTabla> | null>(null)
