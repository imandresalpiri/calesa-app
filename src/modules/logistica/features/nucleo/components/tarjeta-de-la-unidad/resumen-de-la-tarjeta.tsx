'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import { Monto } from '@/shared/ui/monto'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type {
  AccionDeLaTarjeta,
  LineaDelResumen,
  ResumenDeTarjeta,
} from '../../../../entities/nucleo/tarjeta'
import { AvisoDeLaTarjeta } from './aviso-de-la-tarjeta'
import { useAvisoDeQueFalta } from '../../avisos-de-las-tarjetas'
import { useTarjeta } from './contexto'

type Props = {
  // El título de la tarjeta: nombra su «⋯» («Más acciones de Documentos»).
  titulo: string
  resumen: ResumenDeTarjeta
}

function lineaDelMenu(
  accion: AccionDeLaTarjeta,
  principal: boolean,
  hacer: (accion: AccionDeLaTarjeta) => void,
): AccionDeMenu {
  return {
    tipo: 'accion',
    clave: accion.clave,
    etiqueta: accion.etiqueta,
    principal,
    despuesDeCerrar: accion.destino.tipo === 'drawer',
    alElegir: () => {
      hacer(accion)
    },
  }
}

// Una línea: su texto (con `title` para leerla entera) o un monto de la base con su etiqueta.
function Linea({ linea }: { linea: LineaDelResumen }) {
  if (typeof linea === 'string') {
    return (
      <p className="truncate" title={linea}>
        {linea}
      </p>
    )
  }
  return (
    <p className="truncate">
      {linea.etiqueta}: <Monto valor={linea.monto} className="font-medium text-(--color-ink)" />
    </p>
  )
}

// Lo que dice una tarjeta de la unidad, ya leído en el servidor: hasta tres líneas (cortadas con elipsis), su aviso y el «⋯» con la lista única de sus acciones (la primera, en
// negrita, es la del toque). Va sobre el botón que cubre la tarjeta: el texto deja pasar el clic y el «⋯» lo recupera. Mide siempre lo mismo que su esqueleto.
export function ResumenDeLaTarjeta({ titulo, resumen }: Props) {
  const { clave, abrir } = useTarjeta()
  // El aviso de «Qué falta» («Falta «BL»», calculado en el navegador sobre su última lectura) manda sobre el del servidor: es lo que traba mover.
  const avisoDeQueFalta = useAvisoDeQueFalta(clave)
  const router = useRouter()
  const hacer = (accion: AccionDeLaTarjeta) => {
    const destino = accion.destino
    if (destino.tipo === 'ruta') {
      salirSinPerder(() => {
        router.push(destino.href as Route)
      })
      return
    }
    abrir({
      ...(destino.url ? { url: destino.url } : {}),
      ...(destino.enfocar ? { enfocar: destino.enfocar } : {}),
    })
  }
  const aviso = avisoDeQueFalta ?? resumen.aviso
  return (
    <>
      <div className="pointer-events-none grid min-h-10 content-start gap-0.5 text-(length:--text-sm) text-(--color-ink-soft)">
        {resumen.lineas.slice(0, 3).map((linea) => (
          <Linea key={typeof linea === 'string' ? linea : linea.etiqueta} linea={linea} />
        ))}
      </div>
      <div className="flex h-5 items-center">
        {aviso ? <AvisoDeLaTarjeta texto={aviso} /> : null}
      </div>
      {resumen.acciones.length > 0 ? (
        <div className="absolute end-2 top-2">
          <MasAcciones
            nombre={titulo}
            acciones={resumen.acciones.map((a, i) => lineaDelMenu(a, i === 0, hacer))}
          />
        </div>
      ) : null}
    </>
  )
}
