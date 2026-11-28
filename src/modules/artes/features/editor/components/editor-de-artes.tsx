'use client'

import { useRef } from 'react'
import { useArteConDatos } from '../hooks/use-arte-con-datos'
import { useMenuDelEditor } from '../hooks/use-menu-del-editor'
import { useTrabajoEnElLienzo } from '../hooks/use-trabajo-en-el-lienzo'
import type { EjemploConDatos } from '../../../entities/datos/ejemplo-con-datos'
import type { ManejoDeLaMiniatura, ManejoDelLienzo, PropsDelEditorDeArtes } from '../tipos'
import { AvisosEncimaDelLienzo } from './avisos-encima-del-lienzo'
import { AbiertoDesdeElMenu } from './barra/abierto-desde-el-menu'
import { BarraDelEditor } from './barra/barra-del-editor'
import { Herramientas } from './herramientas'
import { Inspector } from './inspector'
import { Lienzo } from './lienzo/lienzo'
import { PanelIzquierdo } from './panel-izquierdo'
import { CELDAS_DEL_EDITOR, REJILLA_DEL_EDITOR } from './rejilla'

// El vehículo y la cotización elegidos: otra elección vuelve a abrir el aviso de lo que falta.
function eleccionDe(elegido: EjemploConDatos | null): string {
  return elegido ? `${elegido.vehiculo.vehiculo.id}:${elegido.cotizacion?.cotizacion.id ?? ''}` : ''
}

// El editor de artes a pantalla completa (la raíz diferida): arma el estado y lo reparte por props. La barra arriba (con el vehículo de
// ejemplo); abajo el riel de herramientas, «Agregar» y «Capas» (con la tira de páginas en un PDF), el lienzo y el inspector («Diseño» y
// «Textos»), con las medidas de `rejilla.ts` (las mismas que en frío). El documento con sus datos sale de `useArteConDatos`; la herramienta,
// la cámara, los atajos y las fuentes, de `useTrabajoEnElLienzo`.
export function EditorDeArtes(props: PropsDelEditorDeArtes) {
  const { plantilla, logos, motivoDeSoloLectura } = props
  const soloLectura = motivoDeSoloLectura !== null
  const lienzo = useRef<ManejoDelLienzo>(null)
  const primera = useRef<ManejoDeLaMiniatura>(null)
  const { documento, ejemplo, datos, sinClientes } = useArteConDatos(props, { lienzo, primera })
  const { editor, nombre, cambiarNombre, guardado, borrador } = documento
  const trabajo = useTrabajoEnElLienzo({ editor, soloLectura, lienzo })
  const { h, alContenedor, tamano, camara, agregar, fuentes } = trabajo
  const menu = useMenuDelEditor(lienzo, nombre, editor)

  return (
    <div className={REJILLA_DEL_EDITOR}>
      <BarraDelEditor
        plantilla={plantilla}
        nombre={nombre}
        alCambiarNombre={cambiarNombre}
        motivoDeSoloLectura={motivoDeSoloLectura}
        guardado={guardado}
        hacer={menu.hacer}
        ejemplo={{ ejemplo, origen: props.origen, motivo: props.motivoDelEjemplo, sinClientes }}
      />
      <div className={CELDAS_DEL_EDITOR.riel}>
        <Herramientas herramienta={h.herramienta} alElegir={h.elegir} soloLectura={soloLectura} />
      </div>
      <div className={CELDAS_DEL_EDITOR.izquierda}>
        <PanelIzquierdo
          editor={editor}
          logos={logos}
          datos={datos}
          pestana={h.pestana}
          alCambiarPestana={h.setPestana}
          alAgregar={agregar}
          pedidoDeLaBiblioteca={h.pedidoDeLaBiblioteca}
          fuentes={fuentes}
          primera={primera}
        />
      </div>
      <section ref={alContenedor} aria-label="Lienzo" className={CELDAS_DEL_EDITOR.lienzo}>
        {tamano ? (
          <Lienzo
            ref={lienzo}
            editor={editor}
            conDatos={datos.conDatos}
            herramienta={h.herramienta}
            manoTransitoria={h.manoTransitoria}
            alUsarHerramienta={h.volverAMover}
            camara={camara}
            tamano={tamano}
            fuentes={fuentes}
          />
        ) : null}
        <AvisosEncimaDelLienzo
          hayCambios={guardado.hayCambios}
          conflicto={guardado.estado === 'conflicto'}
          ofrecido={borrador.ofrecido !== null}
          alRecuperar={borrador.recuperar}
          alDescartarOfrecido={borrador.descartarOfrecido}
          alDescartarAlSalir={borrador.olvidar}
          faltan={datos.faltan}
          eleccion={eleccionDe(ejemplo.elegido)}
        />
      </section>
      <div className={CELDAS_DEL_EDITOR.derecha}>
        <Inspector
          editor={editor}
          logos={logos}
          datos={datos}
          textos={props}
          formato={plantilla.formato}
        />
      </div>
      <AbiertoDesdeElMenu
        menu={menu}
        fuente={{ id: plantilla.id, nombre, formato: plantilla.formato }}
        documento={() => editor.estado.documento}
      />
    </div>
  )
}
