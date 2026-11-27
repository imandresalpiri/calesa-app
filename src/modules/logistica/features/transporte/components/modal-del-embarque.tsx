'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { BorradorDelEmbarque } from '../../../entities/transporte/borrador-del-embarque'
import type { EmbarqueLeido } from '../../../entities/transporte/embarque'
import type { OpcionDeTransporte } from '../../../entities/transporte/oferta'
import {
  opcionesDelEmbarque,
  type CatalogosDelEmbarque,
} from '../../../entities/transporte/opciones-del-embarque'
import { PANEL_EDITAR_EMBARQUE, PANEL_NUEVO_EMBARQUE } from '../../../entities/transporte/paneles'
import { QUE_ES_EL_EMBARQUE } from '../../../entities/transporte/textos'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from '../../../entities/transporte/transporte'
import { CLAVE_EN_LA_BASE, useFormularioDelEmbarque } from '../hooks/use-formulario-del-embarque'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'

type Props = {
  // Nulo = «Nuevo embarque» (`?panel=nuevo-embarque`); con él, «Editar el embarque» (`?panel=editar-embarque` en su página).
  original: EmbarqueLeido | null
  origenId: string
  catalogos: CatalogosDelEmbarque
}

const ID = 'embarque'
const SIN_ELEGIR: OpcionDeTransporte = { valor: '', etiqueta: 'Sin elegir' }
type CampoDelBorrador = keyof BorradorDelEmbarque

type Formulario = ReturnType<typeof useFormularioDelEmbarque>

function CamposDelEmbarque({ f, original, origenId, catalogos }: Props & { f: Formulario }) {
  const opciones = opcionesDelEmbarque(catalogos, origenId, {
    naviera: original?.navieraId ?? null,
    puertoOrigen: original?.puertoOrigenId ?? null,
    puertoDestino: original?.puertoDestinoId ?? null,
  })
  const apagado = f.enCurso
  const texto = (
    campo: CampoDelBorrador,
    etiqueta: string,
    extra: { type?: string; ayuda?: string } = {},
  ) => (
    <Campo
      nombre={`${ID}-${campo}`}
      etiqueta={etiqueta}
      type={extra.type}
      ayuda={extra.ayuda}
      autoComplete="off"
      value={f.valores[campo]}
      onChange={(e) => f.escribir({ [campo]: e.target.value })}
      error={f.errores[CLAVE_EN_LA_BASE[campo]]}
      disabled={apagado}
    />
  )
  const selector = (
    campo: CampoDelBorrador,
    etiqueta: string,
    lista: readonly OpcionDeTransporte[],
  ) => (
    <CampoSeleccion
      nombre={`${ID}-${campo}`}
      etiqueta={etiqueta}
      opciones={[SIN_ELEGIR, ...lista]}
      value={f.valores[campo]}
      onChange={(e) => f.escribir({ [campo]: e.target.value })}
      error={f.errores[CLAVE_EN_LA_BASE[campo]]}
      disabled={apagado}
    />
  )
  return (
    <>
      {texto('booking', 'Booking', {
        ayuda: 'El código de la reserva con la naviera. Va sin espacios y en mayúsculas.',
      })}
      {selector('naviera', 'Naviera', opciones.navieras)}
      <div className="grid gap-4 sm:grid-cols-2">
        {selector('puertoOrigen', 'Puerto de origen', opciones.puertosOrigen)}
        {selector('puertoDestino', 'Puerto de destino', opciones.puertosDestino)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {texto('zarpeEstimado', 'Zarpe estimado', { type: 'date' })}
        {texto('eta', 'ETA', { type: 'date' })}
        {original ? texto('zarpe', 'Zarpe', { type: 'date' }) : null}
        {original ? texto('arribo', 'Arribo', { type: 'date' }) : null}
      </div>
      <CampoDeNotas
        nombre={`${ID}-notas`}
        etiqueta="Notas"
        placeholder="Notas"
        maxLength={LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE + 100}
        value={f.valores.notas}
        onChange={(e) => f.escribir({ notas: e.target.value })}
        error={f.errores['notas']}
        disabled={apagado}
      />
    </>
  )
}

// «Nuevo embarque» y «Editar el embarque»: el booking, la naviera y los puertos (lo que usa el origen, más lo ya guardado rotulado), el zarpe estimado y la ETA; al editar, además el
// zarpe y el arribo reales. Las fechas son días (`AAAA-MM-DD`). Lo monta la página sólo con su `?panel=`; cerrar con algo escrito pregunta.
export function ModalDelEmbarque({ original, origenId, catalogos }: Props) {
  const paneles = usePanelDeEmbarques()
  const abierto = paneles.panel === (original ? PANEL_EDITAR_EMBARQUE : PANEL_NUEVO_EMBARQUE)
  const alCerrar = () => paneles.cerrar()
  const f = useFormularioDelEmbarque({ original, origenId, abierto, alCerrar })
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar el embarque' : 'Nuevo embarque'}
      descripcion={QUE_ES_EL_EMBARQUE}
      ancho="amplio"
      completoEnCelular
      focoInicial={() => document.getElementById(`${ID}-booking`)}
      formulario={f}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Crear embarque', enCurso: 'Creando…' }
      }
    >
      <CamposDelEmbarque f={f} original={original} origenId={origenId} catalogos={catalogos} />
    </ModalDeFormulario>
  )
}
