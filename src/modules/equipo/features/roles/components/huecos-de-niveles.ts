import type { ReactNode } from 'react'

// Lo que la matriz de Roles recibe del módulo de cotizaciones para dibujar los niveles de acceso. La página junta los dos módulos (`equipo` no
// depende de `cotizaciones`): ninguno importa al otro, cada uno declara este mismo tipo estructural. Sin huecos, las filas de nivel igual se
// agrupan bajo su rótulo, sin «⋯» ni pie.
export type HuecosDeNivelesEnLaMatriz = {
  // Los niveles fijos con su frase («Todos»), o el error de lectura con «Reintentar».
  cabeza: ReactNode
  // El «⋯» de un nivel, por su clave: nulo sin gestionar o si el nivel ya no está en la lista.
  menuDelNivel: (clave: string) => ReactNode
  // «+ Nuevo nivel» con el motivo del tope: nulo sin gestionar.
  pie: ReactNode
  // Los modales y el anuncio para el lector de pantalla: siempre montados.
  ventanas: ReactNode
}
