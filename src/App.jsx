import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Menu, X, Box, Ruler, Layers3, Sparkles } from 'lucide-react';
import VideoShowcase from './components/VideoShowcase.jsx';
import InteractiveStatement from './components/InteractiveStatement.jsx';
import ProjectTransformationGallery from './components/ProjectTransformationGallery.jsx';
import StandInteractiveButton from './components/StandInteractiveButton.jsx';

const showcase = [
  {
    video: '/videos/stand_1.mp4',
    eyebrow: 'DISEÑO · EXHIBICIÓN · EXPERIENCIA',
    title: <>Espacios que<br /><em>hacen visible</em><br />tu marca.</>,
    text: 'Diseñamos, fabricamos y montamos espacios para marcas que necesitan destacar sin perder su identidad.'
  },
  {
    video: '/videos/stand_2.mp4',
    eyebrow: 'ARQUITECTURA · PRODUCTO · EXPERIENCIA',
    title: <>Diseño que<br /><em>convierte cada</em><br />metro.</>,
    text: 'Cada superficie, recorrido y punto de encuentro está pensado para que el espacio comunique antes de que alguien pregunte.'
  },
  {
    video: '/videos/stand_3.mp4',
    eyebrow: 'ESPACIO · PRESENCIA · EVENTO',
    title: <>Arquitectura que<br /><em>genera</em><br />presencia.</>,
    text: 'Creamos espacios que ordenan, atraen y presentan productos con una arquitectura preparada para el evento real.'
  }
];

const VIEWER_URL = '/viewer/index.html?project=enicab-9cwtd';

const socialLinks = {
  instagram: 'https://www.instagram.com/universalgroup.py/',
  facebook: 'https://www.facebook.com/universalparaguay',
  whatsapp: 'https://wa.me/?text=Hola%20Universal%20Group%2C%20quiero%20consultar%20por%20un%20stand.'
};

