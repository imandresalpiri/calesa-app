'use client'

import { useAction } from 'next-safe-action/hooks'
import { useEffect, useRef, useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { EstadoError } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerMasImagenesDeArte } from '../../../imagenes/actions/leer-mas-imagenes'
import { BibliotecaCargada } from './biblioteca-cargada'
import { SeccionDeAgregar, type PropsDeLaSeccion } from './seccion-de-agregar'

const NO_SE_LEYERON = 'No se pudieron cargar las imágenes.'

// Lo que ocupa la biblioteca mientras lee: cuatro baldosas del mismo alto que las de verdad.
const BALDOSAS_DEL_ESQUELETO = [0, 1, 2, 3]

type Props = PropsDeLaSeccion & {
  // Cambia en cada «Imagen» del riel: la sección se trae a la vista y su título toma el foco.
  pedido: number
}

// «Biblioteca» en «Agregar»: las imágenes de la biblioteca, leídas al montarse la sección (la primera página por la Server Action de «Ver
// más», con el cursor nulo: supabase-js no viaja al navegador). Mientras lee, el esqueleto; si falla, «Reintentar». Quien va a subir una
// imagen en otra pestaña la encuentra al volver: la sección vuelve a leer cuando la ventana recupera el foco.
export function SeccionBiblioteca({ motivo, alAgregar, pedido }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null)
  const primera = useAction(leerMasImagenesDeArte)
  const { lectura, reintentar } = useLecturaAlMontar(
    () => enviarAccion(primera.executeAsync({ cursor: null }), NO_SE_LEYERON),
    'biblioteca',
  )
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (pedido !== 0) {
      titulo.current?.scrollIntoView({ block: 'start' })
      titulo.current?.focus({ preventScroll: true })
    }
  }, [pedido])

  useEffect(() => {
    if (!subiendo) {
      return
    }
    function alVolver() {
      setSubiendo(false)
      reintentar()
    }
    window.addEventListener('focus', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
    }
  }, [subiendo, reintentar])

  function cuerpo() {
    if (lectura.estado === 'leyendo') {
      return (
        <ul aria-busy className="grid grid-cols-2 gap-2">
          {BALDOSAS_DEL_ESQUELETO.map((i) => (
            <li key={i} className="grid gap-1">
              <Skeleton className="h-40 w-full rounded-(--radius-md)" />
              <Skeleton className="h-4 w-3/4" />
            </li>
          ))}
        </ul>
      )
    }
    if (lectura.estado === 'fallo') {
      return <EstadoError compacto descripcion={lectura.error.mensaje} alReintentar={reintentar} />
    }
    return (
      <BibliotecaCargada
        inicial={lectura.dato}
        motivo={motivo}
        alAgregar={alAgregar}
        alIrASubir={() => {
          setSubiendo(true)
        }}
      />
    )
  }

  return (
    <SeccionDeAgregar titulo="Biblioteca" refDelTitulo={titulo}>
      {cuerpo()}
    </SeccionDeAgregar>
  )
}
