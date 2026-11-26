// Las diez funciones de la planilla para quien escribe (D5 y «¿Cómo se escribe?»): la firma, sus valores, una frase y un ejemplo en A1 que compila. Las usan el
// autocompletar, la firma en el cursor y el panel «¿Cómo se escribe?». Los nombres son los de `FUNCIONES` del compilador y la firma es `NOMBRE(valor; valor)`
// con sus `argumentos` (y «; …» si `repite`): lo fija su test. Puro.

export type AyudaDeFuncion = {
  readonly nombre: string
  readonly firma: string
  // Los valores, en orden: la firma en el cursor resalta el que se escribe.
  readonly argumentos: readonly string[]
  // Admite más del mismo (SUMA, Y, O, MAX, MIN): pasado el último, se resalta el último.
  readonly repite?: true
  readonly frase: string
  readonly ejemplo: string
}

export const FUNCIONES_DE_LA_AYUDA: readonly AyudaDeFuncion[] = [
  {
    nombre: 'SUMA',
    firma: 'SUMA(valor; valor; …)',
    argumentos: ['valor', 'valor'],
    repite: true,
    frase: 'Suma valores, un rango de la columna C o una banda entera.',
    ejemplo: '=SUMA(C5:C9)',
  },
  {
    nombre: 'SI',
    firma: 'SI(condición; si se cumple; si no)',
    argumentos: ['condición', 'si se cumple', 'si no'],
    frase: 'Elige un valor según una condición.',
    ejemplo: '=SI(C3>0; C5; 0)',
  },
  {
    nombre: 'Y',
    firma: 'Y(condición; condición; …)',
    argumentos: ['condición', 'condición'],
    repite: true,
    frase: 'Se cumple si se cumplen todas.',
    ejemplo: '=SI(Y(C2>1000; C3>0); C5; 0)',
  },
  {
    nombre: 'O',
    firma: 'O(condición; condición; …)',
    argumentos: ['condición', 'condición'],
    repite: true,
    frase: 'Se cumple si se cumple alguna.',
    ejemplo: '=SI(O(C2>1000; C3>0); C5; 0)',
  },
  {
    nombre: 'MAX',
    firma: 'MAX(valor; valor; …)',
    argumentos: ['valor', 'valor'],
    repite: true,
    frase: 'El mayor de los valores.',
    ejemplo: '=MAX(C5; 100)',
  },
  {
    nombre: 'MIN',
    firma: 'MIN(valor; valor; …)',
    argumentos: ['valor', 'valor'],
    repite: true,
    frase: 'El menor de los valores.',
    ejemplo: '=MIN(C5; C7)',
  },
  {
    nombre: 'BUSCARV',
    firma: 'BUSCARV(lo que se busca; "tabla"; "columna")',
    argumentos: ['lo que se busca', '"tabla"', '"columna"'],
    frase: 'Busca en una tabla de referencia y trae el valor de una columna.',
    ejemplo: '=BUSCARV(C2; "fletes"; "precio")',
  },
  {
    nombre: 'REDONDEAR',
    firma: 'REDONDEAR(valor; decimales)',
    argumentos: ['valor', 'decimales'],
    frase: 'Redondea a esa cantidad de decimales, de 0 a 6.',
    ejemplo: '=REDONDEAR(C9; 0)',
  },
  {
    nombre: 'PORCENTAJE_DE',
    firma: 'PORCENTAJE_DE(monto; %)',
    argumentos: ['monto', '%'],
    frase: 'Ese porcentaje del monto; el % queda en la columna B.',
    ejemplo: '=PORCENTAJE_DE(C5+C7; 4%)',
  },
  {
    nombre: 'DEPRECIAR',
    firma: 'DEPRECIAR(valor; tabla; sobre; columna)',
    argumentos: ['valor', 'tabla', 'sobre', 'columna'],
    frase: 'Aplica el factor de la fila de la tabla donde cae «sobre» (por ejemplo, el año).',
    ejemplo: '=DEPRECIAR(C5; depreciacion; C2; factor)',
  },
]
