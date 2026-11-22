'use client'

import type { ReactNode } from 'react'
import type { CampoBase } from '@/shared/lib/campos'
import { diferido } from '@/shared/ui/diferido'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import type { PropsDelCuerpo } from './cuerpo'
import { CuerpoDelEditor } from './cuerpo-del-editor'
import type { PropsDelFormulario } from './formulario-de-campo'

// El arrastre (dnd-kit) llega cuando hace falta; mientras, y si no llega, el mismo cuerpo quieto, con el lugar del asa guardado.
export const CuerpoConArrastreDiferido = diferido<PropsDelCuerpo>(
  () => import('./arrastre/cuerpo-con-arrastre').then((modulo) => modulo.CuerpoConArrastre),
  { aviso: 'aqui', enFrio: (props) => <CuerpoDelEditor {...props} /> },
)

// El formulario de un campo, al abrir su panel. `diferido()` no conserva los genéricos: se los devuelve el tipo de afuera.
export const FormularioDeCampoDiferido = diferido(
  () => import('./formulario-de-campo').then((modulo) => modulo.FormularioDeCampo),
  { esqueleto: <EsqueletoFormulario />, aviso: 'aqui' },
) as <Campo extends CampoBase, Cambios extends object, Nuevo>(
  props: PropsDelFormulario<Campo, Cambios, Nuevo>,
) => ReactNode
