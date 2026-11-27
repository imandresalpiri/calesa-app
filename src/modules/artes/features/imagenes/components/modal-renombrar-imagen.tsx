'use client'

import { Campo } from '@/shared/ui/campo'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { LARGO_MAXIMO_DEL_NOMBRE } from '../../../entities/nombres'
import type { ImagenDeArte } from '../../../entities/tipos'
import { CAMPO_DEL_NOMBRE_DE_LA_IMAGEN, useRenombrarImagen } from '../hooks/use-renombrar-imagen'

type Props = { imagen: ImagenDeArte; alCerrar: () => void }

// «Renombrar» una imagen de la biblioteca (`?panel=renombrar&imagen=<id>`). Quien lo monta lo dibuja sólo mientras la URL lo pide, con una
// `key` por apertura: cada vez empieza con el nombre de ahora.
export function ModalRenombrarImagen({ imagen, alCerrar }: Props) {
  const formulario = useRenombrarImagen({ imagen, alCerrar })
  return (
    <ModalDeFormulario
      id="renombrar-imagen-de-arte"
      abierto
      alCerrar={alCerrar}
      titulo={`Renombrar «${imagen.nombre}»`}
      focoInicial={() => document.getElementById(CAMPO_DEL_NOMBRE_DE_LA_IMAGEN)}
      formulario={formulario}
      guardar={{ etiqueta: 'Guardar', enCurso: 'Guardando…' }}
    >
      <Campo
        nombre={CAMPO_DEL_NOMBRE_DE_LA_IMAGEN}
        etiqueta="Nombre"
        autoComplete="off"
        maxLength={LARGO_MAXIMO_DEL_NOMBRE + 10}
        value={formulario.nombre}
        onChange={(evento) => {
          formulario.escribir(evento.target.value)
        }}
        error={formulario.errores[CAMPO_DEL_NOMBRE_DE_LA_IMAGEN]}
      />
    </ModalDeFormulario>
  )
}
