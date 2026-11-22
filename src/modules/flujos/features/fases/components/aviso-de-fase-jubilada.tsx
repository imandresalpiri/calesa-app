'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { useListaDeFases } from '../hooks/use-lista-de-fases'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El aviso de una fase jubilada, arriba del panel y a la vista en las tres pestañas (una jubilada también se edita, la base lo acepta): dice que no es destino de
// ningún cambio y ofrece la salida ahí mismo, lo mismo que «Reactivar» del ⋯ de la lista. Una activa no lo dibuja.
export function AvisoDeFaseJubilada({ flujo, fase }: Props) {
  const lista = useListaDeFases(flujo)
  if (fase.activa) {
    return null
  }
  return (
    <Aviso>
      <p>Esta fase está jubilada: no es destino de ningún cambio.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 min-h-11 md:min-h-8"
        disabled={lista.enCurso}
        onClick={() => void lista.reactivar(fase)}
      >
        Reactivar
      </Button>
    </Aviso>
  )
}
