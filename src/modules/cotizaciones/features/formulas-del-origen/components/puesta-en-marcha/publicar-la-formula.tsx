'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { FormulaDeLaLista } from '../../../../entities/formulas-del-origen/lista'
import {
  CLAVE_DE_LA_FORMULA_DEL_PANEL,
  PANEL_ACTIVAR_FORMULA,
} from '../../../../entities/formulas-del-origen/rutas'
import { QueSePublica } from '../que-se-publica'
import { ModalDeActivarDiferido } from './diferidos'

type Props = {
  origen: { id: string; nombre: string }
  // La fórmula de trabajo del origen, con sus piezas de hoy (la página la tomó de la lista).
  formula: FormulaDeLaLista
  // La activa que se vio (nula: el origen no tiene; la base lo vuelve a comprobar).
  activa: { id: string; nombre: string } | null
  // Adonde se sigue al publicar («Listo»).
  alListo: string
}

// El paso «Publicar» de la puesta en marcha: qué se publica y «Publicar…», que abre el modal de activar la fórmula (`?panel=activar-formula&formula=<id>`),
// con su nota, su PT409 y, si la base la rechaza, el lugar que hay que arreglar («Ir a la celda»). Al publicar se sigue a «Listo».
export function PublicarLaFormula({ origen, formula, activa, alListo }: Props) {
  const router = useRouter()
  const activar = usePanelPorUrl(PANEL_ACTIVAR_FORMULA, [CLAVE_DE_LA_FORMULA_DEL_PANEL])
  const abierto = activar.abierto && activar.valor(CLAVE_DE_LA_FORMULA_DEL_PANEL) === formula.id
  const apertura = useApertura(abierto)
  const montado = useAbiertoAlgunaVez(abierto)
  return (
    <div className="grid min-w-0 gap-4">
      <QueSePublica formula={formula} />
      <Button
        type="button"
        className="min-h-11 w-full sm:w-fit md:min-h-9"
        onClick={() => {
          activar.abrir({ [CLAVE_DE_LA_FORMULA_DEL_PANEL]: formula.id })
        }}
      >
        Publicar…
      </Button>
      {montado ? (
        <ModalDeActivarDiferido
          key={apertura}
          abierto={abierto}
          alCerrar={activar.cerrar}
          origen={origen}
          formula={formula}
          activa={activa}
          alActivar={() => {
            router.push(alListo as Route)
          }}
        />
      ) : null}
    </div>
  )
}
