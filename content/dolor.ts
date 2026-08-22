/**
 * Sección "¿Te suena?" — cuantificación del dolor, antes de proponer nada.
 *
 * El orden importa y no es cosmético: es el mismo orden que los radio buttons
 * de `DESAFIOS` en `lib/leads.ts`. Quien se reconoce en la tarjeta 1 encuentra
 * la opción 1 en el formulario.
 *
 * Título de producción (validado): pregunta suave que invita a reconocerse,
 * no afirmación agresiva. Cada dolor tiene `costo` para cuantificar sin juzgar.
 *
 * Reordenado: reportes manuales primero (dolor más universal entre prospectos
 * reales), cloud costs segundo.
 */

import type { Acento } from "@/content/diferenciales";

export interface Dolor {
  titulo: string;
  descripcion: string;
  /** Cifra o dato que cuantifica el costo de no resolver el problema. */
  costo: string;
  /** Selecciona el ícono SVG en el componente. */
  icono: "moneda" | "reloj" | "grafico";
  acento: Acento;
}

export const tituloDolor = "¿Te suena alguna de estas?";

export const dolores: Dolor[] = [
  {
    titulo: "Si esa persona se va, nadie sabe replicar el reporte",
    descripcion:
      "Hay un Excel o un proceso crítico que vive en la cabeza de alguien. Y funciona... hasta que no.",
    costo: "8-20 horas/semana de trabajo que nadie más puede hacer",
    icono: "reloj",
    acento: "calido",
  },
  {
    titulo: "Cada área tiene su Excel y ningún número coincide",
    descripcion:
      "Gerencia pide un dato y recibe 3 versiones. Las reuniones se gastan reconciliando, no decidiendo.",
    costo: "Decisiones con 2-3 semanas de retraso",
    icono: "grafico",
    acento: "agua",
  },
  {
    titulo: "La factura cloud crece y nadie puede explicar en qué se va",
    descripcion:
      "Tu equipo paga la cuenta pero no sabe qué apagar ni qué cuesta cada proyecto. Finanzas pregunta y TI no tiene respuesta.",
    costo: "$2-6M CLP/mes en recursos cloud sin atribuir",
    icono: "moneda",
    acento: "marca",
  },
];

export const cierreDolor =
  "Cada uno se resuelve en semanas. Sin cambiar de sistema.";
