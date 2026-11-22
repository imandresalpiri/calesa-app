'use client'

import { diferido } from '@/shared/ui/diferido'

// La confirmación de eliminar el origen se pide al abrirse (`useAbiertoAlgunaVez()`): el «⋯» no carga su código para mostrarse.
export const ConfirmarEliminarOrigenDiferido = diferido(() =>
  import('./confirmar-eliminar-origen').then((modulo) => modulo.ConfirmarEliminarOrigen),
)

// Lo de adentro del drawer «Datos» (el formulario, el selector de color): se pide al abrirlo por primera vez.
export const DatosEnElDrawerDiferido = diferido(() =>
  import('./datos/datos-en-el-drawer').then((modulo) => modulo.DatosEnElDrawer),
)
