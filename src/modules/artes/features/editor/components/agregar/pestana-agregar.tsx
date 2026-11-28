'use client'

import { motivoParaAgregar } from '../../../../entities/editor/agregar-en-el-panel'
import type { PropsDelPanelIzquierdo } from '../../tipos'
import { SeccionBiblioteca } from './seccion-biblioteca'
import { SeccionDeLaCotizacion } from './seccion-de-la-cotizacion'
import { SeccionFormas } from './seccion-formas'
import { SeccionLogo } from './seccion-logo'
import { SeccionTexto } from './seccion-texto'

type Props = Pick<PropsDelPanelIzquierdo, 'editor' | 'logos' | 'alAgregar' | 'pedidoDeLaBiblioteca'>

// La pestaña «Agregar» del panel izquierdo: Texto, Formas, Logo, De la cotización y Biblioteca, una debajo de otra. En sólo lectura o con la
// página en su tope de capas nada se agrega (cada botón dice por qué).
export function PestanaAgregar({ editor, logos, alAgregar, pedidoDeLaBiblioteca }: Props) {
  const motivo = motivoParaAgregar(editor.pagina, editor.soloLectura)
  return (
    <>
      <SeccionTexto motivo={motivo} alAgregar={alAgregar} />
      <SeccionFormas motivo={motivo} alAgregar={alAgregar} />
      <SeccionLogo logos={logos} motivo={motivo} alAgregar={alAgregar} />
      <SeccionDeLaCotizacion motivo={motivo} alAgregar={alAgregar} />
      <SeccionBiblioteca motivo={motivo} alAgregar={alAgregar} pedido={pedidoDeLaBiblioteca} />
    </>
  )
}
