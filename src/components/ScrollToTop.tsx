/**
 * FlowPass — ScrollToTop Utility Component
 *
 * Ensures the viewport scrolls to the top on every route change.
 * Mounted once inside the Router provider in App.tsx.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
