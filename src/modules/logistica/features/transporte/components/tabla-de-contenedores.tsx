'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { embarqueDeLogistica } from '@/shared/lib/rutas'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
} from '@/shared/ui/lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import type { ContenedorDeLaLista } from '../../../entities/transporte/lista-de-embarques'
import { textoDeVehiculos } from '../../../entities/transporte/textos'
import { useDia } from '../hooks/use-dia'
import { AccionesDeLaFilaDelContenedor } from './acciones-de-la-fila'
import { Faltan, Valor } from './celdas-de-embarques'
import { InsigniaDeEstado } from './insignia-de-estado'

type Props = {
  contenedores: readonly ContenedorDeLaLista[]
  origenId: string
  alAbrir: (id: string) => void
  abierto: string | null
}

// Los contenedores de la página en escritorio. El número abre su drawer (`?contenedor=<uuid>`, «Abrir el contenedor <n>»); su embarque es un enlace a la página del embarque.
export function TablaDeContenedores({ contenedores, origenId, alAbrir, abierto }: Props) {
  const dia = useDia()
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Contenedor</CabeceraPegada>
          <TableHead>Estado</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Embarque</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>Vehículos</TableHead>
          <TableHead>Falta</TableHead>
          <CabeceraPegada lado="acciones">
            <span className="sr-only">Acciones</span>
          </CabeceraPegada>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contenedores.map((c) => (
          <FilaDeLista
            key={c.id}
            abierta={abierto === c.id}
            alAbrir={() => {
              alAbrir(c.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <AbrirResumen
                nombre={`el contenedor ${c.numero}`}
                className="max-w-60 truncate font-medium text-(--color-ink)"
              >
                {c.numero}
              </AbrirResumen>
            </CeldaPegada>
            <TableCell>
              <InsigniaDeEstado estado={c.estado} />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Valor texto={c.tipoNombre} />
            </TableCell>
            <TableCell className="max-w-48 truncate">
              {c.embarque === null ? (
                <Valor texto={null} />
              ) : (
                <Link
                  href={embarqueDeLogistica(c.embarque.id, origenId) as Route}
                  prefetch={false}
                  className="underline-offset-2 hover:underline"
                >
                  {c.embarque.booking}
                </Link>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Valor texto={c.etaEl === null ? null : dia(c.etaEl)} />
            </TableCell>
            <TableCell className="max-w-48">
              {textoDeVehiculos(c.vehiculos, c.hayOcultos)}
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Faltan faltan={c.faltan} embarqueId={c.embarque?.id ?? null} origenId={origenId} />
            </TableCell>
            <CeldaPegada lado="acciones">
              <AccionesDeLaFilaDelContenedor
                id={c.id}
                numero={c.numero}
                embarqueId={c.embarque?.id ?? null}
                origenId={origenId}
              />
            </CeldaPegada>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}
