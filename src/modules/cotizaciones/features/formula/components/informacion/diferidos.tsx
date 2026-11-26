'use client'

import { diferido } from '@/shared/ui/diferido'

// «Información de la fórmula» se pide recién al abrirse (con las fechas y lo regional de sus secciones): la pestaña no lo carga para mostrarse. Se monta con
// `useAbiertoAlgunaVez()`.
export const ModalDeLaInformacionDiferido = diferido(() =>
  import('./modal-de-la-informacion').then((modulo) => modulo.ModalDeLaInformacion),
)
