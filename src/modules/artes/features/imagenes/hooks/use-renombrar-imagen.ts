'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnvioConVersion } from '@/shared/ui/use-envio-con-version'
import { esquemaDelNombreDeArte, MENSAJE_DEL_NOMBRE } from '../../../entities/nombres'
import type { ImagenDeArte } from '../../../entities/tipos'
import { renombrarImagenDeArte } from '../actions/renombrar-imagen-de-arte'

export const CAMPO_DEL_NOMBRE_DE_LA_IMAGEN = 'renombrar-imagen-nombre'
const MENSAJE_DE_VALIDACION = 'Revisa el nombre.'

// «Renombrar» una imagen de la biblioteca, con la versión que se tenía en pantalla: un `PT409` deja el aviso con «Recargar» y lo escrito.
export function useRenombrarImagen({
  imagen,
  alCerrar,
}: {
  imagen: ImagenDeArte
  alCerrar: () => void
}) {
  const [nombre, setNombre] = useState(imagen.nombre)
  const renombrar = useAction(renombrarImagenDeArte)
  const envio = useEnvioConVersion({
    abierto: true,
    hayCambios: nombre !== imagen.nombre,
    version: imagen.actualizadoEn,
    validar: () =>
      esquemaDelNombreDeArte.safeParse(nombre).success
        ? null
        : { [CAMPO_DEL_NOMBRE_DE_LA_IMAGEN]: MENSAJE_DEL_NOMBRE },
    pedir: () =>
      enviarAccion(
        renombrar.executeAsync({
          id: imagen.id,
          actualizadoEnEsperado: imagen.actualizadoEn,
          nombre,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: () => {
      avisarExito('Imagen renombrada.')
      alCerrar()
    },
    campoDelRechazo: (error) => (error.causa === 'nombre' ? CAMPO_DEL_NOMBRE_DE_LA_IMAGEN : null),
  })
  return {
    ...envio,
    nombre,
    escribir: (valor: string) => {
      setNombre(valor)
      envio.quitarMotivo(CAMPO_DEL_NOMBRE_DE_LA_IMAGEN)
    },
  }
}
