'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDeEditorDeArticulo } from '@/shared/ui/esqueletos'
import type { PropsDeLaGuia } from './formulario-de-guia'
import type { PropsDeLaVistaPrevia } from './vista-previa-de-la-guia'

// El formulario de la guía se pide al abrir su página: Tiptap y el resto no viajan en otra pantalla.
export const FormularioDeGuiaDiferido = diferido<PropsDeLaGuia>(
  () => import('./formulario-de-guia').then((modulo) => modulo.FormularioDeGuia),
  { esqueleto: <EsqueletoDeEditorDeArticulo />, aviso: 'aqui' },
)

// La vista previa se pide al abrirla por primera vez: quien sólo escribe no paga su código.
export const VistaPreviaDeLaGuiaDiferida = diferido<PropsDeLaVistaPrevia>(
  () => import('./vista-previa-de-la-guia').then((modulo) => modulo.VistaPreviaDeLaGuia),
  { aviso: 'aqui' },
)
