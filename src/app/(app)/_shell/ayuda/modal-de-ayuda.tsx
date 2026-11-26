'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { LifeBuoyIcon } from 'lucide-react'
import type { RefObject } from 'react'
import {
  armarMisEnlaces,
  leerMisEnlacesDeAyuda,
  PANEL_DE_ENLACES_DE_AYUDA,
  PANEL_NUEVO_ENLACE_PROPIO,
} from '@/modules/empresa/shell.client'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados/estado-error'
import { EstadoVacio } from '@/shared/ui/estados/estado-vacio'
import { Modal } from '@/shared/ui/modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { useApertura } from '@/shared/ui/use-apertura'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { ListaDeAyuda } from './lista-de-ayuda'

export type PropsDelModalDeAyuda = {
  abierto: boolean
  alCerrar: () => void
  // Quien puede preparar los de la empresa (`empresa.ajustes.gestionar`, calculado en el servidor): el vacío lo manda a Configuración.
  puedeConfigurar: boolean
  // El avatar: el renglón que lo abrió se fue con el menú, y el foco vuelve al botón que lo abre.
  focoAlCerrar: RefObject<HTMLButtonElement | null>
}

const A_MIS_ENLACES = `${RUTAS.perfil}?panel=${PANEL_DE_ENLACES_DE_AYUDA}` as Route
const A_UNO_PROPIO = `${RUTAS.perfil}?panel=${PANEL_NUEVO_ENLACE_PROPIO}` as Route
const A_CONFIGURACION = `${RUTAS.empresa}?panel=${PANEL_DE_ENLACES_DE_AYUDA}` as Route

// Cada estado (cargando, error, vacío y una lista corta) ocupa la misma caja: el modal no salta al llegar la lectura.
const CAJA = 'grid min-h-72 content-start'

function Cargando() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando los enlaces de ayuda"
      className="grid gap-0.5"
    >
      {[0, 1, 2, 3].map((fila) => (
        <div key={fila} className="grid min-h-[44px] content-center gap-1.5 px-2 py-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function Vacio({
  todosOcultos,
  puedeConfigurar,
}: {
  todosOcultos: boolean
  puedeConfigurar: boolean
}) {
  if (todosOcultos) {
    return (
      <EstadoVacio
        Icono={LifeBuoyIcon}
        titulo="Ocultaste todos los enlaces de ayuda."
        descripcion="Elige en tu perfil cuáles ver acá."
        accion={
          <Link href={A_MIS_ENLACES} className={buttonVariants({ variant: 'outline' })}>
            Elegir mis enlaces
          </Link>
        }
      />
    )
  }
  return (
    <EstadoVacio
      Icono={LifeBuoyIcon}
      titulo="Todavía no hay enlaces de ayuda."
      descripcion={
        puedeConfigurar
          ? 'Prepara los de la empresa: los verá todo el equipo.'
          : 'Suma los que uses: sólo los verás tú.'
      }
      accion={
        puedeConfigurar ? (
          <Link href={A_CONFIGURACION} className={buttonVariants({ variant: 'outline' })}>
            Agregar en Configuración
          </Link>
        ) : (
          <Link href={A_UNO_PROPIO} className={buttonVariants({ variant: 'outline' })}>
            Agregar uno propio
          </Link>
        )
      }
    />
  )
}

// El cuerpo del modal: una sola lectura cada vez que se abre (`enlaces_de_ayuda_de_mi()`), nunca en el layout.
function CuerpoDeAyuda({
  apertura,
  puedeConfigurar,
}: {
  apertura: number
  puedeConfigurar: boolean
}) {
  const { lectura, reintentar } = useLecturaAlMontar(leerMisEnlacesDeAyuda, String(apertura))
  if (lectura.estado === 'leyendo') {
    return <Cargando />
  }
  if (lectura.estado === 'fallo') {
    return (
      <EstadoError
        titulo="No se pudieron cargar los enlaces"
        descripcion="Puede ser la conexión. Tus enlaces siguen guardados."
        alReintentar={reintentar}
      />
    )
  }
  const enlaces = armarMisEnlaces(lectura.dato)
  if (enlaces.length === 0) {
    return (
      <Vacio todosOcultos={lectura.dato.empresa.length > 0} puedeConfigurar={puedeConfigurar} />
    )
  }
  return <ListaDeAyuda enlaces={enlaces} />
}

// «Ayuda» del menú del perfil: los enlaces de ayuda de quien mira (los de la empresa que no ocultó y los suyos, en su orden). Vive en la URL
// (`?panel=ayuda`); en el celular ocupa la pantalla. Al pie, «Elegir mis enlaces» lleva a Perfil, donde se ocultan, ordenan y suman.
export function ModalDeAyuda({
  abierto,
  alCerrar,
  puedeConfigurar,
  focoAlCerrar,
}: PropsDelModalDeAyuda) {
  const apertura = useApertura(abierto)
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Ayuda"
      descripcion="Enlaces para resolver dudas. Se abren en otra pestaña."
      ancho="amplio"
      completoEnCelular
      focoAlCerrar={focoAlCerrar}
      pie={
        <Link
          href={A_MIS_ENLACES}
          className={buttonVariants({ variant: 'ghost', className: 'max-md:min-h-[44px]' })}
        >
          Elegir mis enlaces
        </Link>
      }
    >
      <div className={CAJA} data-cuerpo-de-ayuda>
        {apertura > 0 ? (
          <CuerpoDeAyuda key={apertura} apertura={apertura} puedeConfigurar={puedeConfigurar} />
        ) : null}
      </div>
    </Modal>
  )
}
