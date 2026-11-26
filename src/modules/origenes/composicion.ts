// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  LectorDeCampoPrincipal,
  LectorDeDatosClave,
  LectorDeDatosNuevos,
  LectorDeGruposDelOrigen,
  LectorDeLayout,
  LectorDeOrigenes,
  RepositorioCampos,
  RepositorioCategorias,
  RepositorioDeGruposDelOrigen,
  RepositorioOrigenes,
} from './entities/repositorios'
import { camposSupabase } from './infra/campos'
import { categoriasSupabase } from './infra/categorias'
import { gruposDelOrigenSupabase } from './infra/grupos'
import { origenesSupabase } from './infra/origenes'
import { getDatosClave } from './infra/queries/datos-clave'
import { getDatosNuevos } from './infra/queries/datos-nuevos'
import { getGruposDelOrigen } from './infra/queries/grupos'
import { getCampoPrincipal, getLayout } from './infra/queries/layout'
import { getOrigenes, getOrigenesConUso } from './infra/queries/origenes'

export const repositorioOrigenes: RepositorioOrigenes = origenesSupabase
export const repositorioCampos: RepositorioCampos = camposSupabase
export const repositorioCategorias: RepositorioCategorias = categoriasSupabase
export const repositorioDeGruposDelOrigen: RepositorioDeGruposDelOrigen = gruposDelOrigenSupabase

export const leerOrigenes: LectorDeOrigenes = getOrigenesConUso
export const leerLayout: LectorDeLayout = getLayout
export const leerGruposDelOrigen: LectorDeGruposDelOrigen = getGruposDelOrigen
export const leerCampoPrincipal: LectorDeCampoPrincipal = getCampoPrincipal
export const leerDatosNuevosDeApibara: LectorDeDatosNuevos = getDatosNuevos
export const leerDatosClave: LectorDeDatosClave = getDatosClave

export { getOrigenes }
