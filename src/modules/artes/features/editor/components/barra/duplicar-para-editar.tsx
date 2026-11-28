'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { rutaDeLaPlantillaDeArte } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { avisarError } from '@/shared/ui/toasts'
import { nombreDeLaCopia } from '../../../../entities/nombres'
import { duplicarPlantillaDeArte } from '../../../plantillas/actions/duplicar-plantilla-de-arte'
import { MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA } from '../../../plantillas/hooks/mensajes'

type Props = { id: string; nombre: string }

// En sólo lectura, en lugar de «Guardar»: una copia privada de quien mira («<nombre> (copia)») y el editor la abre.
export function DuplicarParaEditar({ id, nombre }: Props) {
  const router = useRouter()
  const duplicar = useAction(duplicarPlantillaDeArte)
  const pedir = async () => {
    const hecho = await enviarAccion(
      duplicar.executeAsync({
        idNuevo: crypto.randomUUID(),
        fuente: id,
        nombre: nombreDeLaCopia(nombre),
      }),
      MENSAJE_DE_VALIDACION_DE_LA_PLANTILLA,
    )
    if (hecho.ok) {
      router.push(rutaDeLaPlantillaDeArte(hecho.data.id))
    } else {
      avisarError(hecho.error)
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      className="h-8 shrink-0"
      disabled={duplicar.isPending}
      onClick={() => {
        void pedir()
      }}
    >
      {duplicar.isPending ? 'Duplicando…' : 'Duplicar para editar'}
    </Button>
  )
}
