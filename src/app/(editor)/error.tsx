'use client'

import { useEffect } from 'react'
import { FueraDelEditor } from '@/modules/artes/pantallas/artes-plantilla'
import { EstadoError } from '@/shared/ui/estados/estado-error'

type Props = { error: Error & { digest?: string }; retry: () => void }

// Si el editor falla al cargar: la barra con «Volver a Artes» y «Reintentar» (no hay marco de `(app)` que quede en pie).
export default function ErrorDelEditor({ error, retry }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <FueraDelEditor titulo="Editor de artes">
      <EstadoError alReintentar={retry} />
    </FueraDelEditor>
  )
}
