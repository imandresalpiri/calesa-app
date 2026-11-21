'use client'

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from 'cn'
import { ALTO_INICIAL } from '../lib/alto-del-panel'
import { useAtajo } from './atajos'
import { AsaDelPanel } from './asa-del-panel'
import { ContextoDeCambios } from './cambios-del-panel'
import { ConfirmarDescarte } from './confirmar-descarte'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet'
import { useCierreConCambios } from './use-cierre-con-cambios'

type Popup = ComponentProps<typeof SheetContent>

type Props = {
  // Controlado siempre: quién lo abre guarda el estado en la URL (`?panel=`, `?id=`), para que
  // el panel sobreviva a recargar y a compartir el enlace.
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  // En móvil conviene 'bottom' (hoja inferior).
  lado?: 'right' | 'left' | 'bottom'
  // Un formulario con muchos campos pide más lugar que una ficha corta.
  ancho?: 'normal' | 'amplio'
  pie?: ReactNode
  // Quién se desplaza: el cuerpo (por defecto) o lo de adentro, que lo hace por su cuenta y deja fijo lo de arriba (una cabecera con pestañas que llenan el resto). Con `'propio'`
  // el cuerpo no se desplaza y sus hijos deben ocupar su alto.
  desplazamiento?: 'cuerpo' | 'propio'
  // Sólo con `lado="bottom"`: el panel arranca al 60 % de la ventana en escritorio y se agranda arrastrando su asa (o con ↑/↓); debajo de `md` ocupa toda la pantalla, sin asa. El alto se
  // recuerda mientras el panel está montado y no se guarda en ningún lado.
  alto?: 'ajustable'
  // A dónde va el foco al cerrar (el de Base UI). Sin esto: el elemento que tenía el foco antes de abrir, que un panel abierto por la
  // URL (con `shallow: false`) a veces ya no tiene: un panel que se apila sobre otro devuelve el foco a quien lo abrió.
  focoAlCerrar?: Popup['finalFocus']
  // Al costado de la pantalla y no modal: sin fondo, lo de atrás se sigue usando (tocar otra cosa no lo cierra; Esc y la ✕ sí). Para un panel que
  // acompaña a la pantalla en un escritorio ancho (el de una fase del flujo); en angosto va modal, como todos.
  alCostado?: boolean
  children: ReactNode
}

// El alto ajustable (`alto="ajustable"`): lo recuerda mientras el panel está montado, lo pasa al CSS como `--alto-del-panel` y dibuja el asa.
function useAltoAjustable(ajustable: boolean) {
  const [alto, setAlto] = useState(ALTO_INICIAL)
  return {
    ajustable,
    propsDelPanel: ajustable
      ? { style: { '--alto-del-panel': `${String(alto)}dvh` } as CSSProperties }
      : {},
    asa: ajustable ? <AsaDelPanel alto={alto} alCambiar={setAlto} /> : null,
  }
}

// La hoja inferior no pasa del alto de la pantalla: lo de adentro se desplaza.
function clasesDelPanel(
  lado: NonNullable<Props['lado']>,
  ancho: NonNullable<Props['ancho']>,
  ajustable: boolean,
) {
  return cn(
    'gap-0',
    ajustable
      ? 'data-[side=bottom]:h-dvh max-h-dvh rounded-none md:data-[side=bottom]:h-(--alto-del-panel) md:max-h-[95dvh] md:rounded-t-(--radius-card)'
      : lado === 'bottom'
        ? 'max-h-[85dvh] rounded-t-(--radius-card)'
        : ancho === 'amplio'
          ? 'data-[side=left]:w-full data-[side=right]:w-full sm:max-w-xl data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
          : 'sm:max-w-md',
  )
}

