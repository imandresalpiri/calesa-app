'use client'

import { diferido } from '@/shared/ui/diferido'
import { EsqueletoDelHueco } from '../../nucleo/components/esqueleto-del-hueco'

// El hueco «Documentos» se pide recién al abrir su bloque (o su pestaña): el panel de la unidad y la ficha no cargan el código de la lista para dibujarse. Recibe sólo `{ unidad }`.
export const HuecoDeDocumentosDiferido = diferido(
  () => import('./hueco-de-documentos').then((modulo) => modulo.HuecoDeDocumentos),
  { aviso: 'aqui', esqueleto: <EsqueletoDelHueco /> },
)

// El drawer de subir documentos de la página de la unidad se monta cerrado; su código se pide al hidratar el hueco (que ya se pidió al elegir su pestaña).
export const DrawerParaSubirDiferido = diferido(
  () => import('./drawer-para-subir').then((modulo) => modulo.DrawerParaSubir),
  { aviso: 'pantalla' },
)

// El hueco de subir un documento a las unidades de un grupo (6.06-3): también se pide al abrir su bloque. Recibe sólo `{ grupo }`.
export const HuecoDeDocumentosDelGrupoDiferido = diferido(() =>
  import('./hueco-de-documentos-del-grupo').then((modulo) => modulo.HuecoDeDocumentosDelGrupo),
)

// La vista previa de un documento y el modal de editarlo se montan al primer toque (`useAbiertoAlgunaVez`): el hueco no carga el visor, el zoom ni el formulario para dibujar la lista.
export const VistaPreviaDelDocumentoDiferida = diferido(
  () => import('./vista-previa-del-documento').then((modulo) => modulo.VistaPreviaDelDocumento),
  { aviso: 'pantalla' },
)

export const ModalDeEdicionDelDocumentoDiferido = diferido(
  () =>
    import('./modal-de-edicion-del-documento').then((modulo) => modulo.ModalDeEdicionDelDocumento),
  { aviso: 'pantalla' },
)

// La vista previa de un archivo de la bandeja (sólo para ver) también se monta al primer toque.
export const VistaPreviaLocalDiferida = diferido(
  () => import('./vista-previa-local').then((modulo) => modulo.VistaPreviaLocal),
  { aviso: 'pantalla' },
)
