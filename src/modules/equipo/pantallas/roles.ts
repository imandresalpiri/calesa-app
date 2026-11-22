// Pantalla: Configuración › Roles y permisos. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { MatrizDeRoles } from '../features/roles/components/matriz-de-roles'
// Lo que la ruta le pasa a la matriz para los niveles de acceso (lo dibuja cotizaciones): un tipo estructural que cada módulo declara por su lado.
export type { HuecosDeNivelesEnLaMatriz } from '../features/roles/components/huecos-de-niveles'
