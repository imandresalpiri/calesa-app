'use client'

import { CabeceraPegada, TablaDeLista } from '@/shared/ui/lista'
import { TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import {
  SIN_VEHICULOS_VISIBLES,
  rutaDelVehiculoDeLaFila,
  type VehiculosVisibles,
} from '../../../entities/listado/ruta-del-vehiculo'
import { cotizacionDeLaEntrada, textoDelConteo } from '../../../entities/listado/grupos-del-listado'
import { FilaDeLaCotizacion } from './celdas-de-la-tabla'
import { BotonDelConteo } from './grupo'
import type { EntradaDeLaLista, MenuDeFila, OrigenDelListado } from './tipos'

type Props = {
  entradas: readonly EntradaDeLaLista[]
  origenes: readonly OrigenDelListado[]
  alAbrir: (id: string) => void
  // La cotización abierta en el resumen, para marcarla.
  abierta: string | null
  // El «⋯» de cada fila, a la derecha, con «Compartir cotización…» primero; sin él no hay columna.
  menuDeFila?: MenuDeFila | undefined
  // En qué orígenes quien mira ve vehículos (la celda «Vehículo» enlaza a su ficha).
  vehiculosVisibles?: VehiculosVisibles | undefined
  // Abre el modal de las cotizaciones de un vehículo (por su id).
  abrirGrupo: (vehiculoId: string) => void
}

// La lista en tabla (escritorio, si la persona la eligió), con el patrón de lista (`@/shared/ui/lista`): «N.º n» es el botón de la fila; un clic en la fila abre el
// resumen `?cotizacion=`, salvo el «⋯» de la derecha y el conteo de un grupo. Agrupada, la fila de un grupo es la de su cabeza y lleva en «Vehículo» el botón
// «N cotizaciones de este vehículo», que abre el modal con las del vehículo.
export function TablaDeCotizaciones({
  entradas,
  origenes,
  alAbrir,
  abierta,
  menuDeFila,
  vehiculosVisibles = SIN_VEHICULOS_VISIBLES,
  abrirGrupo,
}: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Cotización</CabeceraPegada>
          <TableHead>Título</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Vehículo</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Clase</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Vigencia</TableHead>
          <TableHead>Creada</TableHead>
          {menuDeFila ? (
            <CabeceraPegada lado="acciones">
              <span className="sr-only">Acciones</span>
            </CabeceraPegada>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entradas.map((entrada) => {
          const cotizacion = cotizacionDeLaEntrada(entrada)
          const texto = entrada.tipo === 'grupo' ? textoDelConteo(entrada.conteo) : null
          return (
            <FilaDeLaCotizacion
              key={entrada.ordenId}
              cotizacion={cotizacion}
              origenes={origenes}
              rutaDelVehiculo={rutaDelVehiculoDeLaFila(cotizacion, vehiculosVisibles)}
              abierta={abierta === cotizacion.id}
              alAbrir={() => {
                alAbrir(cotizacion.id)
              }}
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
              menu={menuDeFila ? menuDeFila(cotizacion) : undefined}
            />
          )
        })}
      </TableBody>
    </TablaDeLista>
  )
}
