'use client'

import type { Tono } from '@/shared/ui/xcell'
import { BarraDeCambiosSinGuardar } from '@/shared/ui/barra-de-cambios-sin-guardar'
import type { TablaDelCatalogoDelOrigen } from '../../../../entities/catalogo-de-tablas'
import type { Diseno } from '../../../../entities/diseno'
import type {
  DisenoParaEditar,
  NivelDelDiseno,
} from '../../../../entities/diseno/edicion-del-diseno'
import { useEditorDeLaHoja } from '../../hooks/use-editor-de-la-hoja'
import { useVistaDelEditor } from '../../hooks/use-vista-del-editor'
import type { TonoDelCatalogo } from '../aspecto'
import { AvisosDelDiseno } from '../avisos-del-diseno'
import { BarraDeGuardado } from '../barra-de-guardado'
import { EstadoDeLaHojaEnLaBarra } from '../estado-de-la-hoja-en-la-barra'
import type { ApoyoDelInspector } from '../inspector/apoyo-del-inspector'
import { InspectorDeLaHoja } from '../inspector/inspector-de-la-hoja'
import { useFilasSinLugar } from '../inspector/sin-lugar-en-la-hoja'
import { ControlesDeLaVista } from './controles-de-la-vista'
import { LienzoDeLaHoja } from './lienzo-de-la-hoja'

type Props = {
  origen: { id: string; nombre: string }
  leida: DisenoParaEditar
  disenoLeido: Diseno
  niveles: readonly NivelDelDiseno[]
  // Los colores del catálogo, para pintar la hoja y las muestras; sus claves y nombres para elegir (nulo si no se pudo leer).
  tonos: readonly Tono[]
  catalogo: readonly TonoDelCatalogo[] | null
  // El catálogo de tablas del origen, para la ayuda de una celda (nulo si no se pudo leer).
  tablas: readonly TablaDelCatalogoDelOrigen[] | null
  // «+ Nuevo nivel» del inspector; nulo sin `equipo.roles.gestionar`.
  nuevoNivel: ApoyoDelInspector['nuevoNivel']
  // «+ Nuevo color» de una sección; nulo sin `cotizaciones.configurar`.
  alCrearColor: ApoyoDelInspector['alCrearColor']
  recargando: boolean
  alRecargar: () => void
}

const FORMULARIO = 'guardar-la-hoja'
const CON_EL_INSPECTOR = 'grid min-w-0 items-start gap-4 grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
const INSPECTOR_FIJO = 'sticky top-4 max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto'

// El editor de la hoja (desde 1.024 px): la hoja real a la vista elegida, editable tocándola (el lienzo), y a su derecha el inspector de la pieza elegida (o
// «Sin lugar en la hoja (N)» si hay filas sin pieza; si no, el lienzo ocupa todo el ancho). Arriba, «Guardar el borrador», los avisos y las vistas; abajo, la
// barra de los cambios sin guardar (salir con cambios pregunta). Cada cambio se aplica en el acto y `validarDiseno()` lo revisa; mientras guarda, todo espera.
export function EditorDeLaHoja({ origen, recargando, alRecargar, ...lo }: Props) {
  const hoja = useEditorDeLaHoja({ origen, ...lo })
  const { editor, elegida } = hoja
  const { guardado } = editor
  const vista = useVistaDelEditor()
  const sinLugar = useFilasSinLugar(editor)
  const conInspector = elegida !== null || sinLugar.length > 0
  return (
    <div className="grid min-w-0 gap-3" data-editor-de-la-hoja="">
      <EstadoDeLaHojaEnLaBarra guardado={guardado} />
      <BarraDeGuardado
        nombreDelOrigen={origen.nombre}
        enCurso={guardado.enCurso}
        estado={guardado.estado}
        motivo={guardado.motivo}
        recargando={recargando}
        alGuardar={() => void guardado.guardar()}
        alRecargar={alRecargar}
      />
      <AvisosDelDiseno rechazo={editor.rechazo} avisos={editor.avisos} />
      <ControlesDeLaVista vista={vista.vista} alElegir={vista.elegir} />
      <div className={conInspector ? CON_EL_INSPECTOR : 'grid min-w-0'}>
        <LienzoDeLaHoja
          origen={origen}
          editor={editor}
          params={lo.leida.params}
          tonos={lo.tonos}
          vista={vista.vista}
          elegida={elegida}
          elegir={hoja.elegir}
          alAnunciar={hoja.anunciar}
        />
        {conInspector ? (
          <div className={INSPECTOR_FIJO}>
            <InspectorDeLaHoja
              elegida={elegida}
              apoyo={hoja.apoyo}
              sinLugar={sinLugar}
              elegir={hoja.elegir}
              alQuitar={hoja.quitar}
              alUbicarElTotal={hoja.ubicarElTotal}
              alAgregar={hoja.agregar}
            />
          </div>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only" data-anuncio-de-la-hoja="">
        {hoja.anuncio}
      </p>
      <form
        id={FORMULARIO}
        hidden
        onSubmit={(e) => {
          e.preventDefault()
          void guardado.guardar()
        }}
      />
      <BarraDeCambiosSinGuardar
        hayCambios={guardado.hayCambios}
        formulario={FORMULARIO}
        guardando={guardado.enCurso}
        alDescartar={guardado.descartar}
      />
    </div>
  )
}
