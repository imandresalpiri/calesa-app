'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoError, EstadoSinPermiso, EstadoVacio } from '@/shared/ui/estados'

type Ir = { nombre: string; href: string }

// La salida de cada estado: en el celular, un blanco de 44 px.
const BOTON = buttonVariants({ variant: 'outline', className: 'min-h-[44px] md:min-h-8' })

// Los estados de una página de Logística cuando no hay qué dibujar del origen (`docs/UX.md` › «Logística: estados propios»). Textos y destinos los arma el
// servidor (`abrir-la-pestana.tsx`); aquí sólo «Reintentar», que vuelve a pedir la página.
export type EstadoDelOrigen =
  | { tipo: 'sin_acceso' | 'sin_permiso_en_la_pestana' }
  | { tipo: 'sin_origenes'; configurar: boolean }
  | { tipo: 'sin_permiso'; nombre: string; ir: Ir | null }
  | { tipo: 'no_disponible'; nombre: string | null; ir: Ir | null }
  | { tipo: 'error' }
  | { tipo: 'no_usa'; origen: string; pestana: string; hrefDeLaCadena: string }
  | { tipo: 'flujo_no_leido'; origen: string }

function IrA({ ir }: { ir: Ir | null }) {
  if (ir === null) return undefined
  return (
    <Link href={ir.href as Route} className={BOTON}>
      Ir a {ir.nombre}
    </Link>
  )
}

export function EstadoDelOrigen({ estado }: { estado: EstadoDelOrigen }) {
  const router = useRouter()
  const reintentar = () => {
    router.refresh()
  }
  switch (estado.tipo) {
    case 'sin_acceso':
    case 'sin_permiso_en_la_pestana':
      return <EstadoSinPermiso />
    case 'sin_origenes':
      return (
        <EstadoVacio
          titulo="Ningún origen tiene la logística encendida."
          accion={
            estado.configurar ? (
              <Link href={RUTAS.origenes as Route} className={BOTON}>
                Configurar orígenes
              </Link>
            ) : undefined
          }
        />
      )
    case 'sin_permiso':
      return (
        <EstadoSinPermiso
          titulo={`No tienes permiso para ver la logística de ${estado.nombre}.`}
          accion={<IrA ir={estado.ir} />}
        />
      )
    case 'no_disponible':
      return (
        <EstadoVacio
          titulo={
            estado.nombre === null
              ? 'Ese origen no está disponible.'
              : `La logística de ${estado.nombre} no está disponible.`
          }
          accion={<IrA ir={estado.ir} />}
        />
      )
    case 'error':
      return <EstadoError titulo="No pudimos leer los orígenes." alReintentar={reintentar} />
    case 'flujo_no_leido':
      return (
        <EstadoError
          titulo={`No pudimos leer el flujo de ${estado.origen}.`}
          alReintentar={reintentar}
        />
      )
    case 'no_usa':
      return (
        <EstadoVacio
          titulo={`${estado.origen} no usa ${estado.pestana}.`}
          accion={
            <Link href={estado.hrefDeLaCadena as Route} className={BOTON}>
              Ver la cadena
            </Link>
          }
        />
      )
  }
}
