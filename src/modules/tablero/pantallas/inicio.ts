// Pantalla: El Inicio (`/`): la bandeja por rol. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { Bandeja } from '../features/bandeja/components/bandeja'
// El título y la frase de vacío del bloque de turnos, para el panel «Ver todos» que `src/app` monta sobre Inicio: una sola fuente con el bloque.
export { bloqueVisible } from '../entities/bandeja'
