'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, type RefObject } from 'react'
import { agruparCampos } from '@/shared/lib/campos'
import { enfocarPrimerError } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisosDelFormulario } from '@/shared/ui/avisos-del-formulario'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { BloqueDeCampos } from '@/shared/ui/campos'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { avisarExito } from '@/shared/ui/toasts'
import {
  SUFIJO_DE_INACTIVO,
  tiposOfrecidos,
  type TipoDeLeadEnCatalogo,
} from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import {
  CLAVE_DE_EDICION,
  campoDeEdicion,
  camposEditables,
  origenesOfrecidos,
} from '../../../entities/edicion'
import type { LeadDeFicha, OrigenConEstado } from '../../../entities/ficha'
import { useFormularioDeLead, type FormularioDeLead } from '../hooks/use-formulario-de-lead'
import { TelefonosDelPanel } from './telefonos-del-panel'
import { telefonosDeLaFicha } from '../../../entities/telefonos'

export type Datos = {
  ficha: LeadDeFicha
  // Todo el layout: acá se ofrecen los activos que quien edita recibe.
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  // Los tipos de lead, también los apagados: se ofrecen los activos y el apagado que el lead ya tiene, marcado.
  tipos: readonly TipoDeLeadEnCatalogo[]
  zona: string
}

// Lo que cambia cuando el panel se abre desde el «⋯» de la lista o del kanban y no desde la ficha: la ficha no está debajo para volver a
// leerla con `router.refresh()`, así que quien abre dice qué hacer.
export type SalidasFueraDeLaFicha = {
  // Otra persona cambió el lead: traer su versión (el panel descarta lo escrito).
  alRecargar: () => void
  // Quien edita ya no ve el lead: se cierra el panel y la lista se vuelve a leer.
  alPerderElLead: () => void
}

const idDe = (clave: string) => `lead-editar-${clave}`

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

type PropsDeFijos = {
  ficha: LeadDeFicha
  origenes: readonly OrigenConEstado[]
  tipos: readonly TipoDeLeadEnCatalogo[]
  estado: FormularioDeLead
}

