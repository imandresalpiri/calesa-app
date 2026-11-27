'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { MOTIVO_SIN_RED } from '../../../../entities/tarjeta/compartir/motivos-de-compartir'
import {
  esIdDeCotizacion,
  type PestanaDeCompartir,
} from '../../../../entities/tarjeta/compartir/url'
import { useCompartirLaCotizacion } from '../../hooks/use-compartir-la-cotizacion'
import { AccionesParaCompartir } from './acciones-para-compartir'
import { ImagenParaCompartir } from './imagen-para-compartir'
import { TextoParaCompartir } from './texto-para-compartir'

export type PropsDelPanelDeCompartir = {
  abierto: boolean
  alCerrar: () => void
  cotizacionId: string
  focoAlCerrar?: ComponentProps<typeof Modal>['focoAlCerrar']
}

const TITULO = 'Compartir cotización'
const SIN_ACCESO = 'No tienes acceso a esta cotización.'

type Estado = ReturnType<typeof useCompartirLaCotizacion>

// El panel cuando no hay nada que compartir (sin acceso): el motivo y «Cerrar».
function PanelConAviso({
  abierto,
  alCerrar,
  focoAlCerrar,
  aviso,
}: PropsDelPanelDeCompartir & { aviso: string }) {
  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={TITULO}
      focoAlCerrar={focoAlCerrar}
      pie={
        <Button type="button" variant="outline" onClick={alCerrar}>
          Cerrar
        </Button>
      }
    >
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {aviso}
      </p>
    </Modal>
  )
}

// El pie: «Creado por <autor>» (como V1) y los botones.
function PieDeCompartir({
  c,
  cotizacionId,
  opcion,
  numero,
}: {
  c: Estado
  cotizacionId: string
  opcion: 'cotizacion' | 'fotos'
  numero: number
}) {
  return (
    <div className="grid w-full min-w-0 gap-2">
      {c.leidos?.autor ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Creado por {c.leidos.autor}
        </p>
      ) : null}
      <AccionesParaCompartir
        cotizacionId={cotizacionId}
        numero={numero}
        capacidades={c.capacidades}
        motivos={c.motivos}
        opcion={opcion}
        texto={c.texto}
        imagen={c.imagen.parte.estado === 'listo' ? c.imagen.parte.dato : null}
        imagenFallida={c.imagen.parte.estado === 'error'}
        fotos={c.fotosMarcadas.listas}
      />
    </div>
  )
}

// «Compartir cotización» (`docs/GLOSARIO.md` › «Compartir la cotización»): la imagen (la de la tarjeta o las fotos marcadas del vehículo) y el texto tal como saldrán, y los
// botones para copiarlos, descargarlos, mandarlos por el menú del sistema o bajar el PDF. Lo abre su URL (`?panel=compartir`, y `&para=<id>` fuera del detalle); se pide
// con `diferido()` y cada apertura empieza de cero (`key`). Con el Modo Live se ve sin moneda (la imagen `?sin-moneda=1` y el texto de los gemelos `…SinMoneda`), y
// lo que se copia, descarga o comparte va siempre completo, con su moneda.
export function PanelDeCompartir(props: PropsDelPanelDeCompartir) {
  const valido = esIdDeCotizacion(props.cotizacionId)
  const c = useCompartirLaCotizacion(props.cotizacionId, valido)
  if (
    !valido ||
    (c.datos.parte.estado === 'error' && c.datos.parte.error.codigo === 'no_encontrado')
  ) {
    return <PanelConAviso {...props} aviso={SIN_ACCESO} />
  }
  const numero = c.leidos?.numero ?? 0
  const conFotos = c.leidos?.vehiculo?.hayFotos === true
  const opcion = conFotos ? c.opcion : 'cotizacion'
  return (
    <Modal
      abierto={props.abierto}
      alCerrar={props.alCerrar}
      titulo={TITULO}
      ancho="grande"
      focoAlCerrar={props.focoAlCerrar}
      pie={
        <PieDeCompartir c={c} cotizacionId={props.cotizacionId} opcion={opcion} numero={numero} />
      }
    >
      {c.enLinea ? null : (
        <p role="status" className="text-(length:--text-sm) font-medium text-(--color-aviso-ink)">
          {MOTIVO_SIN_RED}
        </p>
      )}
      <Tabs
        value={c.pestana}
        onValueChange={(valor) => {
          c.elegirPestana(valor as PestanaDeCompartir)
        }}
        className="min-w-0"
      >
        <TabsList className="max-md:h-11">
          <TabsTrigger value="imagen" className="px-3">
            Imagen
          </TabsTrigger>
          <TabsTrigger value="texto" className="px-3">
            Texto
          </TabsTrigger>
        </TabsList>
        <TabsContent value="imagen" className="grid min-w-0 gap-3 pt-3">
          <ImagenParaCompartir c={c} opcion={opcion} conFotos={conFotos} numero={numero} />
        </TabsContent>
        <TabsContent value="texto" className="pt-3">
          <TextoParaCompartir
            datos={c.datos.parte}
            texto={c.textoALaVista}
            formato={c.formato}
            zona={c.zona}
            alElegirFormato={c.setFormato}
            alElegirZona={c.setZona}
            alReintentar={c.datos.reintentar}
          />
        </TabsContent>
      </Tabs>
    </Modal>
  )
}
