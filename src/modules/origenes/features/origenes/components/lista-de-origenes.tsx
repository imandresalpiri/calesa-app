'use client'

import { PlusIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LA_LISTA_DE_ORIGENES } from '@/shared/lib/paginacion'
import { RUTAS, rutaDelOrigen } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button, buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import type { OrigenConUso } from '../../../entities/origen'
import { faltasDeLaTarjeta } from '../../../entities/pasos'
import { useEliminarOrigenDeLaLista } from '../hooks/use-eliminar-origen-de-la-lista'
import { useOrigenes } from '../hooks/use-origenes'
import { accionesDeLaTarjeta } from './acciones-de-la-tarjeta'
import { ConfirmarEliminarOrigenDiferido } from './diferidos'
import { TarjetaDeOrigen } from './tarjeta-de-origen'

type Props = {
  // Los que la persona abre, ya cortados al tope (`TOPE_DE_LA_LISTA_DE_ORIGENES`); `hayMas` dice si quedaron otros.
  origenes: readonly OrigenConUso[]
  hayMas: boolean
  puedeGestionar: boolean
  // Si la integración no se pudo leer, la página la da por activa: no se inventa una falta.
  apibaraActiva: boolean
  // Con el Modo Live (Configuración de orígenes en «Sólo lectura»): sólo abrir, sin «Nuevo origen» ni el aviso de quién los gestiona.
  soloLectura?: boolean
}

// «Nuevo origen» lleva a la página del primer paso de la puesta en marcha. Sin `origenes.gestionar` va apagado (no es un enlace) y el motivo se dice
// arriba de la lista.
function BotonNuevo({ puedeGestionar }: { puedeGestionar: boolean }) {
  if (!puedeGestionar) {
    return (
      <Button className="h-11 md:h-8" disabled>
        <PlusIcon aria-hidden />
        Nuevo origen
      </Button>
    )
  }
  return (
    <Link href={RUTAS.nuevoOrigen as Route} className={`${buttonVariants()} h-11 md:h-8`}>
      <PlusIcon aria-hidden />
      Nuevo origen
    </Link>
  )
}

// Los orígenes que la persona abre como tarjetas, también los desactivados, con su estado y lo que les falta. Abrir uno lleva a su página (la tarjeta entera, o «Abrir» en su «⋯», que lleva además activar, desactivar y eliminar);
// crear lleva a `/configuracion/origenes/nuevo`. Son decenas: se dibujan hasta el tope, con su aviso.
export function ListaDeOrigenes({
  origenes,
  hayMas,
  puedeGestionar,
  apibaraActiva,
  soloLectura = false,
}: Props) {
  const router = useRouter()
  const ediciones = useOrigenes()
  const eliminacion = useEliminarOrigenDeLaLista(origenes, ediciones)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-(length:--text-xl) font-semibold text-(--color-ink)">Orígenes</h1>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            De dónde vienen los vehículos: sus datos, sus campos y sus categorías.
          </p>
        </div>
        {soloLectura ? null : <BotonNuevo puedeGestionar={puedeGestionar} />}
      </div>
      {puedeGestionar || soloLectura ? null : <Aviso>{MOTIVO_SIN_PERMISO_ORIGENES}</Aviso>}
      {origenes.length === 0 && !puedeGestionar ? (
        <EstadoVacio titulo="No hay orígenes que puedas abrir." />
      ) : origenes.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay orígenes"
          descripcion="Un origen es de dónde vienen los vehículos. Al crearlo nacen su flujo de logística y sus campos."
          accion={
            puedeGestionar ? (
              <Link href={RUTAS.nuevoOrigen as Route} className={buttonVariants()}>
                Crear el primer origen
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3">
          {origenes.map((origen) => (
            <TarjetaDeOrigen
              key={origen.id}
              origen={origen}
              faltas={faltasDeLaTarjeta(origen, { apibaraActiva })}
              acciones={accionesDeLaTarjeta(origen, {
                gestiona: puedeGestionar && !soloLectura,
                enCurso: ediciones.enCurso,
                abrir: () => {
                  router.push(rutaDelOrigen(origen.id) as Route)
                },
                cambiarActivo: (activo) => void ediciones.cambiarActivo(origen, activo),
                pedirEliminar: () => {
                  eliminacion.abrir(origen.id)
                },
              })}
            />
          ))}
        </ul>
      )}
      {hayMas ? (
        <AvisoDeTope texto={textoDelTope(TOPE_DE_LA_LISTA_DE_ORIGENES, { orden: 'primeros' })} />
      ) : null}
      {eliminacion.montar && eliminacion.origen ? (
        <ConfirmarEliminarOrigenDiferido
          origen={eliminacion.origen}
          abierto={eliminacion.abierto}
          enCurso={eliminacion.enCurso}
          alCerrar={eliminacion.cerrar}
          alConfirmar={eliminacion.eliminar}
        />
      ) : null}
    </div>
  )
}