const services = [
  { number: '', title: 'Diseño', text: 'Concepto, arquitectura espacial y una identidad que se entiende desde lejos.', icon: Layers3 },
  { number: '', title: 'Fabricación', text: 'Carpintería, metal, gráfica, iluminación y detalles preparados para construir.', icon: Ruler },
  { number: '', title: 'Montaje', text: 'Coordinación, instalación y puesta a punto para llegar al evento con todo resuelto.', icon: Box },
  { number: '', title: 'Presentación 3D', text: 'Experiencias interactivas para recorrer el proyecto antes de fabricarlo.', icon: Sparkles }
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [lightHeader, setLightHeader] = useState(false);
  const [processActive, setProcessActive] = useState(0);
  const showcaseRef = useRef(null);
  const videoShowcaseRef = useRef(null);
  const showcaseIndexRef = useRef(0);
  const rafRef = useRef(0);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  useEffect(() => {
    const updateTimeline = () => {
      rafRef.current = 0;

      const section = showcaseRef.current;
      const player = videoShowcaseRef.current;
      if (!section || !player?.setTimeline) return;

      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const rawProgress = (-rect.top) / travel;
      const timelineProgress = Math.max(0, Math.min(1, rawProgress));

      player.setTimeline(timelineProgress);

      const scaled = Math.min(2.999999, timelineProgress * showcase.length);
      const nextIndex = Math.min(showcase.length - 1, Math.floor(scaled));
      const direction = timelineProgress >= (player.getTimeline?.() ?? 0) ? 1 : -1;

      if (nextIndex !== showcaseIndexRef.current) {
        showcaseIndexRef.current = nextIndex;
        setShowcaseIndex(nextIndex);
      }
    };

    const onScroll = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(updateTimeline);
    };

    const onResize = () => {
      updateTimeline();
    };

    updateTimeline();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const updateHeader = () => {
      const statement = document.getElementById('statement');
      const process = document.getElementById('process');
      const inWhiteSection = [statement, process].some((section) => {
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5;
      });
      setLightHeader(inWhiteSection);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('resize', updateHeader, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateHeader);
      window.removeEventListener('resize', updateHeader);
    };
  }, []);

  const go = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const current = showcase[showcaseIndex];

  return (
    <>
      <div className="site">
      <div className="scroll-progress"><motion.div style={{ scaleX: progress }} /></div>

      <header className={`header ${lightHeader ? 'header-light' : ''}`}>
        <div className="header-shell">
          <button className="brand" onClick={() => go('top')} aria-label="Universal Group">
            <span className="brand-logo-wrap">
              <img src="/images/universal-white.png" alt="Universal Group" className="brand-logo brand-logo-white" />
              <img src="/images/universal-red.png" alt="" className="brand-logo brand-logo-red" />
            </span>
          </button>

          <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Navegación principal">
            <button onClick={() => go('work')}>Proyectos</button>
            <button onClick={() => go('services')}>Servicios</button>
            <button onClick={() => go('process')}>Proceso</button>
            <button onClick={() => go('viewer')}>3D</button>
            <button onClick={() => go('social')}>Conectemos</button>
          </nav>

          <button className="menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Menú">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="showcase showcase-scroll-timeline" ref={showcaseRef} data-header-theme="dark">
          <div className="showcase-grid" />
          <div className="showcase-noise" />

          <div className="showcase-sticky">
          <motion.div className="showcase-copy">
            <AnimatePresence mode="wait">
              <motion.div
                key={showcaseIndex}
                className="showcase-copy-inner"
                initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -22, filter: 'blur(8px)' }}
                transition={{ duration: .48, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="eyebrow">{current.eyebrow}</p>
                <h1>{current.title}</h1>
                <p className="hero-text">{current.text}</p>
                <div className="hero-actions">
                  <StandInteractiveButton label="Ver proyectos" onActivate={() => go('work')} />
                  <StandInteractiveButton label="Hablemos" variant="ghost" onActivate={() => go('social')} />
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="showcase-stage">
            <VideoShowcase ref={videoShowcaseRef} activeIndex={showcaseIndex} />
          </div>

          <div className="showcase-meta"><span>ASUNCIÓN · PARAGUAY</span><span>0{showcaseIndex + 1} / 03</span></div>

          <div className="showcase-dots" aria-label="Seleccionar presentación">
            {showcase.map((item, index) => (
              <button
                key={item.video}
                className={index === showcaseIndex ? 'active' : ''}
                onClick={() => { setShowcaseDirection(index > showcaseIndex ? 1 : -1); setShowcaseIndex(index); }}
                aria-label={`Mostrar presentación ${index + 1}`}
              />
            ))}
          </div>

          <div className="showcase-scroll-hint">
            <span>{showcaseIndex === showcase.length - 1 ? 'SCROLL PARA CONTINUAR' : 'SCROLL PARA EXPLORAR'}</span>
            <div className="scroll-line"><span /></div>
          </div>
          </div>
        </section>

        <section id="statement" className="statement section" data-header-theme="light">
          <InteractiveStatement />
          <div className="section-label">01 — IDEA</div>
          <div className="statement-content">
            <p className="big-copy">No hacemos solamente stands. <span>Diseñamos el espacio donde una marca se encuentra con las personas.</span></p>
            <p className="muted-copy">Cada proyecto parte de la marca, del producto, del evento y de la experiencia que queremos provocar. La arquitectura viene antes que el adorno.</p>
          </div>
        </section>

        <div
          className="services-projects-interactive"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            event.currentTarget.style.setProperty('--shared-mouse-x', `${x}%`);
            event.currentTarget.style.setProperty('--shared-mouse-y', `${y}%`);
          }}
        >
          <section id="services" className="services section" data-header-theme="dark">
            <div className="section-label">02 — SERVICIOS</div>
            <div className="section-heading"><h2>Del concepto<br /><em>a la realidad.</em></h2><p>Un equipo para pensar, construir y entregar el espacio completo.</p></div>
            <div className="service-grid">
              {services.map(({ number, title, text, icon: Icon }) => (
                <motion.article
                  key={number}
                  className="service-card"
                  whileHover={{ y: -8 }}
                  transition={{ duration: .25 }}
                  onPointerMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
                    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
                  }}
                >
                  <div className="service-top"><span>{number}</span><Icon size={21} strokeWidth={1.5} /></div>
                  <h3>{title}</h3><p>{text}</p><span className="service-action-label"></span>
                </motion.article>
              ))}
            </div>
          </section>

          <ProjectTransformationGallery />
        </div>

        <section
          id="process"
          className="process section"
          data-header-theme="light"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            event.currentTarget.style.setProperty('--process-mouse-x', `${x}%`);
            event.currentTarget.style.setProperty('--process-mouse-y', `${y}%`);
          }}
        >
          <div className="section-label">04 — PROCESO</div>
          <div className="process-layout">
            <div className="process-intro">
              <div className="process-architecture" aria-hidden="true">
                <span className="process-arch-plane process-arch-plane-one" />
                <span className="process-arch-plane process-arch-plane-two" />
                <span className="process-arch-line process-arch-line-one" />
                <span className="process-arch-line process-arch-line-two" />
                <span className="process-arch-line process-arch-line-three" />
                <span className="process-arch-grid" />
                <span className="process-arch-number"></span>
              </div>
              <div className="process-intro-content">
                <h2>Una idea.<br /><em>Cinco etapas.</em></h2>
                <p className="muted-copy">Diseñamos pensando en cómo se va a construir. Eso cambia todo.</p>
                <div className="process-stage-description">
                  <span>{['ENTENDER', 'CONCEPTUALIZAR', 'DISEÑAR', 'FABRICAR', 'MONTAR'][processActive]}</span>
                  <p>{[
                    'Analizamos la marca, el producto, el público y el contexto del evento.',
                    'Convertimos la identidad de la marca en una idea espacial concreta.',
                    'Desarrollamos recorridos, proporciones, materiales y puntos de contacto.',
                    'Transformamos el diseño en piezas reales, listas para construir.',
                    'Coordinamos instalación, gráfica, detalles y entrega final del espacio.'
                  ][processActive]}</p>
                </div>
              </div>
            </div>

            <div className="process-list" role="list">
              {['Entender la marca', 'Crear el concepto', 'Diseñar el espacio', 'Fabricar cada pieza', 'Montar y entregar'].map((item, i) => (
                <div
                  className={`process-item ${processActive === i ? 'is-active' : ''}`}
                  key={item}
                  role="listitem"
                  tabIndex={0}
                  onMouseEnter={() => setProcessActive(i)}
                  onFocus={() => setProcessActive(i)}
                  onClick={() => setProcessActive(i)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setProcessActive(i);
                    }
                  }}
                >
                  <span>0{i + 1}</span>
                  <strong>{item}</strong>
                  <small>{['Marca', 'Concepto', 'Espacio', 'Producción', 'Entrega'][i]}</small>
                  <i aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="viewer"
          className="viewer-promo section"
          data-header-theme="dark"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            const shiftX = (x - 50) * 0.12;
            const shiftY = (y - 50) * 0.08;

            event.currentTarget.style.setProperty('--viewer-mouse-x', `${x}%`);
            event.currentTarget.style.setProperty('--viewer-mouse-y', `${y}%`);
            event.currentTarget.style.setProperty('--viewer-shift-x', `${shiftX}px`);
            event.currentTarget.style.setProperty('--viewer-shift-y', `${shiftY}px`);
          }}
        >
          <div className="viewer-card">
            <div className="viewer-interactive-bg" aria-hidden="true">
              <span className="viewer-architectural-grid" />
              <span className="viewer-architectural-plane viewer-plane-one" />
              <span className="viewer-architectural-plane viewer-plane-two" />
              <span className="viewer-architectural-plane viewer-plane-three" />
              <span className="viewer-architectural-line viewer-line-one" />
              <span className="viewer-architectural-line viewer-line-two" />
              <span className="viewer-architectural-line viewer-line-three" />
            </div>
            <div className="viewer-glow" />
            <div className="viewer-copy"><p className="eyebrow">UNIVERSAL STAND VIEWER</p><h2>Tu stand no tiene que esperar al evento para existir.</h2><p>Presentamos los proyectos en 3D para que el cliente pueda recorrerlos, explorar elementos y entender el espacio antes de fabricarlo.</p><StandInteractiveButton label="Explorar demo" className="viewer-stand-button" href={VIEWER_URL} /></div>
            <div className="viewer-orbit"><div className="orbit-ring r1" /><div className="orbit-ring r2" /><div className="orbit-box" /></div>
          </div>
        </section>

        <section
          id="social"
          className="social-contact section"
          data-header-theme="dark"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty('--social-x', `${event.clientX - rect.left}px`);
            event.currentTarget.style.setProperty('--social-y', `${event.clientY - rect.top}px`);
          }}
        >
          <div className="social-contact-bg" aria-hidden="true">
            <span className="social-orb social-orb-one" />
            <span className="social-orb social-orb-two" />
            <span className="social-grid-lines" />
          </div>

          <div className="section-label social-section-label">06 — CONECTEMOS</div>

          <div className="contact-hero">
            <div className="contact-brand-block">
              <img
                src="/images/universal-white.png"
                alt="Universal Group"
                className="contact-brand-logo"
              />
              <p className="eyebrow">UNIVERSAL GROUP · PARAGUAY</p>
              <h2>Hablemos de tu<br /><em>próximo espacio.</em></h2>
              <p className="contact-hero-copy">
                Diseñamos, fabricamos y montamos espacios para marcas que necesitan
                presencia, identidad y una ejecución real.
              </p>
            </div>

            <div className="contact-details">
              <div className="contact-detail">
                <span className="contact-detail-index">01</span>
                <div>
                  <small>UBICACIÓN</small>
                  <strong>Patricio Escobar<br />Lambaré, Paraguay</strong>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Universal+Group+Stands%2C+Patricio+Escobar%2C+Lambar%C3%A9%2C+Paraguay"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              </div>

              <div className="contact-detail">
                <span className="contact-detail-index">02</span>
                <div>
                  <small>WHATSAPP / TELÉFONO</small>
                  <strong>+595 991 549 500</strong>
                  <a
                    href="https://wa.me/595991549500"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Escribir por WhatsApp
                  </a>
                </div>
              </div>

              <div className="contact-detail">
                <span className="contact-detail-index">03</span>
                <div>
                  <small>HORARIO</small>
                  <strong>Lunes a viernes<br />07:30 — 18:00</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-actions">
            <a
              className="contact-action contact-action-primary"
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              <span>01</span>
              <strong>Hablemos por WhatsApp</strong>
              <small>Consultá por tu próximo stand</small>
            </a>

            <a
              className="contact-action"
              href={socialLinks.instagram}
              target="_blank"
              rel="noreferrer"
            >
              <span>02</span>
              <strong>Instagram</strong>
              <small>Proyectos · Montajes · Procesos</small>
            </a>

            <a
              className="contact-action"
              href={socialLinks.facebook}
              target="_blank"
              rel="noreferrer"
            >
              <span>03</span>
              <strong>Facebook</strong>
              <small>Noticias y publicaciones</small>
            </a>
          </div>

          <div className="contact-map-row">
            <div className="contact-map-copy">
              <span className="contact-detail-index">VISITANOS</span>
              <h3>Estamos en<br /><em>Lambaré.</em></h3>
              <p>Encontrá nuestra ubicación y planificá tu visita directamente desde Google Maps.</p>
              <a
                className="contact-map-link"
                href="https://www.google.com/maps/search/?api=1&query=Universal+Group+Stands%2C+Patricio+Escobar%2C+Lambar%C3%A9%2C+Paraguay"
                target="_blank"
                rel="noreferrer"
              >
                Ver ubicación en Google Maps
              </a>
            </div>

            <div className="contact-map-card contact-google-map">
              <iframe
                title="Ubicación de Universal Group - Stands"
                src="https://www.google.com/maps?q=Universal%20Group%20-%20Stands%2C%20Patricio%20Escobar%2C%20Lambar%C3%A9%2C%20Paraguay&output=embed"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

        </section>
      </main>

      <footer className="footer">
        <div className="brand footer-brand">
          <img src="/images/universal-white.png" alt="Universal Group" />
        </div>
        <span>STANDS · EVENTOS · EXPERIENCIAS</span>
        <span>© 2026 Universal Group</span>
      </footer>
      </div>
    </>
  );
}

export default App;
