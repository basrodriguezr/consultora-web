import Contacto from "@/components/Contacto";
import CtaIntermedio from "@/components/CtaIntermedio";
import Diferencial from "@/components/Diferencial";
import Dolor from "@/components/Dolor";
import Hero from "@/components/Hero";
import MiniCaso from "@/components/MiniCaso";
import Proceso from "@/components/Proceso";
import SobreNosotros from "@/components/SobreNosotros";
import SocialProof from "@/components/SocialProof";

/**
 * Home. Página única, sin navegación interna: todo el scroll conduce al
 * formulario de `#contacto`, que es la única acción de la página.
 *
 * El orden no es estético, es el del argumento de venta:
 *
 *   dolor → prueba de mercado → CTA intermedio → por qué nosotros → cómo →
 *   ejemplo concreto → quiénes → CTA
 *
 * Mover una sección cambia el argumento, no el layout. Nav y Footer viven en el
 * layout porque envuelven también a `/thank-you`.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Dolor />
      <SocialProof />
      <CtaIntermedio />
      <Diferencial />
      <Proceso />
      <MiniCaso />
      <SobreNosotros />
      <Contacto />
    </>
  );
}
