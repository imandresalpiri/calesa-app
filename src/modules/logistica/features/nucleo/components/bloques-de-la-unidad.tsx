import type { SeccionDeLaUnidad } from './contenido-del-hueco'
import { BloqueDelHueco } from './bloque-del-hueco'

// Los huecos como secciones a la vista, uno bajo otro, en el orden recibido: el panel de un drawer y la página en el celular. Cada uno se monta al acercarse.
export function BloquesDeLaUnidad({ secciones }: { secciones: readonly SeccionDeLaUnidad[] }) {
  if (secciones.length === 0) return null
  return (
    <div className="grid gap-3">
      {secciones.map((seccion) => (
        <BloqueDelHueco
          key={seccion.clave}
          clave={seccion.clave}
          titulo={seccion.titulo}
          abiertoAlInicio={seccion.abiertoAlInicio}
        >
          {seccion.contenido}
        </BloqueDelHueco>
      ))}
    </div>
  )
}
