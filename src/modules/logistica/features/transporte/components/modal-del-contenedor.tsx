'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoDeNotas } from '@/shared/ui/campo-de-notas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { LARGO_MAXIMO_DEL_SELLO } from '../../../entities/transporte/borrador-del-embarque'
import type { ContenedorLeido } from '../../../entities/transporte/embarque'
import {
  PANEL_AGREGAR_CONTENEDOR,
  PANEL_EDITAR_CONTENEDOR,
} from '../../../entities/transporte/paneles'
import { QUE_ES_EL_CONTENEDOR } from '../../../entities/transporte/textos'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from '../../../entities/transporte/transporte'
import {
  CLAVE_DEL_CONTENEDOR_EN_LA_BASE as CLAVE,
  useFormularioDelContenedor,
  type ModoDelContenedor,
} from '../hooks/use-formulario-del-contenedor'
import { usePanelDeEmbarques } from '../hooks/use-panel-de-embarques'
import { CampoDelEmbarque } from './campo-del-embarque'
import { ElegirSinEmbarque } from './elegir-sin-embarque'

type Props = {
  // Nulo = «Agregar contenedor» al embarque `embarqueId` (`?panel=agregar-contenedor` en su página); con él, «Editar el contenedor» (`?panel=editar-contenedor&contenedor=`).
  original: ContenedorLeido | null
  embarqueId: string | null
  origenId: string
  // El catálogo fijo de tipos (`tipos_contenedor`).
  tipos: readonly { clave: string; nombre: string }[]
}

const ID = 'contenedor'
type Formulario = ReturnType<typeof useFormularioDelContenedor>

const MODOS: { modo: ModoDelContenedor; etiqueta: string }[] = [
  { modo: 'nuevo', etiqueta: 'Nuevo' },
  { modo: 'elegir', etiqueta: 'Elegir uno sin embarque' },
]

// Las dos formas de agregar un contenedor a un embarque, un solo nivel: dos botones que se marcan (no pestañas anidadas).
function ModoDeAgregar({ f }: { f: Formulario }) {
  return (
    <div role="group" aria-label="Cómo agregarlo" className="flex flex-wrap gap-2">
      {MODOS.map(({ modo, etiqueta }) => (
        <Button
          key={modo}
          type="button"
          variant={f.modo === modo ? 'default' : 'outline'}
          aria-pressed={f.modo === modo}
          className="min-h-11 md:min-h-9"
          disabled={f.enCurso}
          onClick={() => f.cambiarModo(modo)}
        >
          {etiqueta}
        </Button>
      ))}
    </div>
  )
}

function CamposDelContenedor({ f, original, origenId, tipos }: Props & { f: Formulario }) {
  const apagado = f.enCurso
  const guardadoFuera =
    original?.tipo && !tipos.some((t) => t.clave === original.tipo)
      ? [{ valor: original.tipo, etiqueta: `${original.tipoNombre ?? original.tipo} (inactivo)` }]
      : []
  return (
    <>
      <Campo
        nombre={`${ID}-numero`}
        etiqueta="Número"
        autoComplete="off"
        ayuda="Las 4 letras y los dígitos pintados en la caja. Va sin espacios y en mayúsculas."
        value={f.valores.numero}
        onChange={(e) => f.escribir({ numero: e.target.value })}
        error={f.errores[CLAVE.numero]}
        disabled={apagado}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSeleccion
          nombre={`${ID}-tipo`}
          etiqueta="Tipo"
          opciones={[
            { valor: '', etiqueta: 'Sin tipo' },
            ...tipos.map((t) => ({ valor: t.clave, etiqueta: t.nombre })),
            ...guardadoFuera,
          ]}
          value={f.valores.tipo}
          onChange={(e) => f.escribir({ tipo: e.target.value })}
          error={f.errores[CLAVE.tipo]}
          disabled={apagado}
        />
        <Campo
          nombre={`${ID}-sello`}
          etiqueta="Sello"
          autoComplete="off"
          maxLength={LARGO_MAXIMO_DEL_SELLO + 10}
          value={f.valores.sello}
          onChange={(e) => f.escribir({ sello: e.target.value })}
          error={f.errores[CLAVE.sello]}
          disabled={apagado}
        />
      </div>
      {original ? (
        <CampoDelEmbarque
          nombre={`${ID}-embarque`}
          origenId={origenId}
          valor={f.valores.embarque}
          actual={original.embarque}
          alCambiar={(embarque) => f.escribir({ embarque })}
          error={f.errores[CLAVE.embarque]}
          apagado={apagado}
        />
      ) : null}
      <CampoDeNotas
        nombre={`${ID}-notas`}
        etiqueta="Notas"
        placeholder="Notas"
        maxLength={LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE + 100}
        value={f.valores.notas}
        onChange={(e) => f.escribir({ notas: e.target.value })}
        error={f.errores[CLAVE.notas]}
        disabled={apagado}
      />
    </>
  )
}

// «Agregar contenedor» (nuevo o uno sin embarque del origen) y «Editar el contenedor» (número, tipo, sello, su embarque y notas). Lo monta la página sólo con su `?panel=`; editar
// se abre sobre el drawer del contenedor y al cerrarse se vuelve a él.
export function ModalDelContenedor(props: Props) {
  const { original, embarqueId, origenId } = props
  const paneles = usePanelDeEmbarques()
  const abierto = paneles.panel === (original ? PANEL_EDITAR_CONTENEDOR : PANEL_AGREGAR_CONTENEDOR)
  const alCerrar = () => paneles.cerrar()
  const f = useFormularioDelContenedor({ original, embarqueId, origenId, abierto, alCerrar })
  const eligiendo = original === null && f.modo === 'elegir'
  return (
    <ModalDeFormulario
      id={ID}
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={original ? 'Editar el contenedor' : 'Agregar contenedor'}
      descripcion={QUE_ES_EL_CONTENEDOR}
      ancho="amplio"
      completoEnCelular
      focoInicial={() => document.getElementById(`${ID}-numero`)}
      formulario={f}
      guardar={
        original
          ? { etiqueta: 'Guardar', enCurso: 'Guardando…' }
          : { etiqueta: 'Agregar contenedor', enCurso: 'Agregando…' }
      }
    >
      {original === null && embarqueId !== null ? <ModoDeAgregar f={f} /> : null}
      {eligiendo ? (
        <ElegirSinEmbarque
          origenId={origenId}
          elegido={f.elegido}
          alElegir={f.elegir}
          error={f.errores['elegido']}
          apagado={f.enCurso}
        />
      ) : (
        <CamposDelContenedor {...props} f={f} />
      )}
    </ModalDeFormulario>
  )
}
