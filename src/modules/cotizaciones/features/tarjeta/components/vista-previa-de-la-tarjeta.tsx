'use client'

import { useId, type ReactNode } from 'react'
import { ConfirmarDescarte } from '@/shared/ui/confirmar-descarte'
import { Modal } from '@/shared/ui/modal'
import { useCierreConCambios } from '@/shared/ui/use-cierre-con-cambios'
import type { PropsDeLaVistaPrevia } from '../../hoja/components/huecos'
import { avisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import { motivoParaNoRetocar } from '../../../entities/tarjeta/retoques/modo-de-la-tarjeta'
import { useModeloDeLaTarjeta, type PaginaDelModelo } from '../hooks/use-modelo-de-la-tarjeta'
import {
  useEstadoDelModo,
  useModoRetocar,
  type ModoRetocar,
  type RetoqueDeLaPagina,
} from '../hooks/use-modo-retocar'
import { CuerpoDeLaVistaPrevia } from './cuerpo-de-la-vista-previa'
import { PieDeLaVistaPrevia } from './pie-de-la-vista-previa'
import { TarjetaDeLaHermana } from './tarjeta-de-la-hermana'
import { CuerpoDelModoDiferido, PieDelModoDiferido } from './retoques'

// Lo que la página sabe de la tarjeta y la hoja no: lo da `<ProveedorDeLaTarjeta>`. `cotizacionId`: la de una guardada, que tiene PDF; nulo en la hoja nueva.
// `retoque`: los retoques de una guardada y si quien mira la puede retocar; la hoja nueva no lo pasa.
export type DatosDeLaPagina = PaginaDelModelo & {
  cotizacionId: string | null
  retoque?: RetoqueDeLaPagina
}

type Props = PropsDeLaVistaPrevia & { pagina: DatosDeLaPagina }

// «Retocar» fuera del modo: sólo en una guardada que quien mira puede guardar y con la tarjeta leída; apagado con su motivo (la tarjeta por omisión: sin
// plantilla que le sirva o sin los estados del primer recálculo).
function retocarDe(
  props: Props,
  porOmision: boolean | null,
  modo: ModoRetocar,
): { motivo: string | null; alRetocar: () => void } | null {
  if (props.pagina.retoque?.puedeRetocar !== true || porOmision === null) return null
  return {
    motivo: motivoParaNoRetocar({ porOmision, cambiosSinGuardar: props.avisos.cambiosSinGuardar }),
    alRetocar: modo.empezar,
  }
}

// El modelo de la tarjeta (con el borrador en el modo, con los guardados fuera de él), el modo y la pregunta al salir con cambios.
function useVistaPrevia(props: Props) {
  const estadoDelModo = useEstadoDelModo()
  const [{ retocando, borrador }] = estadoDelModo
  const modelo = useModeloDeLaTarjeta({
    ...props,
    opcion: props.pagina.cotizacionId === null ? props.opcion : undefined,
    retoques: retocando ? borrador : (props.pagina.retoque?.retoques ?? null),
    ocultarFilas: !retocando,
  })
  const plantilla = modelo.lectura?.estado === 'lista' ? modelo.lectura.definicion : null
  const modo = useModoRetocar({
    estado: estadoDelModo,
    cotizacionId: props.pagina.cotizacionId,
    retoque: props.pagina.retoque,
    plantilla,
    resueltos: modelo.resueltos,
  })
  const cierre = useCierreConCambios({
    hayCambios: modo.hayCambios,
    alCerrar: () => {
      modo.salir()
      props.cerrar()
    },
    abierto: props.abierta && retocando,
  })
  return { modelo, plantilla, modo, cierre }
}

// Esc, la ✕ y el clic afuera en el modo: con un campo abierto, lo tipeado queda (Esc en el campo lo cancela antes de llegar aquí); con cambios, pregunta.
// En una hoja en par, las dos tarjetas una bajo la otra, en el orden de las opciones (glosario: «Cotizaciones hermanas»).
function ConLaHermana({ props, children }: { props: Props; children: ReactNode }) {
  const { hermana } = props
  if (!hermana) return children
  const suya = (
    <TarjetaDeLaHermana
      hermana={hermana}
      formulaId={props.formulaId}
      monedaBs={props.monedaBs}
      pagina={props.pagina}
    />
  )
  return (
    <div className="grid min-w-0 gap-6">
      {hermana.antes ? suya : null}
      {children}
      {hermana.antes ? null : suya}
    </div>
  )
}

const cerrarElModo = (modo: ModoRetocar, intentarCerrar: () => void) => () => {
  if (modo.elegida?.tipo === 'celda') modo.dejar()
  intentarCerrar()
}

// La vista previa de la tarjeta (4.18-2): un modal con su URL (`?panel=vista-previa`) que dibuja la tarjeta tal como la vería el cliente, con los retoques de
// esa cotización. Se monta la primera vez que se abre (`useAbiertoAlgunaVez`, con `diferido()`): la hoja no carga la tarjeta, su modelo ni su lectura para
// dibujarse. La lectura y la geometría se arman aquí: el cuerpo dibuja la tarjeta y el pie la copia (4.18-3b). En una guardada, «Retocar» pasa el mismo modal al
// modo «Retocar la tarjeta» (su interfaz llega con `diferido()`): el borrador se dibuja con las filas ocultas atenuadas, «Listo» guarda y salir con cambios
// pregunta en el pie.
export default function VistaPreviaDeLaTarjeta(props: Props) {
  const { modelo, plantilla, modo, cierre } = useVistaPrevia(props)
  const { lectura, geometria, contexto } = modelo
  const idDelDesactualizado = useId()
  const aviso = avisoDelTotal(props.estado, props.calculo.totales.usd)
  if (modo.retocando && geometria !== null && !geometria.porOmision && plantilla !== null) {
    return (
      <Modal
        abierto={props.abierta}
        alCerrar={cerrarElModo(modo, cierre.intentarCerrar)}
        titulo="Retocar la tarjeta"
        ancho="grande"
        bloqueado={modo.enCurso}
        pie={
          cierre.confirmando ? (
            <ConfirmarDescarte alSeguir={cierre.seguir} alDescartar={cierre.descartar} />
          ) : (
            <PieDelModoDiferido modo={modo} plantilla={plantilla} />
          )
        }
      >
        <CuerpoDelModoDiferido
          modo={modo}
          geometria={geometria}
          logo={contexto.logo}
          plantilla={plantilla}
        />
      </Modal>
    )
  }
  return (
    <Modal
      abierto={props.abierta}
      alCerrar={props.cerrar}
      titulo="Vista previa"
      // La tarjeta se escala al ancho del modal: en escritorio, uno grande la deja cerca de su tamaño.
      ancho="grande"
      bloqueado={modo.enCurso}
      pie={
        <PieDeLaVistaPrevia
          geometria={geometria}
          lectura={lectura}
          aviso={aviso}
          idDelDesactualizado={idDelDesactualizado}
          cotizacionId={props.pagina.cotizacionId}
          numero={props.pagina.numero}
          retocar={retocarDe(props, geometria === null ? null : geometria.porOmision, modo)}
        />
      }
    >
      <ConLaHermana props={props}>
        <CuerpoDeLaVistaPrevia
          {...modelo}
          aviso={aviso}
          idDelDesactualizado={idDelDesactualizado}
          avisos={props.avisos}
          vencida={props.pagina.vencida}
        />
      </ConLaHermana>
    </Modal>
  )
}
