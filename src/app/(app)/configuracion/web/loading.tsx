import { EsqueletoTarjetas } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/web`: el esqueleto no carga el barril de pantallas. Sitio web abre en Ajustes: su forma.
export default function CargandoConfiguracionDeWeb() {
  return <EsqueletoTarjetas tarjetas={5} />
}
