'use client'

import { createContext } from 'react'

// Si se puede arrastrar ahora: con permiso, sin búsqueda y sin un cambio en vuelo. Apagado, las filas siguen montadas (no se pierde lo
// escrito) y sus asas quedan `aria-disabled`.
export const ArrastreActivo = createContext(false)
