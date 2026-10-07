'use client';

import { useState } from 'react';
import NewsIndicator from './news-indicator';

export default function Shell({
  children
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header>
        <a className="brand" href="/">
          <span className="brand-symbol">
            E<span> /</span>
          </span>
          <span>
            EAST COAST
            <small>BADMINTON CLUB</small>
          </span>
        </a>

        <button
          className="menu"
          aria-expanded={open}
          aria-controls="navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav
          id="navigation"
          className={open ? 'open' : ''}
          aria-label="Main navigation"
          onClick={() => setOpen(false)}
        >
          <a href="/training">Programs</a>
          <a href="/calendar">Calendar</a>
          <a href="/news" className="news-nav-link">
            News <NewsIndicator />
          </a>
          <a href="/coach">Our coach</a>
          <a href="/history">Our story</a>
          <a className="nav-contact" href="/admin">
            Owner login
          </a>
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer>
        <a className="brand" href="/">
          <span className="brand-symbol">E /</span>
          <span>
            EAST COAST
            <small>BADMINTON CLUB</small>
          </span>
        </a>

        <span>Maryland, USA · See you on court.</span>
        <a href="/admin">Owner dashboard</a>
        <a href="tel:+12023908988">(202) 390-8988</a>
        <small>East Coast Badminton Club · Redesign concept</small>
      </footer>
    </>
  );
}
