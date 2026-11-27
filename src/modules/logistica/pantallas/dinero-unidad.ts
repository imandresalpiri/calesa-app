// Los huecos del panel de la unidad del área `dinero` de `logistica`: «Gastos», «Pagos» y «Margen», las tres vistas del drawer de la tarjeta «Dinero» (cada una con los `?panel=` que atiende). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`).
import { PANELES_DEL_GASTO, PANELES_DEL_MARGEN } from '../entities/dinero/paneles'
import { PANELES_DEL_PAGO } from '../entities/dinero/paneles-de-pago'
import type { HuecoDeLaUnidad } from '../entities/nucleo/hueco'
import {
  HuecoDeGastosDiferido,
  HuecoDeMargenDiferido,
  HuecoDePagosDiferido,
} from '../features/dinero/components/diferidos'

export const HUECOS_DE_DINERO_EN_LA_UNIDAD: readonly HuecoDeLaUnidad[] = [
  {
    clave: 'gastos',
    titulo: 'Gastos',
    // Los costos no se anuncian: sin la clave el bloque no se dibuja.
    permisos: ['logistica.gastos.ver'],
    regla: 'gastos',
    paneles: PANELES_DEL_GASTO,
    componente: HuecoDeGastosDiferido,
  },
  {
    clave: 'pagos',
    titulo: 'Pagos',
    // Lo cobrado no se anuncia: sin la clave el bloque no se dibuja.
    permisos: ['logistica.pagos.ver'],
    regla: 'pagos',
    paneles: PANELES_DEL_PAGO,
    componente: HuecoDePagosDiferido,
  },
  {
    clave: 'margen',
    titulo: 'Margen',
    permisos: ['logistica.margen.ver'],
    // El margen existe aunque el flujo apague `gastos` o `pagos` (D-margen).
    regla: null,
    paneles: PANELES_DEL_MARGEN,
    componente: HuecoDeMargenDiferido,
  },
]
