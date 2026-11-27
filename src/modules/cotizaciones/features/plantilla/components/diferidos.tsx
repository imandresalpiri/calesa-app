'use client'

import { diferido } from '@/shared/ui/diferido'

// «Publicar la tarjeta de <Origen>» (4.19-3c) se pide recién al abrirse: la pestaña no carga el código del formulario para mostrarse. Se monta con `useAbiertoAlgunaVez()`.
export const ModalDePublicarLaTarjetaDiferido = diferido(() =>
  import('./modal-de-publicar-la-tarjeta').then((modulo) => modulo.ModalDePublicarLaTarjeta),
)

// «Descartar el borrador de la tarjeta de <Origen>» (4.19-3c), igual.
export const DescartarLaPlantillaDiferido = diferido(() =>
  import('./descartar-la-plantilla').then((modulo) => modulo.DescartarLaPlantilla),
)

// «Información de la tarjeta», igual: de dónde nace lo que se edita y la publicada.
export const ModalDeLaInformacionDeLaTarjetaDiferido = diferido(() =>
  import('./modal-de-la-informacion-de-la-tarjeta').then(
    (modulo) => modulo.ModalDeLaInformacionDeLaTarjeta,
  ),
)
