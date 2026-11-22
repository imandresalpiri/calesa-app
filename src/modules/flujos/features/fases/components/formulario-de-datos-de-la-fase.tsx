'use client'

import { useEffect, useEffectEvent, useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { PieDelPanel } from '@/shared/ui/pie-del-panel'
import { TabsContent } from '@/shared/ui/tabs'
import {
  pestanaDelCampo,
  type BloqueDeFase,
  type PestanaDeFase,
} from '../../../entities/fases/bloques-de-fase'
import { contextoDelFlujo } from '../../../entities/fases/reglas-de-fase'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { useFormularioDeDatos } from '../hooks/use-formulario-de-datos'
import { BloqueDemora } from './bloque-demora'
import { BloqueEnElFlujo } from './bloque-en-el-flujo'
import { BloqueIdentidad } from './bloque-identidad'
import { BloqueTransporte } from './bloque-transporte'
import { BloqueWebYPortal } from './bloque-web-y-portal'
import { firmaDeLasMarcas, type MarcasDeLasPestanas } from './marcas-de-las-pestanas'

type Props = {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  // La pestaña que se ve: «Guardar» y «Cancelar» sólo se dibujan en las del formulario.
  pestana: PestanaDeFase
  alElegirPestana: (pestana: PestanaDeFase) => void
  // Avisa a la barra de pestañas cuáles tienen un error o algo sin guardar.
  alMarcar: (marcas: MarcasDeLasPestanas) => void
}

// El formulario de una fase: las pestañas «Identidad» (nombre, descripción, color, icono) y «Ajustes» (cuatro bloques a la vista) son **un** `<form>` con un solo «Guardar» y
// un solo «Cancelar» al pie del panel. Un envío a la vez; mientras guarda, los campos van apagados (cada control, a mano: un `<fieldset disabled>` no apaga los
// `Switch`). Lo escrito sin guardar queda en su borrador y, si la persona se va por un aviso que sale de la pantalla, el panel pregunta. Con un error en la
// pestaña que no se ve, al guardar la lleva y le da el foco al primer campo con error. `display: contents`: el `<form>` no suma una caja entre las pestañas y su pie.
export function FormularioDeDatosDeLaFase({
  flujo,
  fase,
  pestana,
  alElegirPestana,
  alMarcar,
}: Props) {
  const idDelFormulario = useId()
  const f = useFormularioDeDatos({
    flujo,
    fase,
    alIrAlCampo: (campo) => {
      alElegirPestana(pestanaDelCampo(campo))
    },
  })
  useCambiosSinGuardar(f.hayCambios, f.descartar)
  const marcas: MarcasDeLasPestanas = {
    conError: [...f.pestanasConError],
    conCambios: [...f.pestanasConCambios],
  }
  const firma = firmaDeLasMarcas(marcas)
  const marcar = useEffectEvent(() => {
    alMarcar(marcas)
  })
  useEffect(() => {
    marcar()
  }, [firma])
  const contexto = contextoDelFlujo(flujo)
  const delBloque = (bloque: BloqueDeFase) => f.conError.has(bloque)
  const comunes = {
    valores: f.valores,
    errores: f.errores,
    escribir: f.escribir,
    deshabilitado: f.enCurso,
    contexto,
  }

  return (
    <form
      id={idDelFormulario}
      noValidate
      className="contents"
      onSubmit={(evento) => {
        evento.preventDefault()
        void f.enviar()
      }}
    >
      {f.esperandoConexion ? (
        <Aviso tono="aviso">
          {f.enLinea
            ? 'No pudimos guardar. Lo escrito sigue aquí.'
            : 'Sin conexión: se guarda solo cuando vuelva.'}
        </Aviso>
      ) : null}
      <TabsContent value="identidad" keepMounted className="pt-2">
        <BloqueIdentidad {...comunes} conError={delBloque('identidad')} />
      </TabsContent>
      <TabsContent value="ajustes" keepMounted className="pt-2">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <BloqueEnElFlujo
            {...comunes}
            conError={delBloque('en-el-flujo')}
            fase={fase}
            fases={flujo.fases}
          />
          <BloqueDemora {...comunes} conError={delBloque('demora')} />
          <BloqueTransporte {...comunes} conError={delBloque('transporte')} />
          <BloqueWebYPortal {...comunes} conError={delBloque('web-y-portal')} />
        </div>
      </TabsContent>
      {pestana === 'reglas' ? null : (
        <PieDelPanel
          idFormulario={idDelFormulario}
          enCurso={f.enCurso}
          alCancelar={f.descartar}
          etiquetaDeGuardar="Guardar"
        />
      )}
    </form>
  )
}
