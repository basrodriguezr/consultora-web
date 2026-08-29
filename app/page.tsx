import Contacto from "@/components/Contacto";
import CtaIntermedio from "@/components/CtaIntermedio";
import Diferencial from "@/components/Diferencial";
import Dolor from "@/components/Dolor";
import Hero from "@/components/Hero";
import MiniCaso from "@/components/MiniCaso";
import Outcomes from "@/components/Outcomes";
import Proceso from "@/components/Proceso";
import SobreNosotros from "@/components/SobreNosotros";
import SocialProof from "@/components/SocialProof";

/**
 * Home. Página única, sin navegación interna: todo el scroll conduce al
 * formulario de `#contacto`, que es la única acción de la página.
 *
 * El orden no es estético, es el del argumento de venta:
 *
 *   dolor → ejemplo concreto (mock) → prueba de mercado → qué resolvemos →
 *   CTA intermedio → por qué nosotros → cómo → quiénes → CTA
 *
 * Cambio ago-2026: MiniCaso subió después de Dolor (el mock es la mejor
 * sección visual y ahora se ve antes del scroll largo). Outcomes (servicios
 * como resultados) se agregó entre SocialProof y CTA intermedio.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Dolor />
      <MiniCaso />
      <SocialProof />
      <Outcomes />
      <CtaIntermedio />
      <Diferencial />
      <Proceso />
      <SobreNosotros />
      <Contacto />
    </>
  );
}
