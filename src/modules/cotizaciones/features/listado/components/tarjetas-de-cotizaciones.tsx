'use client'

import { cotizacionDeLaEntrada, textoDelConteo } from '../../../entities/listado/grupos-del-listado'
import {
  rutaDelVehiculoDeLaFila,
  SIN_VEHICULOS_VISIBLES,
  type VehiculosVisibles,
} from '../../../entities/listado/ruta-del-vehiculo'
import { BotonDelConteo } from './grupo'
import { TarjetaEnLaLista } from './tarjeta-en-la-lista'
import {
  origenDe,
  type CompartirDe,
  type EntradaDeLaLista,
  type HuecosDeLaLista,
  type MenuDeFila,
  type OrigenDelListado,
} from './tipos'

type Props = {
  entradas: readonly EntradaDeLaLista[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
  menuDeFila?: MenuDeFila | undefined
  compartirDe?: CompartirDe | undefined
  huecos?: HuecosDeLaLista | undefined
  rutaDeClientes: string | null
  // En qué orígenes quien mira ve vehículos (el título de la tarjeta enlaza a su ficha).
  vehiculosVisibles?: VehiculosVisibles | undefined
  // Abre el modal de las cotizaciones de un vehículo (por su id).
  abrirGrupo: (vehiculoId: string) => void
}

// La lista en tarjetas (en el celular siempre; en escritorio, por defecto o si la persona las eligió): una por grupo (con los datos de su cabeza) o por
// cotización. Una grilla de columnas de 17 rem que no ensancha la página (`min(100%, 17rem)`), sin `auto-rows-fr`: las tarjetas miden lo mismo
// por sus filas de alto fijo (`TarjetaEnLaLista`).
export function TarjetasDeCotizaciones({
  entradas,
  origenes,
  alAbrir,
  abierta,
  menuDeFila,
  compartirDe,
  huecos,
  rutaDeClientes,
  vehiculosVisibles = SIN_VEHICULOS_VISIBLES,
  abrirGrupo,
}: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3">
      {entradas.map((entrada) => {
        const cotizacion = cotizacionDeLaEntrada(entrada)
        const texto = entrada.tipo === 'grupo' ? textoDelConteo(entrada.conteo) : null
        return (
          <TarjetaEnLaLista
            key={entrada.ordenId}
            cotizacion={cotizacion}
            origen={origenDe(origenes, cotizacion.origenId)}
            abierta={abierta === cotizacion.id}
            alAbrir={() => {
              alAbrir(cotizacion.id)
            }}
            menu={menuDeFila?.(cotizacion, { sinCompartir: true })}
            compartir={compartirDe?.(cotizacion) ?? null}
            Imagen={huecos?.Imagen}
            rutaDeClientes={rutaDeClientes}
            rutaDelVehiculo={rutaDelVehiculoDeLaFila(cotizacion, vehiculosVisibles)}
            conteo={
              texto === null || entrada.tipo !== 'grupo' ? null : (
                <BotonDelConteo
                  texto={texto}
                  alAbrir={() => {
                    abrirGrupo(entrada.vehiculoId)
                  }}
                />
              )
            }
          />
        )
      })}
    </ul>
  )
}
