import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BLUEPRINTS } from './blueprints.js';

/* =====================================================================
   HEADER GLOBAL — sin fondo, logo al centro, navegación a ambos lados.
   - Sobre secciones oscuras: todo blanco + logo blanco.
   - Sobre secciones claras: todo negro + logo original (rojo).
   El tema sale del atributo data-header-theme de cada sección.
   Los estilos viven en /public/site-chrome.css (compartido con las
   páginas de servicios). Si tocás el diseño, tocá ese archivo.
===================================================================== */

const SERVICES = [
  {
    "number": "01",
    "title": "Diseño de stands",
    "desc": "Concepto, planos y recorrido",
    "href": "/servicios/diseno-de-stands/"
  },
  {
    "number": "02",
    "title": "Fabricación de stands",
    "desc": "Carpintería, metal, gráfica y luz",
    "href": "/servicios/fabricacion-de-stands/"
  },
  {
    "number": "03",
    "title": "Montaje de stands",
    "desc": "Instalación y puesta a punto",
    "href": "/servicios/montaje-de-stands/"
  },
  {
    "number": "04",
    "title": "Presentación 3D",
    "desc": "Recorré tu stand antes de fabricarlo",
    "href": "/servicios/presentacion-3d/"
  }
];

const CAPTIONS = [
  'Concepto, plantas, recorridos y materiales pensados para construirse.',
  'Carpintería, metal, gráfica e iluminación llevados a piezas reales.',
  'Instalación, gráfica y puesta a punto para llegar listos al evento.',
  'Recorré el proyecto en 3D antes de fabricarlo.'
];

const WHATSAPP = 'https://wa.me/595991549500';

function Caret() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteHeader() {
  const headerRef = useRef(null);
  const megaRef = useRef(null);
  const closeTimer = useRef(0);
  const [theme, setTheme] = useState('dark');
  const [megaOpen, setMegaOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [active, setActive] = useState(0);

  /* ---------- tema según la sección que queda debajo del header ---------- */
  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const header = headerRef.current;
      if (!header) return;

      const y = header.offsetHeight / 2;
      let next = 'dark';

      document.querySelectorAll('[data-header-theme]').forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= y && rect.bottom > y) {
          next = section.getAttribute('data-header-theme') || 'dark';
        }
      });

      setTheme(next);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* ---------- cerrar con Esc / clic afuera ---------- */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMegaOpen(false);
        setDrawerOpen(false);
      }
    };

    const onClick = (event) => {
      if (!megaRef.current || !headerRef.current) return;
      const button = headerRef.current.querySelector('#ugServicesBtn');
      if (!megaRef.current.contains(event.target) && !button?.contains(event.target)) {
        setMegaOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 960) setDrawerOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openMega = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setMegaOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 220);
  }, []);

  const hoverCapable = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const onMegaMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  const goTop = (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setDrawerOpen(false);
  };

  return (
    <>
      <header ref={headerRef} className="ug-header" id="ugHeader" data-theme={theme}>
        <nav className="ug-nav ug-nav-left" aria-label="Navegación principal">
          <a className="ug-link" href="#work">Proyectos</a>

          <a
            id="ugServicesBtn"
            className="ug-link ug-link-services"
            href="#services"
            aria-expanded={megaOpen}
            aria-controls="ugMega"
            aria-haspopup="true"
            onClick={() => setMegaOpen(false)}
            onPointerEnter={() => { if (hoverCapable()) openMega(); }}
            onPointerLeave={() => { if (hoverCapable()) scheduleClose(); }}
          >
            Servicios
            <span className="ug-link-count">4</span>
            <Caret />
          </a>
        </nav>

        <a className="ug-brand" href="/" aria-label="Universal Group - Inicio" onClick={goTop}>
          <img className="ug-logo ug-logo-white" src="/images/universal-white.png" alt="Universal Group" />
          <img className="ug-logo ug-logo-red" src="/images/universal-red.png" alt="" />
        </a>

        <nav className="ug-nav ug-nav-right" aria-label="Secciones">
          <a className="ug-link" href="#process">Proceso</a>
          <a className="ug-link" href="#social">Conectemos</a>
        </nav>

        <button
          id="ugBurger"
          type="button"
          className="ug-burger"
          aria-label={drawerOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span /><span />
        </button>

        <div
          ref={megaRef}
          id="ugMega"
          className={`ug-mega ${megaOpen ? 'is-open' : ''}`}
          aria-hidden={!megaOpen}
          onPointerEnter={() => window.clearTimeout(closeTimer.current)}
          onPointerLeave={() => { if (hoverCapable()) scheduleClose(); }}
          onPointerMove={onMegaMove}
        >
          <div className="ug-mega-inner">
            <div className="ug-mega-preview">
              <div className="ug-mega-tag"><span>PLANO · <b>0{active + 1}</b></span><span>UNIVERSAL GROUP</span></div>
              <svg className="ug-bp" viewBox="0 0 420 300" role="img" aria-label="Plano ilustrativo del servicio">
                {BLUEPRINTS.map((markup, i) => (
                  <g
                    key={i}
                    data-bp={i}
                    className={megaOpen && i === active ? 'is-on' : ''}
                    dangerouslySetInnerHTML={{ __html: markup }}
                  />
                ))}
              </svg>
              <p className="ug-mega-caption">{CAPTIONS[active]}</p>
            </div>

            <ul className="ug-mega-list">
              {SERVICES.map((service, i) => (
                <li key={service.href}>
                  <a
                    className={`ug-mega-item ${i === active ? 'is-active' : ''}`}
                    href={service.href}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                  >
                    <span className="ug-mega-num">{service.number}</span>
                    <span>
                      <span className="ug-mega-title">{service.title}</span>
                      <span className="ug-mega-desc">{service.desc}</span>
                    </span>
                    <span className="ug-mega-arrow" aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="ug-mega-foot">
              <span>Diseño · Fabricación · Montaje · 3D</span>
              <div>
                <a href="#services" onClick={() => setMegaOpen(false)}>Ver todos los servicios</a>
                <a href={WHATSAPP} target="_blank" rel="noreferrer">Cotizar un stand</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`ug-drawer ${drawerOpen ? 'is-open' : ''}`} id="ugDrawer" aria-hidden={!drawerOpen}>
        <a className="ug-drawer-link" href="#work" onClick={() => setDrawerOpen(false)}>Proyectos</a>
        <a className="ug-drawer-link" href="#services" onClick={() => setDrawerOpen(false)}>Servicios</a>
        <div className="ug-drawer-sub">
          {SERVICES.map((service) => (
            <a key={service.href} href={service.href}>
              <small>{service.number}</small>{service.title}
            </a>
          ))}
        </div>
        <a className="ug-drawer-link" href="#process" onClick={() => setDrawerOpen(false)}>Proceso</a>
        <a className="ug-drawer-link" href="#social" onClick={() => setDrawerOpen(false)}>Conectemos</a>
        <div className="ug-drawer-foot">ASUNCIÓN · PARAGUAY</div>
      </div>
    </>
  );
}
