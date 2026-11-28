'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useMontoEnTexto } from '@/shared/ui/monto-en-texto'
import type { EjemploConDatos } from '../../../../entities/datos/ejemplo-con-datos'
import type { FilaDeCotizacionDeEjemplo } from '../../../../entities/datos/respuestas'
import type { CotizacionesDelEjemplo } from '../../hooks/use-cotizaciones-de-ejemplo'
import { CampoDelEjemplo } from './campo-del-ejemplo'

type Props = {
  elegido: EjemploConDatos | null
  cotizaciones: CotizacionesDelEjemplo
  alElegir: (id: string) => void
  // Leyendo el vehículo o la cotización: no se elige otra hasta que llegue.
  ocupado: boolean
}

function apagadoDe(elegido: EjemploConDatos | null, cotizaciones: CotizacionesDelEjemplo) {
  if (!elegido) {
    return 'Elige un vehículo primero'
  }
  if (cotizaciones.filas.length === 0 && elegido.cotizacion === null) {
    return cotizaciones.error === null ? 'Sin cotizaciones de este vehículo' : 'Sin cotizaciones'
  }
  return null
}

function PieDeLaCotizacion({ cotizaciones }: { cotizaciones: CotizacionesDelEjemplo }) {
  if (cotizaciones.error !== null) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        {cotizaciones.error}
        <Button type="button" variant="outline" size="xs" onClick={cotizaciones.verMas}>
          Reintentar
        </Button>
      </p>
    )
  }
  if (cotizaciones.enTope) {
    return (
      <AvisoDeTope
        texto={textoDelTope(TOPE_DE_ESTE_VEHICULO, { sustantivo: 'cotizaciones', articulo: 'las' })}
      />
    )
  }
  if (!cotizaciones.hayMas) {
    return null
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={cotizaciones.cargandoMas}
      onClick={cotizaciones.verMas}
    >
      {cotizaciones.cargandoMas ? 'Cargando…' : 'Ver más cotizaciones'}
    </Button>
  )
}

// La cotización de ejemplo, entre las de «De este vehículo» (la aprobada primero): número, título y total (en texto, con el Modo Live sin la
// moneda: una opción no lleva `<Monto>`). Sin una opción «ninguna»: con cotizaciones, el arte usa una. La elegida que no está en lo cargado (la
// recordada, más abajo) se ve igual, por su número.
export function ElegirCotizacion({ elegido, cotizaciones, alElegir, ocupado }: Props) {
  const montoEnTexto = useMontoEnTexto()
  const actual = elegido?.cotizacion?.cotizacion ?? null
  const fuera = actual !== null && !cotizaciones.filas.some((f) => f.id === actual.id)
  const apagado = apagadoDe(elegido, cotizaciones)
  const textoDe = (fila: FilaDeCotizacionDeEjemplo) =>
    [
      `n.º ${String(fila.numero)}`,
      fila.titulo,
      fila.total !== null && fila.moneda !== null
        ? montoEnTexto(fila.total, { moneda: fila.moneda })
        : null,
      fila.aprobada ? 'Aprobada' : null,
    ]
      .filter((parte) => parte !== null && parte !== '')
      .join(' · ')
  return (
    <CampoDelEjemplo
      etiqueta="Cotización"
      valor={actual?.id ?? ''}
      apagado={apagado}
      alCambiar={alElegir}
      pie={<PieDeLaCotizacion cotizaciones={cotizaciones} />}
    >
      {fuera ? <option value={actual.id}>{`n.º ${String(actual.numero)}`}</option> : null}
      {actual === null ? (
        <option value="" disabled>
          Elige una cotización
        </option>
      ) : null}
      {cotizaciones.filas.map((fila) => (
        <option key={fila.id} value={fila.id} disabled={ocupado}>
          {textoDe(fila)}
        </option>
      ))}
    </CampoDelEjemplo>
  )
}
