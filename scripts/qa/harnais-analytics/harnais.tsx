// Monte la vraie section « Visiteurs et clics » dans le vrai habillage du
// back-office, sans connexion : l'utilisatrice affichée est fictive et les
// données viennent de donnees-demo.ts.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import type { User } from 'firebase/auth';
import AdminShell from '../../../src/pages/admin/AdminShell';
import VisiteursSection from '../../../src/pages/admin/sections/VisiteursSection';

const DEMO = { uid: 'demo', email: 'demo@exemple.test', displayName: 'Démo', photoURL: null } as unknown as User;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AdminShell user={DEMO} section="visiteurs" onSectionChange={() => {}}>
      <div id="outil"><VisiteursSection /></div>
    </AdminShell>
  </BrowserRouter>,
);
