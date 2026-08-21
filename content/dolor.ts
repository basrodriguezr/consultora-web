/**
 * Sección "¿Te suena?" — cuantificación del dolor, antes de proponer nada.
 *
 * El orden importa y no es cosmético: es el mismo orden que los radio buttons
 * de `DESAFIOS` en `lib/leads.ts`. Quien se reconoce en la tarjeta 2 encuentra
 * la opción 2 en el formulario, y el email a la casilla dice exactamente cuál
 * de estas tarjetas lo trajo.
 */

import type { Acento } from "@/content/diferenciales";

export interface Dolor {
  titulo: string;
  descripcion: string;
  /** Selecciona el ícono SVG en el componente. */
  icono: "moneda" | "reloj" | "grafico";
  acento: Acento;
}

export const tituloDolor = "¿Te suena alguna de estas?";

export const dolores: Dolor[] = [
  {
    titulo: "La factura cloud crece y nadie puede explicar en qué se va",
    descripcion:
      "Tu equipo paga la cuenta pero no sabe qué apagar ni qué cuesta cada proyecto.",
    icono: "moneda",
    acento: "marca",
  },
  {
    titulo: "Si esa persona se va, nadie sabe replicar el reporte",
    descripcion:
      "Hay un proceso crítico que vive en la cabeza de alguien. Y funciona... hasta que no.",
    icono: "reloj",
    acento: "calido",
  },
  {
    titulo: "Cada área tiene su Excel y ningún número coincide",
    descripcion:
      "Gerencia pide un dato y recibe 3 versiones. Nadie sabe cuál es la buena.",
    icono: "grafico",
    acento: "agua",
  },
];

export const cierreDolor =
  "Cada uno se resuelve en semanas. Sin cambiar de sistema.";
