'use client'

import { embarqueDeLogistica } from '@/shared/lib/rutas'
import {
  CabeceraPegada,
  CeldaPegada,
  EnlaceDeLaFila,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { EmbarqueDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import { nombreDeCatalogo, textoDeLaRuta } from '../../../entities/transporte/opciones-del-embarque'
import {
  CONTENEDORES,
  textoDeConteo,
  textoDeLaLlegada,
  textoDelZarpe,
  textoDeVehiculos,
  tituloDelEmbarque,
} from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { AccionesDeLaFilaDelEmbarque } from './acciones-de-la-fila'
import { Faltan, Valor } from './celdas-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'
import type { PropsDeLaFila } from './tipos-de-la-lista'

type Props = PropsDeLaFila & { embarques: readonly EmbarqueDeLaLista[] }

// Los embarques de la página en escritorio. El booking es el enlace a la página del embarque y la fila entera lleva ahí; el «⋯» abre o edita.
export function TablaDeEmbarques({ embarques, catalogos, origenId, puedeEditar }: Props) {
  const dia = useDia()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Booking</CabeceraPegada>
          <TableHead>Estado</TableHead>
          <TableHead>Naviera</TableHead>
          <TableHead>Ruta</TableHead>
          <TableHead>Zarpe</TableHead>
          <TableHead>Llegada</TableHead>
          <TableHead>Contenedores</TableHead>
          <TableHead>Vehículos</TableHead>
          <TableHead>Falta</TableHead>
          <CabeceraPegada lado="acciones">
            <span className="sr-only">Acciones</span>
          </CabeceraPegada>
        </TableRow>
      </TableHeader>
      <TableBody>
        {embarques.map((e) => {
          const href = embarqueDeLogistica(e.id, origenId)
          return (
            <FilaDeLista key={e.id} href={href}>
              <CeldaPegada lado="nombre">
                <EnlaceDeLaFila
                  href={href}
                  nombre={tituloDelEmbarque(e.booking)}
                  className="max-w-60 truncate font-medium text-(--color-ink)"
                >
                  {e.booking}
                </EnlaceDeLaFila>
              </CeldaPegada>
              <TableCell>
                <InsigniaDeEstado estado={e.estado} />
              </TableCell>
              <TableCell className="max-w-40 truncate">
                <Valor texto={nombreDeCatalogo(catalogos.navieras, e.navieraId)} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Valor
                  texto={textoDeLaRuta(
                    nombreDeCatalogo(catalogos.puertos, e.puertoOrigenId),
                    nombreDeCatalogo(catalogos.puertos, e.puertoDestinoId),
                  )}
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Valor texto={textoDelZarpe(e, dia)} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Valor texto={textoDeLaLlegada(e, dia)} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {textoDeConteo(e.contenedores, CONTENEDORES)}
              </TableCell>
              <TableCell className="max-w-48">
                {textoDeVehiculos(e.vehiculos, e.hayOcultos)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Faltan faltan={e.faltan} embarqueId={e.id} origenId={origenId} />
              </TableCell>
              <CeldaPegada lado="acciones">
                <AccionesDeLaFilaDelEmbarque
                  id={e.id}
                  booking={e.booking}
                  origenId={origenId}
                  puedeEditar={puedeEditar}
                />
              </CeldaPegada>
            </FilaDeLista>
          )
        })}
      </TableBody>
    </TablaDeLista>
  )
}
