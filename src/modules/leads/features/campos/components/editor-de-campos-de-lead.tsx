'use client'

import type { CatalogoLeido } from '@/shared/lib/catalogo'
import { EditorDeCampos } from '@/shared/ui/campos'
import type { CampoDeLead, DatosDeLaEmpresa } from '../../../entities/campo'
import { configuracionDeLeads } from '../configuracion'
import { useCampos } from '../hooks/use-campos'
import { useGruposDeCampos } from '../hooks/use-grupos-de-campos'

type Props = {
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly CampoDeLead[]
  // El catálogo de grupos de campos, también los inactivos.
  grupos: CatalogoLeido
  puedeGestionar: boolean
  // Para ofrecer «la de la empresa» diciendo cuál es.
  empresa: DatosDeLaEmpresa
}

// La pestaña «Campos» de Configuración › Leads: el editor compartido con las banderas, los textos y
// las operaciones de los leads.
export function EditorDeCamposDeLead({ campos, grupos, puedeGestionar, empresa }: Props) {
  const ediciones = useCampos()
  const catalogo = useGruposDeCampos(grupos, puedeGestionar)
  return (
    <EditorDeCampos
      campos={campos}
      puedeGestionar={puedeGestionar}
      configuracion={configuracionDeLeads({ campos, empresa })}
      ediciones={ediciones}
      grupos={catalogo}
    />
  )
}
