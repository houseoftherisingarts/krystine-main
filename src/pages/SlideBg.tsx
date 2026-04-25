// SlideBg — hidden page that renders a clean copy of the home-page hero
// (CompassOfYou: "Krystine St-Laurent" name + the rotating Origine wheel)
// against the parchment body bg, with no NavBar / Footer / ConsentBanner /
// edit chrome. Useful as a slide background for talks, interviews, or
// asset capture.
//
// The route is intentionally NOT linked from anywhere on the site; it's
// only reachable by typing /slidebg in the URL. App.tsx Chrome + Footing
// guards already exclude /slidebg from the standard layout.
//
// Drop shadow: the white drop-shadow behind the writings is applied
// inside CompassOfYou itself, so /accueil and /slidebg share the same
// visual treatment.

import React from 'react';
import CompassOfYou from '../components/CompassOfYou';

const SlideBg: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
      <CompassOfYou />
    </div>
  );
};

export default SlideBg;
