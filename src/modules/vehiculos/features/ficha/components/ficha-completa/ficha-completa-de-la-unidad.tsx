'use client'

import type { Route } from 'next'
import Link from 'next/link'
import type { Categoria, OrigenResumen } from '@/modules/origenes/client'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { ToqueDeLaTarjeta } from '@/shared/ui/tarjetas-de-ajustes'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { Vehiculo } from '../../../../entities/vehiculo'
import { ModalDeFichaCompletaDiferido } from './diferidos'
import { useFichaCompleta } from './use-ficha-completa'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  categorias: readonly Categoria[]
  // `vehiculos.ver` en el origen: el pie ofrece «Abrir en Vehículos».
  abrirEnVehiculos: boolean
}

// La ficha completa abierta desde otra pantalla (la cabecera de la unidad en `logistica`, que la recibe como ranura: `logistica` no importa `vehiculos`): un toque que cubre a quien
// lo contiene (debe ser `relative`) y abre la ficha en `?ver=ficha`, con «Abrir en Vehículos» en el pie. El modal llega al abrirse (`diferido()`); Esc y «atrás» lo cierran y el
// foco vuelve al toque.
export function FichaCompletaDeLaUnidad({ vehiculo, origen, categorias, abrirEnVehiculos }: Props) {
  const ficha = useFichaCompleta()
  const montar = useAbiertoAlgunaVez(ficha.abierto)
  return (
    <>
      <ToqueDeLaTarjeta
        etiqueta={`Ver la ficha de ${vehiculo.titulo}`}
        abrir={() => {
          ficha.abrir()
        }}
        datosDelBoton={{ 'data-abre-la-ficha': '' }}
      />
      {montar ? (
        <ModalDeFichaCompletaDiferido
          abierto={ficha.abierto}
          alCerrar={ficha.cerrar}
          vehiculo={vehiculo}
          origen={origen}
          categorias={categorias}
          pie={
            abrirEnVehiculos ? (
              <Link
                href={`${RUTAS.vehiculos}/${vehiculo.id}` as Route}
                className={buttonVariants({ variant: 'outline', className: 'min-h-11 md:min-h-9' })}
              >
                Abrir en Vehículos
              </Link>
            ) : undefined
          }
        />
      ) : null}
    </>
  )
}
