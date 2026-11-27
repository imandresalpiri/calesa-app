'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import type { TransporteDeLaUnidad } from '../../../areas/transporte/composicion.client'
import type { TipoDeDestino } from '../../../entities/transporte/donde-viaja'
import { CLAVE_DE_DONDE_VIAJA, PANEL_DONDE_VIAJA } from '../../../entities/transporte/paneles'
import { useDondeViaja, type ModoDeDondeViaja } from '../hooks/use-donde-viaja'
import { CrearDondeViaja, ID_DEL_CODIGO_NUEVO } from './crear-donde-viaja'
import { ElegirContenedor, ElegirEmbarque } from './elegir-donde-viaja'
import { opcionesDelFormulario } from './opciones-del-formulario'

type Props = {
  unidadId: string
  origenId: string
  datos: TransporteDeLaUnidad
  releer: () => void
}

const ID = 'donde-viaja'
type Formulario = ReturnType<typeof useDondeViaja>

const ETIQUETA_DEL_TIPO: Record<TipoDeDestino, string> = {
  contenedor: 'Contenedor',
  embarque: 'Embarque',
}
const ETIQUETA_DEL_MODO: Record<ModoDeDondeViaja, string> = {
  elegir: 'De los que hay',
  crear: 'Nuevo',
}

// Dos botones que se marcan, un solo nivel (no pestañas anidadas): qué y cómo.
function Marcables<T extends string>({
  etiqueta,
  valores,
  textos,
  actual,
  alCambiar,
  apagado,
}: {
  etiqueta: string
  valores: readonly T[]
  textos: Record<T, string>
  actual: T
  alCambiar: (v: T) => void
  apagado: boolean
}) {
  return (
    <div role="group" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {valores.map((v) => (
        <Button
          key={v}
          type="button"
          variant={actual === v ? 'default' : 'outline'}
          aria-pressed={actual === v}
          className="min-h-11 md:min-h-9"
          disabled={apagado}
          onClick={() => alCambiar(v)}
        >
          {textos[v]}
        </Button>
      ))}
    </div>
  )
}

function Cuerpo({ f, origenId, datos }: { f: Formulario } & Props) {
  const apagado = f.enCurso
  const propsDeElegir = {
    origenId,
    elegido: f.elegido,
    alElegir: f.elegir,
    error: f.errores['elegido'],
    apagado,
  }
  return (
    <>
      {f.destinos.length > 1 ? (
        <Marcables
          etiqueta="Dónde va"
          valores={f.destinos}
          textos={ETIQUETA_DEL_TIPO}
          actual={f.tipo}
          alCambiar={(tipo) => f.cambiar({ tipo })}
          apagado={apagado}
        />
      ) : null}
      <Marcables
        etiqueta="Cómo"
        valores={['elegir', 'crear'] as const}
        textos={ETIQUETA_DEL_MODO}
        actual={f.modo}
        alCambiar={(modo) => f.cambiar({ modo })}
        apagado={apagado}
      />
      {f.modo === 'crear' ? (
        <CrearDondeViaja
          tipo={f.tipo}
          valores={f.nuevo}
          escribir={f.escribir}
          error={f.errores['codigo']}
          // Uno nuevo sólo con lo que se ofrece hoy: nada guardado que rotular.
          navieras={opcionesDelFormulario(datos, null).navieras}
          apagado={apagado}
        />
      ) : f.tipo === 'contenedor' ? (
        <ElegirContenedor {...propsDeElegir} />
      ) : (
        <ElegirEmbarque {...propsDeElegir} />
      )}
      {f.avisoDeMover ? (
        <Aviso tono="aviso">
          <p>{f.avisoDeMover}</p>
        </Aviso>
      ) : null}
    </>
  )
}

// «Elegir o crear» del hueco «Transporte» (`?transporte=donde-viaja`): el contenedor o el embarque del origen en que va la unidad, elegido de los primeros diez (o buscado) o creado ahí
// mismo con lo mínimo. Sin la regla `contenedor` en el flujo, sólo embarques. Si ya va en otro, lo dice y el botón es «Moverlo».
export function ModalDondeViaja(props: Props) {
  const { unidadId, origenId, datos, releer } = props
  const panel = usePanelPorUrl(PANEL_DONDE_VIAJA, [], { clave: CLAVE_DE_DONDE_VIAJA })
  const f = useDondeViaja({
    unidadId,
    origenId,
    actualizadoEn: datos.transporte?.actualizadoEn ?? null,
    entidades: datos,
    usaContenedores: datos.usaContenedores,
    abierto: panel.abierto,
    alCerrar: panel.cerrar,
    releer,
  })
  const etiqueta = f.mover
    ? 'Moverlo'
    : f.modo === 'crear'
      ? `Crear ${f.tipo === 'contenedor' ? 'contenedor' : 'embarque'}`
      : 'Elegir'
  return (
    <ModalDeFormulario
      id={ID}
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      titulo={f.destinos.length > 1 ? 'Elegir contenedor o embarque' : 'Elegir embarque'}
      descripcion="Dónde viaja esta unidad: uno del origen, o uno nuevo con lo mínimo."
      ancho="amplio"
      completoEnCelular
      focoInicial={() =>
        f.modo === 'crear'
          ? document.getElementById(ID_DEL_CODIGO_NUEVO)
          : document.querySelector<HTMLElement>(`#${ID} input[type=radio]`)
      }
      formulario={f}
      guardar={{ etiqueta, enCurso: 'Guardando…' }}
    >
      <Cuerpo f={f} {...props} />
    </ModalDeFormulario>
  )
}
