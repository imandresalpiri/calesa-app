'use client'

import type { AccionDelAviso } from '@/shared/lib/acciones-del-aviso'
import type { Resultado } from '@/shared/lib/errores'
import { AccionesDelAviso } from '@/shared/ui/acciones-del-aviso'
import { Aviso } from '@/shared/ui/aviso'

// Lo que respondió una prueba, ya en palabras: cada tarjeta arma su texto y su tono.
export type Prueba = Resultado<{ tono: 'positivo' | 'aviso'; texto: string }>

type Props = {
  prueba: Prueba
  // Lo que destraba un error (reemplazar la clave, configurar), si lo hay.
  accion?: AccionDelAviso | null
}

// La respuesta a «Probar» de una integración: es la respuesta de lo que se pidió, va en la tarjeta y no en un toast.
export function ResultadoDeLaPrueba({ prueba, accion = null }: Props) {
  if (prueba.ok) {
    return <Aviso tono={prueba.data.tono}>{prueba.data.texto}</Aviso>
  }
  return (
    <Aviso tono="peligro">
      {prueba.error.mensaje}
      {accion ? (
        <AccionesDelAviso resueltas={{ acciones: [accion], pedido: null }} className="mt-2" />
      ) : null}
    </Aviso>
  )
}
