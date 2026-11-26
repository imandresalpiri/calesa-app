'use client'

import { PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoError } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import type { FilaDeCatalogo } from '@/shared/ui/lista-de-catalogo/tipos'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  MOTIVO_SIN_PERMISO_DE_CATALOGOS,
  textosDelCatalogo,
  type GrupoLeido,
  type NombreDelCatalogo,
} from '../../../entities/nucleo/catalogo-del-origen'
import type { LecturaDelCatalogo } from '../hooks/use-catalogo-del-origen'

const BOTON = 'h-11 md:h-8'

type Props<T> = {
  // `puerto`, `naviera` o `categoria`: el prefijo de los ids de la lista.
  prefijo: string
  nombre: NombreDelCatalogo
  // El nombre del origen: «De Miami», «Sólo de Miami».
  origen: string
  puedeCambiar: boolean
  columnaDeUso: string
  tope: number
  lectura: LecturaDelCatalogo<T>
  filas: (lista: readonly T[]) => FilaDeCatalogo[]
  alNuevo: () => void
  alAbrir: (id: string) => void
  alReintentar: () => void
  // El modal del catálogo, montado por quien lo conoce.
  children?: ReactNode
}

function EsqueletoDelGrupo() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}

function Grupo<T>({
  id,
  titulo,
  vacio,
  grupo,
  props,
}: {
  id: string
  titulo: string
  vacio: string
  grupo: GrupoLeido<T>
  props: Props<T>
}) {
  const idDelTitulo = `titulo-de-${props.prefijo}-${id}`
  return (
    <section className="grid gap-3" aria-labelledby={idDelTitulo}>
      <h3 id={idDelTitulo} className="text-(length:--text-base) font-semibold text-(--color-ink)">
        {titulo}
      </h3>
      {grupo.filas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{vacio}</p>
      ) : (
        <ListaDeCatalogo
          filas={props.filas(grupo.filas)}
          prefijo={`${props.prefijo}-${id}`}
          columnaDeUso={props.columnaDeUso}
          // En lectura, tocar la fila no abre nada (el «⋯» dice por qué).
          alAbrir={(id) => {
            if (props.puedeCambiar) {
              props.alAbrir(id)
            }
          }}
          alMover={() => undefined}
          verbo="Editar"
          sinOrden
        />
      )}
      {grupo.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(props.tope, { sustantivo: props.nombre.plural, orden: 'primeros' })}
        />
      ) : null}
    </section>
  )
}

// Un catálogo de logística en su drawer, arriba del diagrama de las fases de un origen (puertos, navieras, categorías de gasto): un solo «Nuevo …»
// (el modal pregunta «Sólo de <origen>» o «Compartido con todos los orígenes») y los dos grupos a la vista, «De <origen>» y los compartidos, cada uno
// con su vacío y su tope (decenas de filas: no se pagina). Un compartido que tapa un propio del origen lo dice con su insignia (lo arma `filas`). Sin
// el permiso en el origen se ve igual, con «Nuevo» y el «⋯» apagados y el motivo. Quien lo usa pone la lectura, las filas y el modal.
export function CatalogoDelOrigen<T>(props: Props<T>) {
  const { prefijo, nombre, origen, puedeCambiar, lectura, alNuevo, alReintentar, children } = props
  const textos = textosDelCatalogo(nombre, origen)
  const idDelMotivo = `${prefijo}-sin-permiso`
  const catalogo = lectura.tipo === 'listo' ? lectura.catalogo : null
  const vacio =
    catalogo !== null &&
    catalogo.propios.filas.length === 0 &&
    catalogo.compartidos.filas.length === 0
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className={BOTON}
            disabled={!puedeCambiar}
            aria-describedby={puedeCambiar ? undefined : idDelMotivo}
            onClick={alNuevo}
          >
            <PlusIcon aria-hidden />
            {textos.nuevo}
          </Button>
        </div>
        {puedeCambiar ? null : (
          <Aviso tono="info">
            <span id={idDelMotivo}>{MOTIVO_SIN_PERMISO_DE_CATALOGOS}</span>
          </Aviso>
        )}
      </div>
      {lectura.tipo === 'cargando' ? (
        <div aria-busy="true" aria-label={`Cargando ${nombre.plural}`} className="grid gap-6">
          <EsqueletoDelGrupo />
          <EsqueletoDelGrupo />
        </div>
      ) : null}
      {lectura.tipo === 'error' ? (
        <EstadoError
          titulo={`No se pudieron cargar ${femeninoONo(nombre)} ${nombre.plural}`}
          descripcion={lectura.error.mensaje}
          alReintentar={alReintentar}
        />
      ) : null}
      {vacio ? (
        <p className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-(--color-ink-soft)">
          {textos.vacio}
        </p>
      ) : null}
      {catalogo !== null && !vacio ? (
        <>
          <Grupo
            id="origen"
            titulo={textos.tituloDeLosPropios}
            vacio={textos.vacioDeLosPropios}
            grupo={catalogo.propios}
            props={props}
          />
          <Grupo
            id="compartido"
            titulo={textos.tituloDeLosCompartidos}
            vacio={textos.vacioDeLosCompartidos}
            grupo={catalogo.compartidos}
            props={props}
          />
        </>
      ) : null}
      {children}
    </div>
  )
}

function femeninoONo(nombre: NombreDelCatalogo) {
  return nombre.femenino ? 'las' : 'los'
}
