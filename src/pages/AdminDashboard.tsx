import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { subscribeToAuthState, isAdminUser, isAdminBypassActive } from '../firebase/auth';
import type { User } from 'firebase/auth';

// Synthesized user object when the local bypass is active. The shell only
// reads a few fields (email, displayName, photoURL, uid) so a minimal
// stand-in is enough to render. Not a real Firebase User — casting via
// `unknown` because the Firebase type has many internals we don't need.
const BYPASS_USER = {
  uid: 'bypass-alex',
  email: 'alex@lesalondesinconnus.com',
  displayName: 'Alex (bypass)',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
  metadata: { creationTime: undefined, lastSignInTime: undefined },
  phoneNumber: null,
  providerId: 'bypass',
} as unknown as User;
import AdminShell, { type AdminSectionId, slugToSection, sectionToSlug } from './admin/AdminShell';
import AdminLogin from './admin/AdminLogin';
import { isDevAdminActive } from '../lib/devAdmin';
import DashboardSection from './admin/sections/DashboardSection';
import AnalyticsSection from './admin/sections/AnalyticsSection';
import EventsSection from './admin/sections/EventsSection';
import LiveSection from './admin/sections/LiveSection';
import FeedPublicSection from './admin/sections/FeedPublicSection';
import BlogSection from './admin/sections/BlogSection';
import SplashSection from './admin/sections/SplashSection';
import FoyerSection from './admin/sections/FoyerSection';
import AssetsSection from './admin/sections/AssetsSection';
import FormationsSection from './admin/sections/FormationsSection';
import OrdersSection from './admin/sections/OrdersSection';
import BoutiqueSection from './admin/sections/BoutiqueSection';
import MembersSection from './admin/sections/MembersSection';
import HabitudesSection from './admin/sections/HabitudesSection';
import BadgeBleuSection from './admin/sections/BadgeBleuSection';
import MessagesSection from './admin/sections/MessagesSection';
import RecompensesSection from './admin/sections/RecompensesSection';
import SkinsATravaillerSection from './admin/sections/SkinsATravaillerSection';
import SondagesSection from './admin/sections/SondagesSection';
import GamificationSection from './admin/sections/GamificationSection';
import SubmissionsSection from './admin/sections/SubmissionsSection';
import GroupsSection from './admin/sections/GroupsSection';
import BookingsSection from './admin/sections/BookingsSection';
import DemandeSection from './admin/sections/DemandeSection';
import BugsSection from './admin/sections/BugsSection';
import NewsletterSection from './admin/sections/NewsletterSection';
import GuideSection from './admin/sections/GuideSection';
import DoshaSection from './admin/sections/DoshaSection';
import MediaSection from './admin/sections/MediaSection';
import SettingsSection from './admin/sections/SettingsSection';

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const { section: slug } = useParams();
  const navigate = useNavigate();

  // La section n'est plus un état local mais l'adresse elle-même : on peut
  // partager /admin/formulaires, le mettre en favori, et le rafraîchir sans
  // retomber sur le tableau de bord.
  const section = slugToSection(slug) ?? 'dashboard';
  const setSection = (s: AdminSectionId) => navigate(`/admin/${sectionToSlug(s)}`);

  useEffect(() => {
    const unsub = subscribeToAuthState(u => setUser(u));
    return unsub;
  }, []);

  // Adresse inconnue (/admin/nimportequoi) : on revient au tableau de bord
  // plutôt que d'afficher une coquille vide.
  useEffect(() => {
    if (slug && !slugToSection(slug)) navigate('/admin', { replace: true });
  }, [slug, navigate]);

  // ─── Une seule liste de sections ───────────────────────────────────────
  // Les deux rendus (bypass local et admin authentifié) étaient recopiés à
  // la main et avaient divergé : « Live » et « Feed public » manquaient au
  // rendu authentifié, donc Krystine tombait sur une page blanche en
  // cliquant dessus. Un seul switch, plus de dérive possible.
  const renderSection = (u: User) => {
    switch (section) {
      case 'dashboard':   return <DashboardSection onNavigate={setSection} />;
      case 'analytics':   return <AnalyticsSection />;
      case 'orders':      return <OrdersSection />;
      case 'boutique':    return <BoutiqueSection />;
      case 'members':     return <MembersSection />;
      case 'habitudes':   return <HabitudesSection />;
      case 'badgeBleu':   return <BadgeBleuSection />;
      case 'messages':    return <MessagesSection user={u} />;
      case 'recompenses': return <RecompensesSection />;
      case 'skinsATravailler': return <SkinsATravaillerSection />;
      case 'sondages':    return <SondagesSection />;
      case 'gamification': return <GamificationSection user={u} />;
      case 'live':        return <LiveSection />;
      case 'feedpublic':  return <FeedPublicSection />;
      case 'events':      return <EventsSection />;
      case 'blog':        return <BlogSection />;
      case 'splash':      return <SplashSection />;
      case 'foyer':       return <FoyerSection />;
      case 'submissions': return <SubmissionsSection />;
      case 'groups':      return <GroupsSection />;
      case 'bookings':    return <BookingsSection />;
      case 'demande':     return <DemandeSection user={u} />;
      case 'bugs':        return <BugsSection />;
      case 'newsletter':  return <NewsletterSection />;
      case 'guide':       return <GuideSection />;
      case 'dosha':       return <DoshaSection />;
      case 'media':       return <MediaSection />;
      case 'assets':      return <AssetsSection />;
      case 'formations':  return <FormationsSection />;
      case 'settings':    return <SettingsSection user={u} />;
    }
  };

  // Local bypass short-circuit: when `__adminBypass === '1'` we skip the
  // Firebase auth check entirely and render the dashboard with a
  // synthesized user. Bypass is cleared on logout in AdminShell.
  if (isAdminBypassActive()) {
    return (
      <AdminShell user={BYPASS_USER} section={section} onSectionChange={setSection}>
        {renderSection(BYPASS_USER)}
      </AdminShell>
    );
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#151d19]">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#BA7B39] rounded-full animate-spin" />
      </div>
    );
  }

  // En dev seulement (`?unlock=…`, voir src/lib/devAdmin.ts) : l'admin s'ouvre
  // sans compte Firebase, avec un utilisateur factice. Mort en production.
  const devUser = import.meta.env.DEV && !user && isDevAdminActive() ? ({ uid: 'dev-admin', email: 'dev@local', displayName: 'Dev' } as any) : null;
  const admin = user && isAdminUser(user) ? user : devUser;
  if (!admin) return <AdminLogin />;

  return (
    <AdminShell user={admin} section={section} onSectionChange={setSection}>
      {renderSection(admin)}
    </AdminShell>
  );
};

export default AdminDashboard;