// El encabezado y el cuerpo del panel. `pr-12`: la ✕ va en una esquina (`absolute`, 2,5 rem desde el borde); un título largo baja de línea antes de encimarse con ella.
function CuerpoDelPanel({
  titulo,
  descripcion,
  desplazamiento,
  children,
}: Pick<Props, 'titulo' | 'descripcion' | 'children'> & {
  desplazamiento: NonNullable<Props['desplazamiento']>
}) {
  return (
    <>
      <SheetHeader className="border-b border-(--color-line) pr-12">
        <SheetTitle>{titulo}</SheetTitle>
        {descripcion ? <SheetDescription>{descripcion}</SheetDescription> : null}
      </SheetHeader>
      <div
        className={
          desplazamiento === 'propio'
            ? 'min-h-0 flex-1 overflow-hidden p-4'
            : 'flex-1 overflow-y-auto p-4'
        }
      >
        {children}
      </div>
    </>
  )
}

// Panel lateral: el segundo nivel de cualquier pantalla (crear, editar, ver una ficha sin salir
// de la lista). Un modal nunca abre otro modal; un drawer sí puede abrirse desde uno.
// Cerrarlo no pregunta (lo escrito queda en el borrador del formulario). Lo que sí pregunta es la acción de un aviso que sale de la
// pantalla («Abrir ficha», `sale: true`) con algo escrito: el formulario de adentro lo dice con `useCambiosSinGuardar()` y la pregunta
// va en el pie (`pie`) o, si el pie va dentro del cuerpo, en `<PieDelPanel>`. Lo escrito que no tiene borrador (la nota de «Agregar
// vehículo») pide `preguntaAlCerrar`: ahí cerrar también pregunta, y sin `pie` la pregunta ocupa el pie.
export function Drawer({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  lado = 'right',
  ancho = 'normal',
  pie,
  desplazamiento = 'cuerpo',
  alto,
  focoAlCerrar,
  alCostado = false,
  children,
}: Props) {
  const [hayCambios, setHayCambios] = useState(false)
  const ajuste = useAltoAjustable(alto === 'ajustable' && lado === 'bottom')
  const [preguntaAlCerrar, setPreguntaAlCerrar] = useState(false)
  const alDescartar = useRef<(() => void) | undefined>(undefined)
  const anotar = useCallback((hay: boolean, descartar?: () => void, pregunta = false) => {
    setHayCambios(hay)
    setPreguntaAlCerrar(hay && pregunta)
    if (descartar) {
      alDescartar.current = descartar
    }
  }, [])
  const cierre = useCierreConCambios({
    hayCambios,
    alCerrar,
    abierto,
    alDescartar: () => {
      alDescartar.current?.()
    },
  })
  // Cerrar el panel (Esc, la ✕, el clic afuera) pregunta sólo si lo escrito no tiene borrador; si no, cierra y queda el borrador.
  const pedirCierre = preguntaAlCerrar ? cierre.intentarCerrar : alCerrar
  useAtajo('cerrar', pedirCierre, abierto)
  const { confirmando, seguir, descartar } = cierre
  const registro = useMemo(
    () => ({ anotar, salida: { confirmando, seguir, descartar } }),
    [anotar, confirmando, seguir, descartar],
  )
  const pieAMostrar =
    confirmando && (pie || preguntaAlCerrar) ? (
      <ConfirmarDescarte alSeguir={seguir} alDescartar={descartar} />
    ) : (
      pie
    )

  return (
    <ContextoDeCambios value={registro}>
      <Sheet
        open={abierto}
        modal={!alCostado}
        disablePointerDismissal={alCostado}
        onOpenChange={(sigueAbierto) => {
          if (!sigueAbierto) {
            pedirCierre()
          }
        }}
      >
        <SheetContent
          side={lado}
          finalFocus={focoAlCerrar}
          conFondo={!alCostado}
          className={clasesDelPanel(lado, ancho, ajuste.ajustable)}
          {...ajuste.propsDelPanel}
        >
          {ajuste.asa}
          <CuerpoDelPanel titulo={titulo} descripcion={descripcion} desplazamiento={desplazamiento}>
            {children}
          </CuerpoDelPanel>
          {pieAMostrar ? (
            <SheetFooter className="border-t border-(--color-line)">{pieAMostrar}</SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </ContextoDeCambios>
  )
}
