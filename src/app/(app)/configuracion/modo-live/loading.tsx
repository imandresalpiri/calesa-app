import { EsqueletoTarjetas } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/equipo`: el esqueleto no carga el barril de pantallas.
export default function CargandoModoLive() {
  return <EsqueletoTarjetas tarjetas={4} />
}
