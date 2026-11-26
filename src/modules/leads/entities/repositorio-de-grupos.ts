// Lo que el editor de campos necesita del catálogo de grupos de los leads (docs/GLOSARIO.md › Grupo de campos), dicho como interfaces.
// La implementación vive en `infra/grupos.ts` e `infra/queries/grupos.ts`.
import type { GrupoDeCampos } from '@/shared/lib/campos'
import type { CatalogoLeido, DestinoAlQuitar } from '@/shared/lib/catalogo'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'

// El catálogo de grupos de campos del layout de los leads (docs/GLOSARIO.md › Grupo de campos), con su tope.
export type LectorDeGruposDeCampos = () => Promise<Resultado<CatalogoLeido>>

// Una edición de un grupo, con la versión que se vio (`PT409` si otra persona lo cambió).
type EdicionDeGrupo<Datos> = { id: string; actualizadoEnEsperado: string } & Datos

// Los rechazos de un dato llegan en `porCampo` (`rechazoDelCatalogo()`): `nombre`, `items` (tiene campos) o `destino`.
export type RepositorioDeGruposDeCampos = {
  // Nace al final del catálogo; un nombre que ya existe con otra escritura es `duplicado` («Ya existe «X».»).
  crear: (nombre: string) => Promise<ResultadoDeAccion<GrupoDeCampos>>
  // Renombrar (cambia el nombre en todos sus campos) o activar y desactivar. Devuelve la versión nueva.
  guardar: (
    pedido: EdicionDeGrupo<{ cambios: { nombre?: string; activo?: boolean } }>,
  ) => Promise<ResultadoDeAccion<string>>
  // El orden de los bloques: después de `despuesDe` (nulo, primero).
  mover: (
    pedido: EdicionDeGrupo<{ despuesDe: string | null }>,
  ) => Promise<ResultadoDeAccion<string>>
  // Sólo sin campos; con `mover`, sus campos van antes al final del destino.
  quitar: (pedido: EdicionDeGrupo<{ destino: DestinoAlQuitar }>) => Promise<ResultadoDeAccion<null>>
}
