'use client'

import {
  formaDelArchivo,
  TOPE_DE_PESO_DE_LA_MINIATURA,
} from '../../../entities/documentos/vista-previa'
import type { EntradaDeLaBandeja } from '../hooks/use-bandeja'
import { useUrlLocal } from '../hooks/use-url-local'
import { CajaDeLaMiniatura } from './miniatura-del-documento'

// La miniatura de un archivo de la bandeja, que todavía no se subió: su propia imagen (URL local, revocada al irse) si es una imagen liviana o, si no, el icono de su tipo con la extensión.
export function MiniaturaLocal({ entrada }: { entrada: EntradaDeLaBandeja }) {
  const { nombre, mime, bytes } = entrada.datos
  const liviana =
    formaDelArchivo({ mime, nombre }) === 'imagen' && bytes <= TOPE_DE_PESO_DE_LA_MINIATURA
  const url = useUrlLocal(liviana ? entrada.archivo : null)
  return (
    <CajaDeLaMiniatura
      documento={{ mime, nombre }}
      url={url}
      alFallar={() => Promise.resolve(false)}
    />
  )
}
