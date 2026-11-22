import { EsqueletoTabla } from '@/shared/ui/esqueletos'

// Sin importar `@/modules/flujos`: el esqueleto no carga el barril de pantallas.
export default function CargandoFlujoDelOrigen() {
  return <EsqueletoTabla filas={8} columnas={4} />
}
