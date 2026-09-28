import React, { useEffect, useRef } from 'react';

export default function InteractiveStatement() {
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const targetRef = useRef({ x: -1000, y: -1000, active: false });
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      targetRef.current.x = event.clientX - rect.left;
      targetRef.current.y = event.clientY - rect.top;
      targetRef.current.active = true;
    };

    const onPointerLeave = () => {
      targetRef.current.active = false;
    };

    const onMotionChange = (event) => {
      reducedMotion = event.matches;
    };

    resize();
    window.addEventListener('resize', resize);
    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', onPointerLeave, { passive: true });

    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motionQuery?.addEventListener?.('change', onMotionChange);

    const draw = (time) => {
      const pointer = pointerRef.current;
      const target = targetRef.current;
      const blend = reducedMotion ? 0.035 : 0.11;

      pointer.x += (target.x - pointer.x) * blend;
      pointer.y += (target.y - pointer.y) * blend;
      pointer.active = target.active;

      ctx.clearRect(0, 0, width, height);

      const base = height * 0.5;
      const spacing = Math.max(18, height / 34);
      const t = time * 0.00035;
      const px = pointer.x;
      const py = pointer.y;

      // The lines intentionally occupy the complete white field.
      // The pointer creates a broad red deformation rather than a small hotspot.
      for (let i = -18; i <= 18; i += 1) {
        const y0 = base + i * spacing;
        ctx.beginPath();

        for (let x = -30; x <= width + 30; x += 12) {
          const distance = Math.hypot(x - px, y0 - py);
          const influence = pointer.active ? Math.exp(-(distance * distance) / 105000) : 0;
          const wave = Math.sin(x * 0.011 + i * 0.52 + t * (1 + (i % 3) * 0.18)) * (5 + Math.abs(i) * 0.18);
          const mouseWave = influence * Math.sin(distance * 0.055 - t * 2.0) * 42;
          const verticalPull = pointer.active ? influence * (py - y0) * 0.22 : 0;
          const y = y0 + wave + mouseWave + verticalPull;

          if (x === -30) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = `rgba(226, 27, 35, ${0.045 + (18 - Math.abs(i)) * 0.0085})`;
        ctx.lineWidth = i % 4 === 0 ? 1.35 : 0.85;
        ctx.stroke();
      }

      if (pointer.active) {
        for (let ring = 0; ring < 3; ring += 1) {
          const radius = 55 + ring * 42 + ((time * 0.035) % 42);
          const alpha = Math.max(0, 0.075 - ring * 0.018);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(226,27,35,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        const ripple = 260 + Math.sin(time * 0.0025) * 35;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, ripple);
        gradient.addColorStop(0, 'rgba(226,27,35,.10)');
        gradient.addColorStop(0.55, 'rgba(226,27,35,.035)');
        gradient.addColorStop(1, 'rgba(226,27,35,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(px - ripple, py - ripple, ripple * 2, ripple * 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
      motionQuery?.removeEventListener?.('change', onMotionChange);
    };
  }, []);

  return (
    <div ref={sectionRef} className="statement-interactive-bg" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="statement-interactive-vignette" />
    </div>
  );
}