// Los cuatro fijos que se editan acá: nombre, tipo y origen (el teléfono se cambia aparte). Un
// origen apagado que el lead ya tiene se ofrece marcado, para poder conservarlo.
function DatosFijos({ ficha, origenes, tipos, estado }: PropsDeFijos) {
  const ofrecidos = origenesOfrecidos(origenes, ficha.origenId)
  const sinOrigenes = ofrecidos.length === 0
  return (
    <>
      <Campo
        nombre={idDe(CLAVE_DE_EDICION.nombre)}
        etiqueta="Nombre"
        autoComplete="off"
        autoFocus
        value={texto(estado.valores[CLAVE_DE_EDICION.nombre])}
        onChange={(evento) => {
          estado.cambiar(CLAVE_DE_EDICION.nombre, evento.target.value)
        }}
        error={estado.errores[CLAVE_DE_EDICION.nombre]}
        disabled={estado.enCurso}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre={idDe(CLAVE_DE_EDICION.tipo)}
          etiqueta="Tipo"
          opciones={tiposOfrecidos(tipos, ficha.tipoLeadId).map((tipo) => ({
            valor: tipo.id,
            etiqueta: tipo.activo ? tipo.nombre : `${tipo.nombre} ${SUFIJO_DE_INACTIVO}`,
          }))}
          value={texto(estado.valores[CLAVE_DE_EDICION.tipo])}
          onChange={(evento) => {
            estado.cambiar(CLAVE_DE_EDICION.tipo, evento.target.value)
          }}
          error={estado.errores[CLAVE_DE_EDICION.tipo]}
          disabled={estado.enCurso}
        />
        <CampoSeleccion
          nombre={idDe(CLAVE_DE_EDICION.origen)}
          etiqueta="Origen del lead"
          opciones={[
            ...(ficha.origenId === null || sinOrigenes
              ? [{ valor: '', etiqueta: 'Sin origen' }]
              : []),
            ...ofrecidos.map((origen) => ({
              valor: origen.id,
              etiqueta: origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`,
            })),
          ]}
          value={texto(estado.valores[CLAVE_DE_EDICION.origen])}
          onChange={(evento) => {
            estado.cambiar(CLAVE_DE_EDICION.origen, evento.target.value)
          }}
          error={estado.errores[CLAVE_DE_EDICION.origen]}
          disabled={estado.enCurso || sinOrigenes}
        />
      </div>
    </>
  )
}

type PropsDeGrupos = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  estado: FormularioDeLead
}

// Un bloque por cada grupo del layout, con sus nombres, todos a la vista.
function GruposDeCampos({ ficha, campos, estado }: PropsDeGrupos) {
  return (
    <>
      {agruparCampos(campos).map((grupo) => (
        <BloqueDeCampos
          key={grupo.nombre ?? ''}
          titulo={grupo.nombre ?? 'Otros datos'}
          campos={grupo.campos.map((campo) => campoDeEdicion(campo, ficha.atributos[campo.clave]))}
          valores={estado.valores}
          errores={estado.errores}
          alCambiar={estado.cambiar}
          deshabilitado={estado.enCurso}
        />
      ))}
    </>
  )
}

// Lo que pasa cuando el panel termina: se guardó (o no había nada) o quien edita ya no ve el lead.
function salidasDelPanel(
  alCerrar: () => void,
  recargar: () => void,
  fueraDeLaFicha: SalidasFueraDeLaFicha | undefined,
) {
  return {
    alGuardar: (sinCambios: boolean) => {
      if (!sinCambios) {
        avisarExito('Cambios guardados')
      }
      alCerrar()
    },
    // Sin acceso ya no hay nada que editar: en la ficha, el servidor vuelve a leer y muestra la pantalla de lo que no se ve; fuera de
    // ella, el panel se cierra y la lista se vuelve a leer.
    alPerderElLead: fueraDeLaFicha
      ? () => {
          alCerrar()
          fueraDeLaFicha.alPerderElLead()
        }
      : recargar,
  }
}

function useFocoEnElPrimerError(
  formulario: RefObject<HTMLFormElement | null>,
  errores: Record<string, string>,
) {
  const hayErrores = Object.keys(errores).length > 0
  useEffect(() => {
    if (hayErrores) {
      enfocarPrimerError(formulario.current)
    }
  }, [errores, hayErrores, formulario])
}

type PropsDelContenido = Datos & {
  alCerrar: () => void
  fueraDeLaFicha: SalidasFueraDeLaFicha | undefined
  puedeEditarExtras: boolean
  puedeConfigurar: boolean
  // «Cambiar el principal» (cartera y `leads.editar`, sólo en la ficha): pasa al panel del cambio. Nulo, no se ofrece.
  alCambiarElPrincipal: (() => void) | null
}

// Lo de adentro del panel. Se monta al abrirlo (y de nuevo si cambia la versión de lo que se
// edita, por ejemplo tras «Recargar»): así cada apertura arranca de lo guardado.
export function ContenidoDeLaEdicion({
  ficha,
  campos,
  origenes,
  tipos,
  zona,
  alCerrar,
  fueraDeLaFicha,
  puedeEditarExtras,
  puedeConfigurar,
  alCambiarElPrincipal,
}: PropsDelContenido) {
  const idFormulario = useId()
  const router = useRouter()
  const refrescarLaFicha = () => {
    router.refresh()
  }
  const formulario = useRef<HTMLFormElement>(null)
  const editables = useMemo(
    () => camposEditables(campos, ficha.enCartera),
    [campos, ficha.enCartera],
  )
  const estado = useFormularioDeLead({
    ficha,
    campos: editables,
    origenes,
    tipos,
    zona,
    ...salidasDelPanel(alCerrar, refrescarLaFicha, fueraDeLaFicha),
  })

  // Con algo escrito, la acción de un aviso que sale de la pantalla («Abrir ficha») pregunta en el pie; descartar tira el borrador.
  useCambiosSinGuardar(estado.hayCambios, estado.descartarBorrador)

  // El foco va al primer campo con un motivo, también cuando se guarda con Ctrl/Cmd+S.
  useFocoEnElPrimerError(formulario, estado.errores)

  return (
    <div className="grid gap-4">
      <form
        id={idFormulario}
        ref={formulario}
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          void estado.enviar()
        }}
      >
        <AvisosDelFormulario
          enLinea={estado.enLinea}
          esperandoConexion={estado.esperandoConexion}
          enCurso={estado.enCurso}
          conflicto={estado.conflicto}
          aviso={estado.aviso}
          hrefVer={`${RUTAS.leads}/${ficha.id}`}
          alReintentar={() => void estado.enviar()}
          alRecargar={() => {
            // Trae la versión de la otra persona: lo escrito acá se descarta a propósito.
            estado.descartarBorrador()
            if (fueraDeLaFicha) {
              fueraDeLaFicha.alRecargar()
            } else {
              router.refresh()
            }
          }}
        />
        <DatosFijos ficha={ficha} origenes={origenes} tipos={tipos} estado={estado} />
        <GruposDeCampos ficha={ficha} campos={editables} estado={estado} />
      </form>
      {/* Fuera del `<form>`: rotular una fila es otro formulario, y no se anidan. Se guardan al momento. */}
      <TelefonosDelPanel
        lead={telefonosDeLaFicha(ficha)}
        puedeEditarExtras={puedeEditarExtras}
        puedeConfigurar={puedeConfigurar}
        alCambiar={refrescarLaFicha}
        cambiarElPrincipal={
          alCambiarElPrincipal
            ? { hayCambios: estado.hayCambios, alCambiar: alCambiarElPrincipal }
            : null
        }
      />
      <PieDelPanel idFormulario={idFormulario} enCurso={estado.enCurso} alCancelar={alCerrar} />
    </div>
  )
}
