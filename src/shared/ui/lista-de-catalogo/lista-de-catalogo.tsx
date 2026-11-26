'use client'

import { cn } from 'cn'
import { Badge } from '../badge'
import { IconoDelCatalogo } from '../icono-del-catalogo/icono-del-catalogo'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  MasAcciones,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
} from '../lista'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'
import { accionesConOrden } from './acciones-de-orden'
import type { Direccion, FilaDeCatalogo } from './tipos'

type Props = {
  filas: readonly FilaDeCatalogo[]
  // Distingue los ids del «⋯» entre una pestaña y otra (`useFocoTrasMover`).
  prefijo: string
  // Qué dice la columna de uso: «Leads», «Seguimientos».
  columnaDeUso: string
  // Qué abre un clic en la fila (o Enter sobre su nombre): editarla.
  alAbrir: (id: string) => void
  alMover: (id: string, direccion: Direccion) => void
  // El verbo de lo que abre la fila para el lector de pantalla («Editar Puertos»); sin él, «Abrir».
  verbo?: string
  // Un catálogo que no se ordena desde la lista (su orden es un número del formulario) no lleva «Subir» y «Bajar» en el «⋯».
  sinOrden?: boolean
  // Lo que dice la columna «Estado» de una fila activa y de una desactivada, si no es lo de un catálogo que se ofrece en lo nuevo (los
  // enlaces de ayuda: «En el menú» · «No se ve en el menú»).
  estados?: { activo: string; inactivo: string }
}

// Los textos de estado: una fila apagada se sigue nombrando, con «Desactivado»: sus datos la conservan pero no se ofrece en lo nuevo.
const ESTADOS = { activo: 'Activo', inactivo: 'No se ofrece en lo nuevo' }

function textoDelEstado(fila: FilaDeCatalogo, estados: Props['estados']) {
  const textos = estados ?? ESTADOS
  return fila.activo ? textos.activo : textos.inactivo
}

function Nombre({
  fila,
  clases,
  verbo,
}: {
  fila: FilaDeCatalogo
  clases?: string
  verbo: string | undefined
}) {
  return (
    <AbrirResumen
      nombre={fila.nombre}
      {...(verbo === undefined ? {} : { verbo })}
      className={cn('max-w-72 min-w-0 truncate', clases)}
    >
      {fila.nombre}
    </AbrirResumen>
  )
}

function Insignias({ fila }: { fila: FilaDeCatalogo }) {
  return (
    <>
      {fila.insignias.map((texto) => (
        <Badge key={texto} variant="secondary">
          {texto}
        </Badge>
      ))}
      {fila.activo ? null : <Badge variant="outline">Desactivado</Badge>}
    </>
  )
}

// El «⋯» de la fila: lo del módulo y, salvo en un catálogo que no se ordena desde la lista, «Subir» y «Bajar».
function accionesDeLaFila(
  fila: FilaDeCatalogo,
  alMover: Props['alMover'],
  sinOrden: boolean | undefined,
) {
  return sinOrden
    ? fila.acciones
    : accionesConOrden(fila, (direccion) => {
        alMover(fila.id, direccion)
      })
}

function Tabla({
  filas,
  prefijo,
  columnaDeUso,
  alAbrir,
  alMover,
  verbo,
  sinOrden,
  estados,
}: Props) {
  return (
    <TablaDeLista>
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Nombre</CabeceraPegada>
          <TableHead>Estado</TableHead>
          <TableHead>{columnaDeUso}</TableHead>
          <CabeceraPegada lado="acciones">
            <span className="sr-only">Acciones</span>
          </CabeceraPegada>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((fila) => (
          <FilaDeLista
            key={fila.id}
            alAbrir={() => {
              alAbrir(fila.id)
            }}
          >
            <CeldaPegada lado="nombre">
              <span className="flex min-w-0 items-center gap-2">
                <IconoDelCatalogo clave={fila.icono} className="text-(--color-ink-soft)" />
                <Nombre
                  fila={fila}
                  verbo={verbo}
                  clases={fila.activo ? undefined : 'text-(--color-ink-soft)'}
                />
                <Insignias fila={fila} />
              </span>
            </CeldaPegada>
            <TableCell className="whitespace-nowrap">{textoDelEstado(fila, estados)}</TableCell>
            <TableCell className="whitespace-nowrap text-(--color-ink-soft)">{fila.uso}</TableCell>
            <CeldaPegada lado="acciones">
              <MasAcciones
                nombre={fila.nombre}
                acciones={accionesDeLaFila(fila, alMover, sinOrden)}
                id={`${prefijo}-${fila.id}-mas`}
              />
            </CeldaPegada>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ filas, prefijo, alAbrir, alMover, verbo, sinOrden, estados }: Props) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((fila) => (
        <TarjetaDeLista
          key={fila.id}
          alAbrir={() => {
            alAbrir(fila.id)
          }}
          acciones={
            <MasAcciones
              nombre={fila.nombre}
              acciones={accionesDeLaFila(fila, alMover, sinOrden)}
              id={`${prefijo}-${fila.id}-mas`}
            />
          }
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <IconoDelCatalogo clave={fila.icono} className="text-(--color-ink-soft)" />
            <Nombre
              fila={fila}
              verbo={verbo}
              clases={cn(
                'text-(length:--text-base) font-medium',
                fila.activo ? 'text-(--color-ink)' : 'text-(--color-ink-soft)',
              )}
            />
            <Insignias fila={fila} />
          </div>
          <p className="flex flex-wrap gap-x-1 text-(length:--text-sm) text-(--color-ink-faint)">
            <span>{textoDelEstado(fila, estados)}</span>
            <span aria-hidden>·</span>
            <span>{fila.uso}</span>
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// La lista de un catálogo configurable con el patrón de lista (`@/shared/ui/lista`): una sola vista elegida en el servidor —la tabla desde
// 768 px, tarjetas por debajo—, con el nombre y el «⋯» a la vista aunque la tabla se desplace; un clic en cualquier parte de la fila abre su
// edición. Todo lo demás va en el «⋯», sin botones sueltos: editar, «Subir» y «Bajar» (con el teclado, sin arrastrar), activar, el «por defecto» y
// eliminar, con el motivo cuando una acción no se puede. Sin `<Switch>`: el estado se dice con texto y se cambia desde el menú.
export function ListaDeCatalogo(props: Props) {
  return (
    <UnaSolaVista tabla={() => <Tabla {...props} />} tarjetas={() => <Tarjetas {...props} />} />
  )
}
