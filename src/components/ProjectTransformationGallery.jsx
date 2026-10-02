import React, { useState } from 'react';
import { motion } from 'framer-motion';

const projects = [
  {
    client: 'FilZon',
    slug: 'filzon',
    event: 'Stand ejecutado',
    size: 'Proyecto real',
    tag: 'Arquitectura de marca',
    line: '/images/projects/filzon-line.png',
    real: '/images/projects/filzon-real.png'
  },
  {
    client: 'DG Equipamientos',
    slug: 'dg-equipamientos',
    event: 'Stand ejecutado',
    size: 'Proyecto real',
    tag: 'Espacio corporativo',
    line: '/images/projects/dg-line.png',
    real: '/images/projects/dg-real.png'
  },
  {
    client: 'SPN 2026',
    slug: 'spn-2026',
    event: 'Congreso 2026',
    size: 'Proyecto real',
    tag: 'Experiencia de evento',
    line: '/images/projects/spn-line.png',
    real: '/images/projects/spn-real.png'
  },
  {
    client: 'Simpex + Ziehl-Abegg',
    slug: 'simpex-ziehl-abegg',
    event: 'Stand ejecutado',
    size: 'Proyecto real',
    tag: 'Espacio corporativo',
    line: '/images/projects/simpex-line.png',
    real: '/images/projects/simpex-real.png'
  }
];

function ProjectRevealCard({ project, index }) {
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  };

  const maskStyle = {
    '--reveal-x': `${point.x}%`,
    '--reveal-y': `${point.y}%`
  };

  return (
    <motion.article
      className={`project-card p${index + 1} project-reveal-card`}
      whileHover={{ scale: 0.985 }}
    >
      <div
        className={`project-image project-reveal-image ${hovered ? 'is-hovered' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMove}
      >
        <img
          src={project.line}
          alt={`${project.client} - dibujo arquitectónico`}
          className="project-reveal-layer project-reveal-line"
          draggable="false"
        />
        <img
          src={project.real}
          alt={`${project.client} - proyecto construido`}
          className="project-reveal-layer project-reveal-real"
          style={maskStyle}
          draggable="false"
        />
        <div className="project-reveal-vignette" />
        <div
          className="project-reveal-cursor"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <span>DRAWING</span>
        </div>
        <div className="project-reveal-index">{String(index + 1).padStart(2, '0')}</div>
      </div>

      <div className="project-info">
        <div>
          <p>{project.tag}</p>
          <h3>{project.client}</h3>
        </div>
        <div className="project-meta">
          <span>{project.event}</span>
          <span>{project.size}</span>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProjectTransformationGallery() {
  return (
    <section
      id="work"
      className="work section project-reveal-gallery"
      data-header-theme="dark"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        event.currentTarget.style.setProperty('--projects-mouse-x', `${x}%`);
        event.currentTarget.style.setProperty('--projects-mouse-y', `${y}%`);
      }}
    >
      <div className="section-label">03 — PROYECTOS</div>
      <div className="section-heading row">
        <h2>Trabajo real.<br /><em>Espacios reales.</em></h2>
        <p>Del dibujo a la construcción. Mové el cursor sobre cada proyecto para descubrir la arquitectura que hay debajo.</p>
      </div>

      <div className="project-grid project-reveal-grid">
        {projects.map((project, index) => (
          <ProjectRevealCard
            key={project.client}
            project={project}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
