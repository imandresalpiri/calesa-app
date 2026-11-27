'use client'

import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Drawer } from '@/shared/ui/drawer'
import { TOPE_DE_LA_SELECCION } from '../../../entities/nucleo/seleccion'
import {
  marcaDeOtroDestino,
  mensajeDeMover,
  otroDestinoDe,
  yaEstaEn,
  type DestinoDelLote,
} from '../../../entities/transporte/lote-de-asignacion'
import { PANEL_AGREGAR_VEHICULOS } from '../../../entities/transporte/paneles'
import { BuscadorDeUnidades } from '../../nucleo/components/buscador-de-unidades'
import { useAgregarVehiculos } from '../hooks/use-agregar-vehiculos'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

type Props = {
  destino: DestinoDelLote
  origenId: string
  // «Contenedor MSCU1234», «Embarque BK123».
  titulo: string
}

type Agregar = ReturnType<typeof useAgregarVehiculos>

function Elegidas({ a }: { a: Agregar }) {
  if (a.elegidas.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Todavía no elegiste ninguno. Búscalos arriba y tócalos para sumarlos.
      </p>
    )
  }
  return (
    <ul aria-label="Vehículos elegidos" className="grid grid-cols-[minmax(0,1fr)] gap-1">
      {a.elegidas.map((u) => (
        <li
          key={u.id}
          className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-(--color-line) py-1 last:border-b-0"
        >
          <span className="min-w-0 [overflow-wrap:anywhere]">{u.titulo}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-8"
            aria-label={`Sacar ${u.titulo} de los elegidos`}
            disabled={a.enCurso}
            onClick={() => a.sacar(u.id)}
          >
            Sacar
          </Button>
        </li>
      ))}
    </ul>
  )
}

function Pie({ a, alCerrar }: { a: Agregar; alCerrar: () => void }) {
  if (a.confirmando && a.otros.length > 0) {
    return (
      <div data-pie-de-panel="" className="grid gap-2">
        <Aviso tono="aviso">
          <p>{mensajeDeMover(a.otros)}</p>
        </Aviso>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={a.cancelarMover} disabled={a.enCurso}>
            Cancelar
          </Button>
          <Button type="button" onClick={a.agregar} disabled={a.enCurso}>
            {a.enCurso ? 'Moviendo…' : 'Mover'}
          </Button>
        </div>
      </div>
    )
  }
  const n = a.elegidas.length
  return (
    <div data-pie-de-panel="" className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="ghost" onClick={alCerrar} disabled={a.enCurso}>
        Cancelar
      </Button>
      <Button type="button" onClick={a.agregar} disabled={a.enCurso || n === 0}>
        {a.enCurso ? 'Agregando…' : n === 1 ? 'Agregar 1 vehículo' : `Agregar ${n} vehículos`}
      </Button>
    </div>
  )
}

// «Contenedor MSCU1234» dentro de una frase: «contenedor MSCU1234».
const enLaFrase = (titulo: string) => titulo.charAt(0).toLowerCase() + titulo.slice(1)

function Cuerpo({ destino, origenId, titulo, alCerrar }: Props & { alCerrar: () => void }) {
  const a = useAgregarVehiculos({
    destino,
    origenId,
    nombre: enLaFrase(titulo),
    alTerminar: alCerrar,
  })
  useCambiosSinGuardar(a.elegidas.length > 0, undefined, { preguntaAlCerrar: true })
  const marca = (u: Parameters<typeof yaEstaEn>[0]) => {
    if (yaEstaEn(u, destino)) return `Ya va en este ${destino.tipo}`
    const en = otroDestinoDe(u, destino)
    return en ? marcaDeOtroDestino(en) : null
  }
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      {a.lleno ? null : (
        <BuscadorDeUnidades
          yaEstan={new Set(a.elegidas.map((u) => u.id))}
          alAgregar={a.sumar}
          origenId={origenId}
          marca={marca}
        />
      )}
      <Elegidas a={a} />
      {a.lleno ? (
        <AvisoDeTope
          texto={`Hasta ${TOPE_DE_LA_SELECCION} vehículos por vez. Agrega éstos y vuelve por el resto.`}
        />
      ) : null}
      <Pie a={a} alCerrar={alCerrar} />
    </div>
  )
}

// «Agregar vehículos» (`?panel=agregar-vehiculos`, con `&contenedor=` si el destino es un contenedor): el buscador de vehículos del origen y lo elegido. Cerrar con algo elegido pregunta.
export function DrawerAgregarVehiculos(props: Props) {
  const paneles = usePanelDeEmbarques()
  const abierto = paneles.panel === PANEL_AGREGAR_VEHICULOS
  const alCerrar = () => paneles.cerrar()
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar vehículos"
      descripcion={`Al ${enLaFrase(props.titulo)}. Busca por título, VIN o lote.`}
    >
      <Cuerpo {...props} alCerrar={alCerrar} />
    </Drawer>
  )
}
