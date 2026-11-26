'use client'

import { useDeferredValue, useId } from 'react'
import { agruparCampos, camposQueCoinciden, coincide, type CampoBase } from '@/shared/lib/campos'
import { Aviso } from '@/shared/ui/aviso'
import { CabeceraDelEditor } from './cabecera-del-editor'
import type { PropsDelCuerpo } from './cuerpo'
import { CuerpoDelEditor } from './cuerpo-del-editor'
import { CuerpoConArrastreDiferido } from './diferidos'
import { DrawerDeGrupos } from './drawer-de-grupos'
import { insigniasDeLosCampos, llavesDeLosCampos } from './insignias'
import { PanelDeCampo } from './panel-de-campo'
import type {
  CasillasDelEditor,
  ConfiguracionDeCampos,
  EdicionesDeCampos,
  FijosDelEditor,
  GruposDelEditor,
} from './tipos'
import { useAccionesDelEditor } from './use-acciones-del-editor'
import { useOrdenOptimista } from './use-orden-optimista'
import { useParametrosDelEditor } from './use-parametros-del-editor'

type Props<Campo extends CampoBase, Cambios extends object, Nuevo> = {
  // Todos, también los desactivados, en el orden del layout.
  campos: readonly Campo[]
  puedeGestionar: boolean
  configuracion: ConfiguracionDeCampos<Campo, Cambios, Nuevo>
  ediciones: EdicionesDeCampos<Cambios, Nuevo>
  // El catálogo de grupos de campos del layout.
  grupos: GruposDelEditor
  // En un origen, las casillas de dato clave y los datos comunes; en los leads, nada.
  casillas?: CasillasDelEditor | null
  fijos?: FijosDelEditor | null
}

// La pantalla «Campos» de un origen y de los leads: buscar, «Grupos» (su drawer), «Nuevo campo», las casillas de dato clave (si las
// hay), los grupos con sus filas (tocar abre el panel `?campo=`; el «⋯» tiene el resto) y los desactivados, a la vista. El orden se cambia
// arrastrando el asa (diferido) o con «Subir» y «Bajar» del «⋯»; con una búsqueda escrita no se arrastra.
export function EditorDeCampos<Campo extends CampoBase, Cambios extends object, Nuevo>(
  props: Props<Campo, Cambios, Nuevo>,
) {
  const { campos, puedeGestionar, configuracion, ediciones, casillas = null, fijos = null } = props
  const { textos } = configuracion
  const sinPermiso = puedeGestionar ? null : textos.motivoSinPermiso
  const url = useParametrosDelEditor()
  const tituloId = useId()
  const orden = useOrdenOptimista(campos, ediciones.mover)
  const consulta = useDeferredValue(url.consulta)
  const enOrden = orden.lista
  const coinciden = camposQueCoinciden(enOrden, consulta)
  const ocupado = ediciones.enCurso || orden.moviendo || casillas?.enCurso === true
  const insignias = insigniasDeLosCampos({
    campos: enOrden,
    delModulo: configuracion.insignias,
    banderas: configuracion.banderas,
    casillas,
  })
  const acciones = useAccionesDelEditor({
    enOrden,
    ocupado,
    casillas,
    ediciones,
    mover: orden.mover,
    abrir: url.abrir,
  })

  const cuerpo: PropsDelCuerpo = {
    titulo: textos.titulo,
    tituloId,
    grupos: agruparCampos(coinciden),
    todos: enOrden,
    desactivados: coinciden.filter((campo) => !campo.activo),
    insignias,
    llaves: llavesDeLosCampos(enOrden, casillas),
    fijos: fijos && {
      ...fijos,
      filas: fijos.filas.filter((fila) => coincide(fila.etiqueta, consulta)),
    },
    casillas,
    consulta,
    sinCampos: !enOrden.some((campo) => campo.activo),
    vacioTitulo: textos.vacioTitulo,
    vacioDescripcion: textos.vacioDescripcion,
    motivoSinPermiso: textos.motivoSinPermiso,
    puedeGestionar,
    ocupado,
    conAsa: puedeGestionar && consulta.trim() === '',
    ...acciones,
    alLimpiar: url.limpiar,
    alCrear: url.crear,
  }

  return (
    <div className="@container/campos grid gap-4">
      <CabeceraDelEditor
        consulta={url.consulta}
        puedeGestionar={puedeGestionar}
        busqueda={url.busqueda}
        alBuscar={url.buscar}
        alCrear={url.crear}
        extra={
          <DrawerDeGrupos grupos={props.grupos} campos={campos} motivoSinPermiso={sinPermiso} />
        }
      />
      {sinPermiso === null ? null : <Aviso>{sinPermiso}</Aviso>}
      {puedeGestionar ? <CuerpoConArrastreDiferido {...cuerpo} /> : <CuerpoDelEditor {...cuerpo} />}
      <PanelDeCampo
        campo={url.abiertoEntre(campos)}
        eliminar={url.eliminar}
        todos={campos}
        puedeGestionar={puedeGestionar}
        configuracion={configuracion}
        ediciones={ediciones}
        grupos={props.grupos}
        alCerrar={url.cerrar}
      />
    </div>
  )
}
