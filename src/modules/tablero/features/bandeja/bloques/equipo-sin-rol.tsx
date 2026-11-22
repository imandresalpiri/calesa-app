// Bloque «Personas sin rol»: las activas que esperan uno. Cada fila abre a la persona; «Ver todas» (sólo con tope) abre Equipo con el filtro «Sin rol», que tiene la misma definición.
import { leerPersonasSinRol, rutaDeLaPersona, rutaDeLasPersonasSinRol } from '@/modules/equipo'
import { cantidadAcotada } from '@/shared/lib/conteo'
import { TOPE_DE_BLOQUE } from '../../../entities/bandeja'
import { ErrorDeBloque } from '../components/error-de-bloque'
import { ListaDeBloque } from '../components/lista-de-bloque'
import { VacioDeBloque } from '../components/vacio-de-bloque'
import { VerTodasDelBloque } from '../components/ver-todas-del-bloque'
import type { CuerpoDeBloque } from './tipos'

export const CuerpoEquipoSinRol: CuerpoDeBloque = async ({ bloque }) => {
  const lectura = await leerPersonasSinRol({ tope: TOPE_DE_BLOQUE })
  if (!lectura.ok) {
    return <ErrorDeBloque />
  }
  const { personas, hayMas } = lectura.data
  if (personas.length === 0) {
    return <VacioDeBloque bloque={bloque} />
  }
  return (
    <>
      <ListaDeBloque
        filas={personas.map((persona) => ({
          id: persona.id,
          texto: persona.nombre,
          ruta: rutaDeLaPersona(persona.id),
        }))}
        conteo={cantidadAcotada(personas.length + (hayMas ? 1 : 0), TOPE_DE_BLOQUE, {
          singular: 'persona sin rol',
          plural: 'personas sin rol',
        })}
      />
      <VerTodasDelBloque bloque={bloque} ruta={rutaDeLasPersonasSinRol()} hayMas={hayMas} />
    </>
  )
}
