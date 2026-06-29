import { useState, useEffect } from 'react';
import Navigation from '../components/marketing/Navigation';
import HeroSection from '../components/marketing/HeroSection';
import PainSection from '../components/marketing/PainSection';
import FeaturesSection from '../components/marketing/FeaturesSection';
import CountriesSection from '../components/marketing/CountriesSection';
import HowItWorksSection from '../components/marketing/HowItWorksSection';
import PayrollSection from '../components/marketing/PayrollSection';
import CultureSection from '../components/marketing/CultureSection';
import StatsSection from '../components/marketing/StatsSection';
import PricingSection from '../components/marketing/PricingSection';
import TestimonialsSection from '../components/marketing/TestimonialsSection';
import IntegrationsSection from '../components/marketing/IntegrationsSection';
import PlatformPreviewSection from '../components/marketing/PlatformPreviewSection';
import FAQSection from '../components/marketing/FAQSection';
import FooterCTASection from '../components/marketing/FooterCTASection';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ width: '100%', backgroundColor: 'white', overflowX: 'hidden' }}>
      <Navigation />
      <main style={{ paddingTop: '4rem' }}>
        <HeroSection scrollY={scrollY} />
        <PainSection scrollY={scrollY} />
        <FeaturesSection scrollY={scrollY} />
        <CountriesSection scrollY={scrollY} />
        <HowItWorksSection scrollY={scrollY} />
        <PayrollSection scrollY={scrollY} />
        <CultureSection scrollY={scrollY} />
        <StatsSection scrollY={scrollY} />
        <PricingSection scrollY={scrollY} />
        <TestimonialsSection scrollY={scrollY} />
        <IntegrationsSection scrollY={scrollY} />
        <PlatformPreviewSection scrollY={scrollY} />
        <FAQSection scrollY={scrollY} />
        <FooterCTASection scrollY={scrollY} />
      </main>
    </div>
  );
}
