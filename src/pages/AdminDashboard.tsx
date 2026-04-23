import React, { useEffect, useState } from 'react';
import { subscribeToAuthState, isAdminUser } from '../firebase/auth';
import type { User } from 'firebase/auth';
import AdminShell, { type AdminSectionId } from './admin/AdminShell';
import AdminLogin from './admin/AdminLogin';
import DashboardSection from './admin/sections/DashboardSection';
import AnalyticsSection from './admin/sections/AnalyticsSection';
import EventsSection from './admin/sections/EventsSection';
import BlogSection from './admin/sections/BlogSection';
import SplashSection from './admin/sections/SplashSection';
import OrdersSection from './admin/sections/OrdersSection';
import BoutiqueSection from './admin/sections/BoutiqueSection';
import MembersSection from './admin/sections/MembersSection';
import MessagesSection from './admin/sections/MessagesSection';
import SubmissionsSection from './admin/sections/SubmissionsSection';
import GroupsSection from './admin/sections/GroupsSection';
import BookingsSection from './admin/sections/BookingsSection';
import NewsletterSection from './admin/sections/NewsletterSection';
import GuideSection from './admin/sections/GuideSection';
import DoshaSection from './admin/sections/DoshaSection';
import MediaSection from './admin/sections/MediaSection';
import SettingsSection from './admin/sections/SettingsSection';

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [section, setSection] = useState<AdminSectionId>('dashboard');

  useEffect(() => {
    const unsub = subscribeToAuthState(u => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050C1A]">
        <div className="w-10 h-10 border-2 border-t-transparent border-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdminUser(user)) return <AdminLogin />;

  return (
    <AdminShell user={user} section={section} onSectionChange={setSection}>
      {section === 'dashboard'  && <DashboardSection onNavigate={setSection} />}
      {section === 'analytics'  && <AnalyticsSection />}
      {section === 'orders'     && <OrdersSection />}
      {section === 'boutique'   && <BoutiqueSection />}
      {section === 'members'    && <MembersSection />}
      {section === 'messages'   && <MessagesSection user={user} />}
      {section === 'events'     && <EventsSection />}
      {section === 'blog'       && <BlogSection />}
      {section === 'splash'     && <SplashSection />}
      {section === 'submissions' && <SubmissionsSection />}
      {section === 'groups'     && <GroupsSection />}
      {section === 'bookings'   && <BookingsSection />}
      {section === 'newsletter' && <NewsletterSection />}
      {section === 'guide'      && <GuideSection />}
      {section === 'dosha'      && <DoshaSection />}
      {section === 'media'      && <MediaSection />}
      {section === 'settings'   && <SettingsSection user={user} />}
    </AdminShell>
  );
};

export default AdminDashboard;
