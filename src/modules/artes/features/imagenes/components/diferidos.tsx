'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeLaRejilla } from '../../plantillas/components/esqueleto-de-la-rejilla'

// La pestaña Imágenes llega recién al abrirla (la de Plantillas, que es la de entrada, no paga su código), con el esqueleto de la rejilla
// mientras tanto; sus modales y su confirmación, recién al abrirse.
export const PestanaDeImagenesDiferida = diferido(
  () => import('./pestana-de-imagenes').then((modulo) => modulo.PestanaDeImagenes),
  { esqueleto: <EsqueletoDeLaRejilla />, aviso: 'aqui' },
)

export const ModalSubirImagenDiferido = diferido(() =>
  import('./modal-subir-imagen').then((modulo) => modulo.ModalSubirImagen),
)

export const ModalRenombrarImagenDiferido = diferido(() =>
  import('./modal-renombrar-imagen').then((modulo) => modulo.ModalRenombrarImagen),
)

export const ConfirmarQuitarImagenDiferido = diferido(() =>
  import('./confirmar-quitar-imagen').then((modulo) => modulo.ConfirmarQuitarImagen),
)
