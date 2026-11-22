import { ACCIONES, BOTON_DE_ACCION, CANDADO, ETIQUETA, PUNTO } from './clases'
import type { CandadoConId } from './estado'
import {
  IconoDeXCell,
  ID_DE_AJUSTES,
  ID_DE_AYUDA,
  ID_DE_RESTABLECER,
  ID_DEL_CANDADO,
  type IdDeIcono,
} from './simbolos-de-xcell'

// Las acciones se recorren con las flechas desde el valor (no son paradas de Tab), en el orden en que se ven, como en V1: candado → ⚙ → ayuda → ↺.
export const PARADA_DE_ACCIONES_DESDE = 10
export const PARADA_DEL_CANDADO = 10
export const PARADA_DE_AJUSTES = 11
export const PARADA_DE_AYUDA = 12
export const PARADA_DE_RESTABLECER = 13

type PropsDelRotulo = {
  idDeLaEtiqueta: string
  label: string
  sugerido: boolean
}

type PropsDeLasAcciones = {
  label: string
  // Uno por motivo distinto de los lados bloqueados (`notasDe()`): su id es el que nombra el `aria-describedby` de su lado.
  candados: CandadoConId[]
  // Se dibujan si la hoja las pide (`hasHelp`, `hasSettings`) y ofrece con qué responder; la celda no decide permisos ni abre nada.
  alAyudar: (() => void) | null
  alAjustar: (() => void) | null
  // `null` = sin ↺; si no, lo que dice («Volver al valor por defecto» o «Volver al sugerido»).
  restablecer: string | null
  alRestablecer: () => void
}

type PropsDeAccion = {
  parada: number
  nombre: string
  titulo: string
  icono: IdDeIcono
  alAccionar: () => void
}

function BotonDeAccion({ parada, nombre, titulo, icono, alAccionar }: PropsDeAccion) {
  return (
    <button
      type="button"
      tabIndex={-1}
      data-parada={parada}
      className={BOTON_DE_ACCION}
      aria-label={nombre}
      title={titulo}
      onClick={alAccionar}
    >
      <IconoDeXCell id={icono} />
    </button>
  )
}

// Al principio de la fila: el punto de lo sugerido y el rótulo, que se corta con «…» y lleva el texto completo en `title`. Sin envoltorio: son hijos de la celda (un nodo
// menos por celda; la hoja tiene cientos).
export function RotuloDeXCell({ idDeLaEtiqueta, label, sugerido }: PropsDelRotulo) {
  return (
    <>
      {sugerido ? (
        <>
          <span aria-hidden title="Sugerido" className={PUNTO} />
          <span className="sr-only">Sugerido</span>
        </>
      ) : null}
      <span id={idDeLaEtiqueta} title={label} className={ETIQUETA}>
        {label}
      </span>
    </>
  )
}

// El candado de un lado bloqueado: su motivo es su nombre (`role=img`) y, por ser el nodo que nombra el `aria-describedby` de su lado, la descripción de
// ese lado. Se alcanza con → (no es parada de Tab) y su globo (el `::after` de `CANDADO`) muestra el motivo al pasar el puntero o al enfocarlo. Los mismos
// 3 nodos de la nota escrita que reemplaza.
function CandadoDeXCell({ id, texto }: CandadoConId) {
  return (
    <span
      id={id}
      role="img"
      aria-label={texto}
      tabIndex={-1}
      data-parada={PARADA_DEL_CANDADO}
      className={CANDADO}
    >
      <IconoDeXCell id={ID_DEL_CANDADO} />
    </span>
  )
}

// Al final de la fila, detrás del valor: la ranura de las acciones, que siempre existe para que aparecer o irse una acción no mueva el resto. El orden es
// el de V1: candado · ⚙ · ayuda · ↺. El lugar de la marca «Editado a mano» es el primer hijo de esta ranura, antes del candado: un `<span>` con su texto,
// sin parada (hoy no se dibuja: ningún nodo mientras no se use).
export function AccionesDeXCell(props: PropsDeLasAcciones) {
  const { label, candados, alAyudar, alAjustar, restablecer, alRestablecer } = props
  return (
    <span className={ACCIONES}>
      {candados.map((candado) => (
        <CandadoDeXCell key={candado.id} id={candado.id} texto={candado.texto} />
      ))}
      {alAjustar === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_AJUSTES}
          nombre={`Cambiar el valor por defecto de ${label}`}
          titulo="Cambiar el valor por defecto"
          icono={ID_DE_AJUSTES}
          alAccionar={alAjustar}
        />
      )}
      {alAyudar === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_AYUDA}
          nombre={`Ayuda de ${label}`}
          titulo="Ayuda"
          icono={ID_DE_AYUDA}
          alAccionar={alAyudar}
        />
      )}
      {restablecer === null ? null : (
        <BotonDeAccion
          parada={PARADA_DE_RESTABLECER}
          nombre={`${restablecer} de ${label}`}
          titulo={restablecer}
          icono={ID_DE_RESTABLECER}
          alAccionar={alRestablecer}
        />
      )}
    </span>
  )
}
