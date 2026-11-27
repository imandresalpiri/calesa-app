import { Suspense } from 'react'
import { puede } from '@/modules/equipo'
import {
  accionDeVer,
  ACCION_ESCRIBIR_NOTA,
  capacidadesDeLaTarjeta,
  leerResumenDeAduana,
  leerResumenDeDinero,
  leerResumenDeDocumentos,
  leerResumenDeNotas,
  leerResumenDeTransporte,
  resumenDelHistorial,
  tarjetasDeLaUnidad,
  type CapacidadesDeLaTarjeta,
  type ClaveDeTarjeta,
  type HuecoDeLaUnidad,
  type PasadaLeida,
  type ResumenDeTarjeta,
  type UnidadAbierta,
} from '@/modules/logistica'
import {
  ContenidoDeLaTarjeta,
  EsqueletoDelResumen,
  RejillaDeTarjetas,
  ResumenDeLaTarjeta,
  TarjetaDeLaUnidad,
} from '@/modules/logistica/pantallas/unidad-pagina'
import { leerResumenDeRepuestos } from './resumen-de-repuestos'
import type { Permisos } from '@/shared/lib/permisos'
import { urlDeLaTarjeta } from './url-de-la-tarjeta'

// Lo que cada lectura necesita saber, resuelto en el servidor: ni los permisos ni las reglas viajan al navegador.
type Contexto = {
  vehiculoId: string
  origenId: string
  capacidades: CapacidadesDeLaTarjeta
  puedeEditarRepuestos: boolean
  // Los huecos visibles de la tarjeta (Dinero lee gastos, pagos y margen sólo si se ven).
  huecos: ReadonlySet<string>
  // Las pasadas que ya leyó la cadena (nulas si no se pudieron leer): el Historial no hace otra consulta.
  pasadas: readonly PasadaLeida[] | null
}

const LECTURAS: Record<ClaveDeTarjeta, (c: Contexto) => Promise<ResumenDeTarjeta>> = {
  documentos: (c) =>
    leerResumenDeDocumentos(c.vehiculoId, { puedeSubir: c.capacidades.subirDocumentos }),
  transporte: (c) => leerResumenDeTransporte(c.vehiculoId, c.origenId),
  repuestos: (c) => leerResumenDeRepuestos(c.vehiculoId, { puedeEditar: c.puedeEditarRepuestos }),
  aduana: (c) => leerResumenDeAduana(c.vehiculoId, c.origenId),
  dinero: (c) => {
    const verGastos = c.huecos.has('gastos')
    const verPagos = c.huecos.has('pagos')
    return leerResumenDeDinero(c.vehiculoId, {
      verGastos,
      verPagos,
      verMargen: c.huecos.has('margen'),
      puedeRegistrarGasto: verGastos && c.capacidades.editarGastos,
      puedeRegistrarPago: verPagos && c.capacidades.editarPagos,
    })
  },
  notas: (c) => leerResumenDeNotas(c.vehiculoId, { puedeEscribir: c.capacidades.escribirNotas }),
  historial: (c) => Promise.resolve(resumenDelHistorial(c.pasadas)),
}

// Lo que dice una tarjeta: su lectura acotada, tras su propio `Suspense` (las siete corren en paralelo y ninguna espera a otra).
async function ResumenDelServidor({
  tarjeta,
  titulo,
  contexto,
}: {
  tarjeta: ClaveDeTarjeta
  titulo: string
  contexto: Contexto
}) {
  const resumen = await LECTURAS[tarjeta](contexto)
  return <ResumenDeLaTarjeta titulo={titulo} resumen={resumen} />
}

type Props = {
  unidad: UnidadAbierta
  permisos: Permisos
  // Los huecos visibles de la unidad (`huecosVisibles`): cada tarjeta se dibuja si alguno de los suyos se ve.
  huecos: readonly HuecoDeLaUnidad[]
  pasadas: readonly PasadaLeida[] | null
  // La clave de la URL del drawer de cada tarjeta: `?hueco=` en la página (por defecto); `?seccion=` en el drawer de gastos (un segundo drawer).
  claveDeLaUrl?: string
}

// Las tarjetas de la unidad, en su página y en el drawer de gastos (`docs/GLOSARIO.md` › «Tarjeta de la unidad»), en su orden, cada una con su resumen leído en el servidor: el marco (título, toque y drawer)
// se dibuja enseguida y sólo lo que dice espera su lectura, con un esqueleto del mismo alto. Ninguna tarjeta lee en el navegador; su drawer, sí, al abrirse. `logistica` no conoce
// `repuestos`: la tarjeta Repuestos la une esta composición.
export function TarjetasDeLaUnidad({ unidad, permisos, huecos, pasadas, claveDeLaUrl }: Props) {
  const origenId = unidad.origenId ?? ''
  const capacidades = capacidadesDeLaTarjeta(permisos, origenId)
  const tarjetas = tarjetasDeLaUnidad(huecos)
  return (
    <RejillaDeTarjetas>
      {tarjetas.map((tarjeta) => {
        const contexto: Contexto = {
          vehiculoId: unidad.id,
          origenId,
          capacidades,
          puedeEditarRepuestos: puede(permisos, 'repuestos.editar', origenId),
          huecos: new Set(tarjeta.huecos.map((h) => h.clave)),
          pasadas,
        }
        const escribe = tarjeta.clave === 'notas' && capacidades.escribirNotas
        const principal = escribe ? ACCION_ESCRIBIR_NOTA : accionDeVer(tarjeta.clave)
        return (
          <TarjetaDeLaUnidad
            key={tarjeta.clave}
            unidadId={unidad.id}
            clave={tarjeta.clave}
            titulo={tarjeta.titulo}
            etiqueta={principal.etiqueta}
            enfocarAlTocar={
              principal.destino.tipo === 'drawer' ? (principal.destino.enfocar ?? null) : null
            }
            huecos={tarjeta.huecos.map((h) => h.clave)}
            url={urlDeLaTarjeta(tarjeta.clave)}
            {...(claveDeLaUrl ? { claveDeLaUrl } : {})}
            contenido={
              <ContenidoDeLaTarjeta clave={tarjeta.clave} unidad={unidad} huecos={tarjeta.huecos} />
            }
          >
            <Suspense fallback={<EsqueletoDelResumen />}>
              <ResumenDelServidor
                tarjeta={tarjeta.clave}
                titulo={tarjeta.titulo}
                contexto={contexto}
              />
            </Suspense>
          </TarjetaDeLaUnidad>
        )
      })}
    </RejillaDeTarjetas>
  )
}
