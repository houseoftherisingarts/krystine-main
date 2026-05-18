import HeroSection from '../components/HeroSection';
import FootprintTrail from '../components/FootprintTrail';
import OpeningTextSection from '../components/OpeningTextSection';
import PurposeSection from '../components/PurposeSection';
import ThePathSection from '../components/ThePathSection';
import AudienceSection from '../components/AudienceSection';
import DestinationSection from '../components/DestinationSection';
import AudioPlayer from '../components/AudioPlayer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--color-chalk)] text-[var(--color-eucalyptus)] font-sans pt-14">
      <AudioPlayer />
      <HeroSection />
      <FootprintTrail />
      <OpeningTextSection />
      <FootprintTrail count={2} colorClass="text-[var(--color-eucalyptus)]/40" />
      <PurposeSection />
      <FootprintTrail count={5} colorClass="text-[var(--color-copper)]/40" />
      <ThePathSection />
      <FootprintTrail count={3} colorClass="text-[var(--color-copper)]/40" />
      <AudienceSection />
      <DestinationSection />
    </main>
  );
}
