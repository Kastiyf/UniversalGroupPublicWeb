import React, { useEffect, useRef } from "react";

const STYLE_ID = "stand-interactive-button-architectural-style";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .stand-interactive-button {
      --mx: 0;
      --my: 0;
      --tilt-x: 0deg;
      --tilt-y: 0deg;
      --accent: #e3262e;
      --ink: #090909;
      position: relative;
      isolation: isolate;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 210px;
      min-height: 58px;
      padding: 0 30px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 14px;
      background: #090909;
      color: #fff;
      text-decoration: none;
      cursor: pointer;
      transform: translateZ(0);
      transition:
        border-color .45s cubic-bezier(.22,1,.36,1),
        background-color .45s cubic-bezier(.22,1,.36,1),
        transform .55s cubic-bezier(.22,1,.36,1);
    }

    .stand-interactive-button,
    .stand-interactive-button * {
      box-sizing: border-box;
    }

    .stand-interactive-button:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 4px;
    }

    .stand-interactive-button__architecture {
      position: absolute;
      inset: -28%;
      z-index: -2;
      pointer-events: none;
      transform:
        translate3d(calc(var(--mx) * 8px), calc(var(--my) * 6px), 0)
        rotateX(var(--tilt-x))
        rotateY(var(--tilt-y))
        scale(1.02);
      transform-style: preserve-3d;
      transition:
        transform .7s cubic-bezier(.22,1,.36,1),
        opacity .5s ease;
      opacity: .72;
    }

    .stand-interactive-button__plane {
      position: absolute;
      border: 1px solid rgba(227,38,46,.7);
      background:
        linear-gradient(135deg,
          rgba(227,38,46,.16),
          rgba(227,38,46,.025) 48%,
          rgba(255,255,255,.04));
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.035),
        0 0 32px rgba(227,38,46,.06);
      transition:
        transform .8s cubic-bezier(.22,1,.36,1),
        opacity .7s ease;
    }

    .stand-interactive-button__plane--back {
      width: 54%;
      height: 70%;
      right: 3%;
      top: 15%;
      transform:
        perspective(500px)
        rotateY(-25deg)
        skewY(-2deg)
        translate3d(18px, 2px, -30px);
      opacity: .35;
    }

    .stand-interactive-button__plane--middle {
      width: 46%;
      height: 82%;
      right: 25%;
      top: 9%;
      transform:
        perspective(500px)
        rotateY(-13deg)
        skewY(1deg)
        translate3d(34px, 0, 0);
      opacity: .55;
    }

    .stand-interactive-button__plane--front {
      width: 35%;
      height: 92%;
      right: 48%;
      top: 4%;
      transform:
        perspective(500px)
        rotateY(4deg)
        skewY(1deg)
        translate3d(48px, 0, 35px);
      opacity: .22;
    }

    .stand-interactive-button__line {
      position: absolute;
      display: block;
      height: 1px;
      transform-origin: left center;
      background: linear-gradient(
        90deg,
        rgba(227,38,46,0),
        rgba(227,38,46,.85) 20%,
        rgba(255,255,255,.5) 68%,
        rgba(255,255,255,0)
      );
      opacity: .3;
      transition:
        transform .8s cubic-bezier(.22,1,.36,1),
        opacity .6s ease;
    }

    .stand-interactive-button__line--one {
      width: 74%;
      left: 3%;
      top: 28%;
      transform: rotate(-11deg) translateX(-35px);
    }

    .stand-interactive-button__line--two {
      width: 62%;
      left: 28%;
      top: 70%;
      transform: rotate(-8deg) translateX(40px);
    }

    .stand-interactive-button__line--three {
      width: 46%;
      left: 45%;
      top: 48%;
      transform: rotate(90deg) translateX(25px);
      transform-origin: center;
      opacity: .18;
    }

    .stand-interactive-button__corner {
      position: absolute;
      width: 18px;
      height: 18px;
      border-color: rgba(255,255,255,.62);
      border-style: solid;
      opacity: .18;
      transition:
        opacity .5s ease,
        transform .7s cubic-bezier(.22,1,.36,1);
    }

    .stand-interactive-button__corner--tl {
      left: 14px;
      top: 12px;
      border-width: 1px 0 0 1px;
      transform: translate(-8px,-8px);
    }

    .stand-interactive-button__corner--br {
      right: 14px;
      bottom: 12px;
      border-width: 0 1px 1px 0;
      transform: translate(8px,8px);
    }

    .stand-interactive-button__red-plane {
      position: absolute;
      z-index: -1;
      width: 48%;
      height: 180%;
      right: -25%;
      top: -40%;
      background: linear-gradient(
        135deg,
        rgba(227,38,46,.92),
        rgba(227,38,46,.56) 52%,
        rgba(227,38,46,.08)
      );
      transform: skewX(-23deg) translateX(85%);
      transition:
        transform .8s cubic-bezier(.22,1,.36,1),
        opacity .7s ease;
      opacity: .45;
    }

    .stand-interactive-button__grid {
      position: absolute;
      inset: 0;
      opacity: 0;
      background-image:
        linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px);
      background-size: 18px 18px;
      mask-image: linear-gradient(90deg, transparent 0%, #000 48%, transparent 100%);
      -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 48%, transparent 100%);
      transform: translateX(35%);
      transition:
        opacity .6s ease,
        transform .9s cubic-bezier(.22,1,.36,1);
      pointer-events: none;
    }

    .stand-interactive-button__content {
      position: relative;
      z-index: 5;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: inherit;
      white-space: nowrap;
      transform: translate3d(0,0,0);
      transition:
        transform .55s cubic-bezier(.22,1,.36,1),
        letter-spacing .55s cubic-bezier(.22,1,.36,1);
    }

    .stand-interactive-button__label {
      position: relative;
      z-index: 2;
      font: inherit;
      font-weight: 600;
      letter-spacing: .02em;
      transition: color .45s ease;
    }

    .stand-interactive-button:hover {
      border-color: rgba(227,38,46,.82);
      background: #0b0b0b;
      transform: translateY(-2px);
    }

    .stand-interactive-button:hover .stand-interactive-button__architecture {
      opacity: 1;
      transform:
        translate3d(calc(var(--mx) * 14px), calc(var(--my) * 10px), 0)
        rotateX(var(--tilt-x))
        rotateY(var(--tilt-y))
        scale(1.06);
    }

    .stand-interactive-button:hover .stand-interactive-button__plane--back {
      transform:
        perspective(500px)
        rotateY(-25deg)
        skewY(-2deg)
        translate3d(2px, -2px, -30px);
      opacity: .72;
    }

    .stand-interactive-button:hover .stand-interactive-button__plane--middle {
      transform:
        perspective(500px)
        rotateY(-13deg)
        skewY(1deg)
        translate3d(5px, -2px, 0);
      opacity: .88;
    }

    .stand-interactive-button:hover .stand-interactive-button__plane--front {
      transform:
        perspective(500px)
        rotateY(4deg)
        skewY(1deg)
        translate3d(2px, 0, 35px);
      opacity: .5;
    }

    .stand-interactive-button:hover .stand-interactive-button__red-plane {
      transform: skewX(-23deg) translateX(18%);
      opacity: .78;
    }

    .stand-interactive-button:hover .stand-interactive-button__grid {
      opacity: .48;
      transform: translateX(0);
    }

    .stand-interactive-button:hover .stand-interactive-button__line--one {
      transform: rotate(-11deg) translateX(0);
      opacity: .75;
    }

    .stand-interactive-button:hover .stand-interactive-button__line--two {
      transform: rotate(-8deg) translateX(0);
      opacity: .7;
    }

    .stand-interactive-button:hover .stand-interactive-button__line--three {
      transform: rotate(90deg) translateX(0);
      opacity: .38;
    }

    .stand-interactive-button:hover .stand-interactive-button__corner {
      opacity: .75;
      transform: translate(0,0);
    }

    .stand-interactive-button:hover .stand-interactive-button__content {
      transform: translate3d(calc(var(--mx) * 3px), calc(var(--my) * 2px), 0);
      letter-spacing: .045em;
    }

    .stand-interactive-button:active {
      transform: translateY(0) scale(.985);
    }

    @media (prefers-reduced-motion: reduce) {
      .stand-interactive-button,
      .stand-interactive-button *,
      .stand-interactive-button::before,
      .stand-interactive-button::after {
        transition: none !important;
        animation: none !important;
      }
    }

    @media (max-width: 640px) {
      .stand-interactive-button {
        min-width: 190px;
        min-height: 54px;
        padding: 0 24px;
      }

      .stand-interactive-button__architecture {
        opacity: .55;
      }
    }
  `;

  document.head.appendChild(style);
}

export default function StandInteractiveButton({
  label,
  href,
  onActivate,
  variant = "primary",
  className = "",
  disabled = false,
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    injectStyles();

    const element = ref.current;
    if (!element) return;

    const handlePointerMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      const mx = (x - 0.5) * 2;
      const my = (y - 0.5) * 2;

      element.style.setProperty("--mx", mx.toFixed(3));
      element.style.setProperty("--my", my.toFixed(3));
      element.style.setProperty("--tilt-y", `${(mx * 2.2).toFixed(2)}deg`);
      element.style.setProperty("--tilt-x", `${(-my * 1.8).toFixed(2)}deg`);
    };

    const resetPointer = () => {
      element.style.setProperty("--mx", "0");
      element.style.setProperty("--my", "0");
      element.style.setProperty("--tilt-x", "0deg");
      element.style.setProperty("--tilt-y", "0deg");
    };

    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", resetPointer);

    return () => {
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  const handleClick = (event) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (onActivate) {
      onActivate(event);
    }
  };

  const classes = [
    "stand-interactive-button",
    `stand-interactive-button--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="stand-interactive-button__architecture" aria-hidden="true">
        <span className="stand-interactive-button__plane stand-interactive-button__plane--back" />
        <span className="stand-interactive-button__plane stand-interactive-button__plane--middle" />
        <span className="stand-interactive-button__plane stand-interactive-button__plane--front" />

        <span className="stand-interactive-button__line stand-interactive-button__line--one" />
        <span className="stand-interactive-button__line stand-interactive-button__line--two" />
        <span className="stand-interactive-button__line stand-interactive-button__line--three" />

        <span className="stand-interactive-button__corner stand-interactive-button__corner--tl" />
        <span className="stand-interactive-button__corner stand-interactive-button__corner--br" />
      </span>

      <span className="stand-interactive-button__red-plane" aria-hidden="true" />
      <span className="stand-interactive-button__grid" aria-hidden="true" />

      <span className="stand-interactive-button__content">
        <span className="stand-interactive-button__label">{label}</span>
      </span>
    </>
  );

  if (href) {
    return (
      <a
        ref={ref}
        href={disabled ? undefined : href}
        className={classes}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      className={classes}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {content}
    </button>
  );
}
