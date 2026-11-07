/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

// Fireworks Particle and Rocket Types
interface SkyRocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
  friction: number;
  twinkle: boolean;
  history: { x: number; y: number }[];
}

interface HeartParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  initialX: number;
  color: string;
}

const OPEN_ME_LETTERS = ['O', 'p', 'e', 'n', ' ', 'M', 'e'];

export default function App() {
  // Heading typing state: "Happy Birthday Diiiiiiii" above the envelope
  const [headingText, setHeadingText] = useState('');
  const [isHeadingTyping, setIsHeadingTyping] = useState(true);

  // Date sequence state (displayed directly below the envelope, starts after heading finishes)
  const [datePhase, setDatePhase] = useState<'idle' | 'left-typing' | 'arrow-growing' | 'right-typing' | 'done'>('idle');
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  const [arrowProgress, setArrowProgress] = useState(0);
  const [showArrowHead, setShowArrowHead] = useState(false);
  const [arrowLength, setArrowLength] = useState(650);

  // Envelope interactive opening stages:
  const [envelopeStage, setEnvelopeStage] = useState<
    | 'idle'
    | 'heart-flying'
    | 'text-scattering'
    | 'unfolding-top'
    | 'unfolding-right'
    | 'unfolding-bottom'
    | 'unfolding-left'
    | 'unfolded'
    | 'letter-emerging'
    | 'letter-opened'
  >('idle');

  // Background transition: Fireworks fading out and Hearts fading in
  const [startHeartsAnimation, setStartHeartsAnimation] = useState(false);
  const [fireworksFadingOut, setFireworksFadingOut] = useState(false);

  // Individual flap unfolding states
  const [isTopUnfolded, setIsTopUnfolded] = useState(false);
  const [isRightUnfolded, setIsRightUnfolded] = useState(false);
  const [isBottomUnfolded, setIsBottomUnfolded] = useState(false);
  const [isLeftUnfolded, setIsLeftUnfolded] = useState(false);

  // "More Wonders" button visibility (only when user scrolls to bottom of letter)
  const [showMoreWondersBtn, setShowMoreWondersBtn] = useState(false);

  // Monkey surprise states: 'hidden' | 'zooming' | 'zoomed'
  const [monkeyStage, setMonkeyStage] = useState<'hidden' | 'zooming' | 'zoomed'>('hidden');
  const [showMonkeyText, setShowMonkeyText] = useState(false);

  const arrowPathRef = useRef<SVGPathElement | null>(null);
  const letterScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heartsCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fireworksActiveRef = useRef(true);
  const stopFireworksRef = useRef(false);

  // Generate unique scatter vectors for the 7 characters in "Open Me"
  const openMeScatterData = useMemo(() => {
    return [
      { x: -500, y: -380, rot: -180, duration: 800 },
      { x: -350, y: -450, rot: 220, duration: 850 },
      { x: -220, y: 380, rot: -260, duration: 820 },
      { x: -100, y: 460, rot: 190, duration: 870 },
      { x: 0, y: 0, rot: 0, duration: 0 },
      { x: 260, y: -420, rot: 240, duration: 860 },
      { x: 480, y: 350, rot: -210, duration: 840 },
    ];
  }, []);

  // Measure SVG path length dynamically for curly arrow
  useEffect(() => {
    if (arrowPathRef.current) {
      const len = arrowPathRef.current.getTotalLength();
      if (len > 0) {
        setArrowLength(len);
      }
    }
  }, []);

  // 1. Heading typing animation: "Happy Birthday Diiiiiiii" above the envelope (60% speed)
  useEffect(() => {
    const fullHeading = 'Happy Birthday Diiiiiiii';
    let currentIndex = 0;
    setHeadingText('');

    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        currentIndex++;
        setHeadingText(fullHeading.slice(0, currentIndex));
        if (currentIndex >= fullHeading.length) {
          clearInterval(interval);
          setIsHeadingTyping(false);
          setTimeout(() => {
            setDatePhase('left-typing');
          }, 350);
        }
      }, 155);

      return () => clearInterval(interval);
    }, 400);

    return () => clearTimeout(startTimer);
  }, []);

  // 2. Typing animation for left date: "Nov 15 2008" directly below envelope
  useEffect(() => {
    if (datePhase !== 'left-typing') return;

    const fullText = 'Nov 15 2008';
    let currentIndex = 0;
    setLeftText('');

    const interval = setInterval(() => {
      currentIndex++;
      setLeftText(fullText.slice(0, currentIndex));
      if (currentIndex >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          setDatePhase('arrow-growing');
        }, 350);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [datePhase]);

  // 3. Clumsy & curly growing arrow animation below envelope
  useEffect(() => {
    if (datePhase !== 'arrow-growing') return;

    let startTime: number | null = null;
    const duration = 2200;
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const linearProgress = Math.min(1, elapsed / duration);

      const stutter =
        Math.sin(linearProgress * Math.PI * 6) * 0.03 * (1 - linearProgress);
      const clumsy = Math.min(1, Math.max(0, Math.pow(linearProgress, 1.1) + stutter));

      setArrowProgress(clumsy);

      if (linearProgress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setArrowProgress(1);
        setShowArrowHead(true);
        setTimeout(() => {
          setDatePhase('right-typing');
        }, 300);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [datePhase]);

  // 4. Typing animation for right date: "Nov 15 2026" below envelope
  useEffect(() => {
    if (datePhase !== 'right-typing') return;

    const fullText = 'Nov 15 2026';
    let currentIndex = 0;
    setRightText('');

    const interval = setInterval(() => {
      currentIndex++;
      setRightText(fullText.slice(0, currentIndex));
      if (currentIndex >= fullText.length) {
        clearInterval(interval);
        setDatePhase('done');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [datePhase]);

  // User Clicks "Open Me" -> Trigger Heart Flying & Seamless Background Transition
  const handleOpenEnvelope = () => {
    if (envelopeStage !== 'idle') return;

    setEnvelopeStage('heart-flying');
    setFireworksFadingOut(true);
    setStartHeartsAnimation(true);

    setTimeout(() => {
      stopFireworksRef.current = true;
    }, 1800);

    setTimeout(() => {
      setEnvelopeStage('text-scattering');

      setTimeout(() => {
        setEnvelopeStage('unfolding-top');
        setIsTopUnfolded(true);

        setTimeout(() => {
          setEnvelopeStage('unfolding-right');
          setIsRightUnfolded(true);

          setTimeout(() => {
            setEnvelopeStage('unfolding-bottom');
            setIsBottomUnfolded(true);

            setTimeout(() => {
              setEnvelopeStage('unfolding-left');
              setIsLeftUnfolded(true);

              setTimeout(() => {
                setEnvelopeStage('unfolded');

                setTimeout(() => {
                  setEnvelopeStage('letter-emerging');

                  setTimeout(() => {
                    setEnvelopeStage('letter-opened');
                  }, 1200);
                }, 400);
              }, 600);
            }, 600);
          }, 600);
        }, 600);
      }, 950);
    }, 1100);
  };

  // Scroll detection on letter: Detect when user reaches the very bottom
  const handleLetterScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 35) {
      setShowMoreWondersBtn(true);
    }
  };

  // IntersectionObserver for robust bottom detection
  useEffect(() => {
    if (envelopeStage !== 'letter-opened') return;
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowMoreWondersBtn(true);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [envelopeStage]);

  // Click "More Wonders" -> Stop all background animations, launch funny monkey surprise
  const handleMoreWondersClick = () => {
    // 1. Stop all background animations completely
    setStartHeartsAnimation(false);
    setFireworksFadingOut(true);
    stopFireworksRef.current = true;

    // Clear any canvas context immediately
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (heartsCanvasRef.current) {
      const ctx = heartsCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, heartsCanvasRef.current.width, heartsCanvasRef.current.height);
    }

    // 2. Hide envelope & letter, initiate monkey zoom-in
    setEnvelopeStage('idle'); // Clears the letter
    setMonkeyStage('zooming');

    // After smooth zoom-in completes (~2.4s), display text below it
    setTimeout(() => {
      setMonkeyStage('zoomed');
      setShowMonkeyText(true);
    }, 2400);
  };

  // Background 50% Opacity Floating Hearts Engine
  useEffect(() => {
    if (!startHeartsAnimation) return;

    const canvas = heartsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animId: number;
    const hearts: HeartParticle[] = [];
    const heartColors = [
      '#FF4D6D', '#FF758F', '#FF8FA3', '#FFB3C1', '#F43F5E', '#EC4899', '#FDA4AF', '#F472B6',
    ];

    const spawnHeart = () => {
      const size = Math.random() * 24 + 14;
      const initialX = Math.random() * canvas.width;
      hearts.push({
        x: initialX,
        y: canvas.height + size + 10,
        size,
        speedY: Math.random() * 1.6 + 1.2,
        wobbleSpeed: Math.random() * 0.03 + 0.015,
        wobbleAmp: Math.random() * 26 + 10,
        initialX,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
      });
    };

    for (let i = 0; i < 20; i++) {
      spawnHeart();
      hearts[i].y = Math.random() * canvas.height;
    }

    const drawHeart = (cx: number, cy: number, size: number, color: string) => {
      ctx.save();
      ctx.globalAlpha = 0.5; // Exactly 50% opacity requirement
      ctx.fillStyle = color;
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(cx, cy + topCurveHeight);
      ctx.bezierCurveTo(
        cx, cy,
        cx - size / 2, cy,
        cx - size / 2, cy + topCurveHeight
      );
      ctx.bezierCurveTo(
        cx - size / 2, cy + (size + topCurveHeight) / 2,
        cx, cy + (size + topCurveHeight) / 2,
        cx, cy + size
      );
      ctx.bezierCurveTo(
        cx, cy + (size + topCurveHeight) / 2,
        cx + size / 2, cy + (size + topCurveHeight) / 2,
        cx + size / 2, cy + topCurveHeight
      );
      ctx.bezierCurveTo(
        cx + size / 2, cy,
        cx, cy,
        cx, cy + topCurveHeight
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    let tick = 0;
    const renderHearts = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tick++;

      if (tick % 22 === 0 && hearts.length < 40) {
        spawnHeart();
      }

      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        h.y -= h.speedY;
        h.x = h.initialX + Math.sin(tick * h.wobbleSpeed) * h.wobbleAmp;

        drawHeart(h.x, h.y, h.size, h.color);

        if (h.y < -h.size - 25) {
          hearts.splice(i, 1);
          spawnHeart();
        }
      }

      animId = requestAnimationFrame(renderHearts);
    };

    animId = requestAnimationFrame(renderHearts);

    return () => cancelAnimationFrame(animId);
  }, [startHeartsAnimation]);

  // Fireworks Canvas Engine (Active until "Open Me" is clicked or "More Wonders" is clicked)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rockets: SkyRocket[] = [];
    let particles: Particle[] = [];
    let lastLaunchTime = 0;

    const colors = [
      '#FFD700', '#FF69B4', '#00FFFF', '#FF4500', '#BA55D3',
      '#7CFC00', '#FF1493', '#FFFFFF', '#FFA500', '#00FA9A', '#E0B0FF',
    ];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const createExplosion = (x: number, y: number, baseColor: string) => {
      const count = Math.floor(Math.random() * 30) + 70;
      const palette = [baseColor, colors[Math.floor(Math.random() * colors.length)], '#FFFFFF'];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: palette[Math.floor(Math.random() * palette.length)],
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01,
          size: Math.random() * 2.5 + 1.2,
          gravity: 0.05,
          friction: 0.975,
          twinkle: Math.random() > 0.4,
          history: [],
        });
      }
    };

    const launchRocket = (forcedX?: number) => {
      const x =
        forcedX !== undefined
          ? forcedX
          : Math.random() * (canvas.width * 0.7) + canvas.width * 0.15;
      const targetY =
        Math.random() * (canvas.height * 0.42) + canvas.height * 0.12;
      const vy = -(Math.random() * 3.5 + 11.5);
      const vx = (Math.random() - 0.5) * 2;
      const color = colors[Math.floor(Math.random() * colors.length)];

      rockets.push({
        x,
        y: canvas.height,
        targetY,
        vx,
        vy,
        color,
        trail: [],
      });
    };

    let initialBurstDone = false;

    const render = (time: number) => {
      if (stopFireworksRef.current && rockets.length === 0 && particles.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.fillStyle = 'rgba(7, 9, 19, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (fireworksActiveRef.current && !stopFireworksRef.current) {
        if (!initialBurstDone) {
          launchRocket(canvas.width * 0.3);
          launchRocket(canvas.width * 0.5);
          launchRocket(canvas.width * 0.7);
          initialBurstDone = true;
          lastLaunchTime = time;
        }

        if (time - lastLaunchTime > 400 + Math.random() * 450) {
          launchRocket();
          if (Math.random() > 0.65) {
            setTimeout(() => launchRocket(), 120);
          }
          lastLaunchTime = time;
        }
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 5) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.08;

        ctx.beginPath();
        for (let j = 0; j < r.trail.length; j++) {
          const pt = r.trail[j];
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        if (r.y <= r.targetY || r.vy >= -1) {
          createExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 4) p.history.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        for (let j = 0; j < p.history.length; j++) {
          const pt = p.history[j];
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        const displayAlpha =
          p.twinkle && Math.random() > 0.4 ? p.alpha * 0.4 : p.alpha;
        ctx.globalAlpha = displayAlpha;
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const strokeOffset = arrowLength * (1 - arrowProgress);
  const isLetterVisible = envelopeStage === 'letter-emerging' || envelopeStage === 'letter-opened';
  const isOpeningStarted = envelopeStage !== 'idle';
  const isMonkeyActive = monkeyStage !== 'hidden';

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#070913] select-none text-neutral-100"
      style={{ fontFamily: "'Patrick Hand', cursive" }}
    >
      {/* Background Fireworks Canvas */}
      {!isMonkeyActive && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-[1800ms] ease-out"
          style={{ opacity: fireworksFadingOut ? 0 : 1 }}
        />
      )}

      {/* Background 50% Opacity Floating Hearts Canvas */}
      {!isMonkeyActive && (
        <canvas
          ref={heartsCanvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-[1500ms] ease-out"
          style={{ opacity: startHeartsAnimation ? 1 : 0 }}
        />
      )}

      {/* HOMEPAGE MAIN CONTENT: HEADING, ENVELOPE & DATES */}
      {!isMonkeyActive && (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-3 sm:p-4 z-20 pointer-events-none">
          {/* 1. TOP BIRTHDAY HEADING: "Happy Birthday Diiiiiiii" (60% typing speed) */}
          <div
            className={`mb-3 sm:mb-5 md:mb-6 text-center transition-all duration-700 ease-out ${
              isOpeningStarted ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100'
            }`}
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-amber-300 font-bold tracking-wide drop-shadow-[0_2px_18px_rgba(253,224,71,0.5)]">
              {headingText}
              {isHeadingTyping && (
                <span className="inline-block w-2 sm:w-2.5 h-6 sm:h-9 bg-amber-400 ml-1 animate-pulse align-middle" />
              )}
            </h1>
          </div>

          {/* 2. CENTRE: THE PHYSICAL ENVELOPE */}
          <div
            className="relative will-change-transform flex flex-col items-center justify-center pointer-events-auto"
            style={{
              transform: isLetterVisible ? 'scale(0.85) translateY(10px)' : 'scale(1) translateY(0)',
              transition: 'transform 1.35s cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
          >
            {/* 50% Larger Envelope: 630px x 415px on desktop, fully responsive */}
            <div
              onClick={handleOpenEnvelope}
              className={`relative w-[450px] sm:w-[570px] md:w-[630px] h-[300px] sm:h-[375px] md:h-[415px] max-w-[94vw] aspect-[420/280] drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)] filter drop-shadow(0 0 35px rgba(254,243,199,0.18)) ${
                envelopeStage === 'idle' ? 'cursor-pointer group' : ''
              }`}
              style={{ perspective: '1400px' }}
            >
              {/* Envelope Base Box with 3D Flaps */}
              <div className="relative w-full h-full rounded-2xl bg-[#FFFBEB] border-2 border-amber-600/80 shadow-2xl overflow-visible">
                {/* Inner Base Paper Background */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] flex items-center justify-center">
                  <div className="w-[85%] h-[80%] border border-amber-300/60 rounded-lg opacity-40" />
                </div>

                {/* 1. TOP FLAP: Triangular Flap with sharp tip reaching exactly (210, 140) */}
                <div
                  className="absolute top-0 left-0 w-full h-[50%] z-20 will-change-transform"
                  style={{
                    transformOrigin: 'top center',
                    transformStyle: 'preserve-3d',
                    transform: isTopUnfolded ? 'rotateX(-180deg)' : 'rotateX(0deg)',
                    transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <svg viewBox="0 0 420 140" className="w-full h-full overflow-visible" fill="none">
                    <defs>
                      <linearGradient id="flap3dGradM" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="85%" stopColor="#FEF3C7" />
                        <stop offset="100%" stopColor="#FDE68A" />
                      </linearGradient>
                      <filter id="flapSoftShadowM" x="-10%" y="-10%" width="120%" height="140%">
                        <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#78350F" floodOpacity="0.25" />
                      </filter>
                    </defs>
                    <path
                      d="M 4,4 L 210,140 L 416,4 Z"
                      fill="url(#flap3dGradM)"
                      stroke="#D97706"
                      strokeWidth="1.6"
                      filter="url(#flapSoftShadowM)"
                    />
                    <path
                      d="M 8,8 L 210,136 L 412,8"
                      stroke="#FFFFFF"
                      strokeWidth="1.4"
                      opacity="0.8"
                    />
                  </svg>
                </div>

                {/* 2. RIGHT FLAP: Unfolds SECOND */}
                <div
                  className="absolute top-0 right-0 w-[50%] h-full z-14 will-change-transform"
                  style={{
                    transformOrigin: 'right center',
                    transformStyle: 'preserve-3d',
                    transform: isRightUnfolded ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <svg viewBox="0 0 210 280" className="w-full h-full overflow-visible" fill="none">
                    <defs>
                      <linearGradient id="rightFlapGradM" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="100%" stopColor="#FEF3C7" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 206,4 L 0,140 L 206,276 Z"
                      fill="url(#rightFlapGradM)"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                  </svg>
                </div>

                {/* 3. BOTTOM FLAP: Unfolds THIRD */}
                <div
                  className="absolute bottom-0 left-0 w-full h-[50%] z-16 will-change-transform"
                  style={{
                    transformOrigin: 'bottom center',
                    transformStyle: 'preserve-3d',
                    transform: isBottomUnfolded ? 'rotateX(180deg)' : 'rotateX(0deg)',
                    transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <svg viewBox="0 0 420 140" className="w-full h-full overflow-visible" fill="none">
                    <defs>
                      <linearGradient id="bottomFlapGradM" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFBEB" />
                        <stop offset="100%" stopColor="#FDE68A" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 4,136 L 210,0 L 416,136 Z"
                      fill="url(#bottomFlapGradM)"
                      stroke="#D97706"
                      strokeWidth="1.4"
                      filter="drop-shadow(0 -4px 6px rgba(180,83,9,0.18))"
                    />
                  </svg>
                </div>

                {/* 4. LEFT FLAP: Unfolds LAST */}
                <div
                  className="absolute top-0 left-0 w-[50%] h-full z-15 will-change-transform"
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    transform: isLeftUnfolded ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <svg viewBox="0 0 210 280" className="w-full h-full overflow-visible" fill="none">
                    <defs>
                      <linearGradient id="leftFlapGradM" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FDE68A" />
                        <stop offset="100%" stopColor="#FEF3C7" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 4,4 L 210,140 L 4,276 Z"
                      fill="url(#leftFlapGradM)"
                      stroke="#F59E0B"
                      strokeWidth="1.2"
                      opacity="0.95"
                    />
                  </svg>
                </div>

                {/* ENVELOPE HEART POSITION: EXACTLY WHERE THE TWO DIAGONAL EDGES MEET */}
                <div
                  className="absolute top-1/2 left-1/2 z-25 will-change-transform pointer-events-none"
                  style={{
                    transform:
                      envelopeStage === 'idle'
                        ? 'translate(-50%, -50%) scale(1)'
                        : 'translate(-50%, -520px) scale(1.4) rotate(-16deg)',
                    opacity: envelopeStage === 'idle' ? 1 : 0,
                    transition:
                      envelopeStage !== 'idle'
                        ? 'transform 1.1s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)'
                        : 'none',
                  }}
                >
                  <svg
                    viewBox="0 0 80 80"
                    className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 drop-shadow-[0_8px_18px_rgba(136,19,55,0.6)]"
                  >
                    <defs>
                      <radialGradient id="heartSeal3dExactM" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#FF4D6D" />
                        <stop offset="45%" stopColor="#E11D48" />
                        <stop offset="85%" stopColor="#9F1239" />
                        <stop offset="100%" stopColor="#881337" />
                      </radialGradient>
                    </defs>
                    <circle cx="40" cy="40" r="36" fill="#E11D48" opacity="0.95" stroke="#9F1239" strokeWidth="2" />
                    <circle cx="40" cy="40" r="32" fill="url(#heartSeal3dExactM)" stroke="#F43F5E" strokeWidth="1" />
                    <path
                      d="M 40,58 C 40,58 20,44 20,32 C 20,25 26,20 34,20 C 38,20 40,23 40,23 C 40,23 42,20 46,20 C 54,20 60,25 60,32 C 60,44 40,58 40,58 Z"
                      fill="#FFF1F2"
                      stroke="#FFE4E6"
                      strokeWidth="1.5"
                      filter="drop-shadow(0 2px 3px rgba(0,0,0,0.35))"
                    />
                  </svg>
                </div>

                {/* "Open Me" TEXT: Disappears character by character after heart flies away */}
                <div className="absolute bottom-6 sm:bottom-8 inset-x-0 flex items-center justify-center z-25 pointer-events-none">
                  <div className="flex gap-x-1 sm:gap-x-1.5 text-2xl sm:text-3xl md:text-4xl font-bold tracking-wider text-amber-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]">
                    {OPEN_ME_LETTERS.map((char, index) => {
                      const isScatteredChar =
                        envelopeStage !== 'idle' && envelopeStage !== 'heart-flying';
                      const scatterCoord = openMeScatterData[index];

                      return (
                        <span
                          key={index}
                          className="inline-block will-change-transform"
                          style={{
                            transform: isScatteredChar
                              ? `translate3d(${scatterCoord.x}px, ${scatterCoord.y}px, 0) rotate(${scatterCoord.rot}deg)`
                              : 'translate3d(0, 0, 0) rotate(0deg)',
                            opacity: isScatteredChar ? 0 : 1,
                            transition: isScatteredChar
                              ? `transform ${scatterCoord.duration}ms cubic-bezier(0.2, 0, 0.7, 0.2) ${index * 60}ms, opacity ${scatterCoord.duration}ms ease-in ${index * 60}ms`
                              : 'none',
                          }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BELOW THE ENVELOPE: DATES AND CLUMSY ARROW */}
          <div
            className={`mt-4 sm:mt-6 md:mt-8 w-full max-w-xl sm:max-w-2xl px-4 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-700 ease-out ${
              isOpeningStarted ? 'opacity-0 pointer-events-none -translate-y-4' : 'opacity-100'
            }`}
          >
            {/* Left Date: "Nov 15 2008" */}
            <div className="shrink-0 text-right sm:text-left flex items-center justify-end sm:justify-start">
              <span className="text-xl sm:text-3xl md:text-4xl text-neutral-100 whitespace-nowrap drop-shadow-[0_2px_14px_rgba(255,255,255,0.3)] tracking-wider">
                {leftText}
                {datePhase === 'left-typing' && (
                  <span className="inline-block w-1.5 sm:w-2 h-5 sm:h-7 bg-amber-400 ml-1 animate-pulse align-middle" />
                )}
              </span>
            </div>

            {/* Clumsy Growing Arrow */}
            <div className="flex-1 min-w-[100px] px-1 sm:px-3 flex items-center justify-center">
              <svg
                viewBox="0 0 420 100"
                className="w-full h-12 sm:h-16 md:h-20 overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="curly-glow-init-m" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#fde047" floodOpacity="0.5" />
                  </filter>
                </defs>

                <path
                  ref={arrowPathRef}
                  d="M 10,55 C 40,35 65,75 105,65 C 140,55 155,18 185,22 C 215,28 225,78 195,85 C 168,92 160,50 215,42 C 265,32 285,78 325,62 C 360,48 382,56 405,50"
                  stroke="#FDE047"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={arrowLength}
                  strokeDashoffset={strokeOffset}
                  filter="url(#curly-glow-init-m)"
                />

                {showArrowHead && (
                  <g filter="url(#curly-glow-init-m)">
                    <path d="M 384,36 C 392,42 399,46 405,50" stroke="#FDE047" strokeWidth="3.6" strokeLinecap="round" />
                    <path d="M 383,66 C 392,60 399,54 405,50" stroke="#FDE047" strokeWidth="3.6" strokeLinecap="round" />
                  </g>
                )}
              </svg>
            </div>

            {/* Right Date: "Nov 15 2026" */}
            <div className="shrink-0 text-left flex items-center justify-start">
              <span className="text-xl sm:text-3xl md:text-4xl text-neutral-100 whitespace-nowrap drop-shadow-[0_2px_14px_rgba(255,255,255,0.3)] tracking-wider">
                {rightText}
                {datePhase === 'right-typing' && (
                  <span className="inline-block w-1.5 sm:w-2 h-5 sm:h-7 bg-amber-400 ml-1 animate-pulse align-middle" />
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* BIRTHDAY LETTER (SCROLLABLE TO BOTTOM TO REVEAL "MORE WONDERS" BUTTON) */}
      {!isMonkeyActive && isLetterVisible && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
          <div
            ref={letterScrollRef}
            onScroll={handleLetterScroll}
            className={`w-[92vw] sm:w-[82vw] md:w-[70vw] max-w-4xl max-h-[82vh] pointer-events-auto rounded-3xl bg-[#FFFDF7] text-neutral-800 p-6 sm:p-10 md:p-14 border-2 border-amber-300/80 shadow-[0_25px_70px_rgba(0,0,0,0.85)] filter drop-shadow(0 0 30px rgba(254,243,199,0.25)) overflow-y-auto will-change-transform ${
              envelopeStage === 'letter-emerging'
                ? 'scale-75 opacity-0'
                : 'scale-100 opacity-100'
            }`}
            style={{
              transition:
                'transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease-out',
            }}
          >
            {/* Elegant Inner Decorative Border */}
            <div className="border border-amber-200/80 rounded-2xl p-4 sm:p-8 flex flex-col gap-y-4 sm:gap-y-6 text-xl sm:text-2xl md:text-3xl leading-relaxed tracking-wide">
              {/* Header */}
              <h2 className="text-3xl sm:text-5xl md:text-6xl text-amber-800 font-bold tracking-wide">
                Dear Sister,
              </h2>

              <p>It's your first birthday away from your family since 2008.</p>

              <p>Yup!!! You're growing up. You're stepping into a whole new chapter of life — adulthood!</p>

              <p>
                From now on, life is going to bring you different challenges. Some will test your patience, some will test your strength, and some might even make you question yourself.
              </p>

              <p>
                Whether you conquer those challenges or let them break you depends on how you face them and handle every situation.
              </p>

              <p className="py-1">
                But always remember one thing:{' '}
                <span className="font-extrabold text-amber-700 underline decoration-amber-400 decoration-wavy">
                  YOU ARE NOT ALONE.
                </span>
              </p>

              <p>
                Every single person in this world has their own ups and downs. Everyone has battles to fight, lessons to learn, and obstacles to overcome. You're not the only one figuring things out.
              </p>

              <p>
                You're 18 now. You're becoming an adult, and with that comes maturity, freedom, and responsibility. You are responsible for the choices you make and the direction your life takes.
              </p>

              <p>
                So embrace this new chapter. Accept the challenges. Learn from your mistakes. Never be afraid to try, fail, and try again.
              </p>

              <p>
                Life is going to change drastically, and I genuinely hope those changes bring the very best into your life.
              </p>

              <p>
                There's a small part of my heart that feels a little heavy, knowing that you felt uncomfortable sharing some of your problems with me. Honestly, that's something I find difficult to accept because I always thought of myself as your friend — someone you could trust, someone with whom you could share absolutely anything without hesitation.
              </p>

              <p>
                But that's okay. We're all growing, time changes, and people change. I understand that.
              </p>

              <p>
                There's just one thing I want you to remember: whatever you're going through, face it with courage and boldness. Never let anything make you feel that you're alone in this journey.
              </p>

              <p className="font-extrabold text-amber-800 py-1">
                Always remember, I'm here for you. No matter what.
              </p>

              <p>
                I'll always pray for all the goodness, happiness, success, and beautiful things life has to offer you.
              </p>

              <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-800 tracking-wide py-1">
                Be Bold. Be Strong. Believe in Yourself.
              </p>

              <p>Welcome to the phase of adulthood!</p>

              <p className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-rose-600 tracking-wide pt-3 sm:pt-6 drop-shadow-[0_2px_8px_rgba(244,63,94,0.3)]">
                Happy 18th Birthday, Sister!
              </p>

              {/* Bottom Sentinel to reliably detect scrolling to the end */}
              <div ref={bottomSentinelRef} className="h-2 w-full" />

              {/* 1. "More Wonders" BUTTON: Appears only when user reaches the bottom of the letter */}
              {showMoreWondersBtn && (
                <div className="pt-6 sm:pt-8 flex justify-center items-center transition-all duration-700 ease-out">
                  <button
                    type="button"
                    onClick={handleMoreWondersClick}
                    className="cursor-pointer text-2xl sm:text-3xl md:text-4xl px-8 sm:px-12 py-3 sm:py-4 rounded-full border-2 border-amber-500 text-amber-900 bg-amber-200/60 hover:bg-amber-300 active:scale-95 transition-all duration-300 shadow-[0_4px_25px_rgba(245,158,11,0.45)] tracking-wide font-bold"
                  >
                    More Wonders
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3 & 4. MONKEY SURPRISE SCREEN: Zooms in to ~80% of screen, then reveals text below it */}
      {isMonkeyActive && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#070913] select-none">
          {/* Funny, Charming Monkey Graphic (Zooms in gradually from center to ~80% screen area) */}
          <div
            className="will-change-transform flex items-center justify-center transition-all duration-[2400ms]"
            style={{
              transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
              transform: monkeyStage === 'zooming' || monkeyStage === 'zoomed' ? 'scale(1)' : 'scale(0.12)',
              opacity: monkeyStage === 'zooming' || monkeyStage === 'zoomed' ? 1 : 0,
            }}
          >
            <div className="w-[78vw] sm:w-[65vw] md:w-[50vw] max-w-xl aspect-square flex items-center justify-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)] filter drop-shadow(0 0 35px rgba(245,158,11,0.2))">
              <svg
                viewBox="0 0 320 320"
                className="w-full h-full overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Fur Gradients */}
                  <linearGradient id="furGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8D5B4C" />
                    <stop offset="100%" stopColor="#5C382C" />
                  </linearGradient>
                  <linearGradient id="faceMuzzleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#FCD34D" />
                  </linearGradient>
                  <linearGradient id="cheekBlush" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Left Ear */}
                <circle cx="58" cy="140" r="38" fill="url(#furGrad)" stroke="#45271F" strokeWidth="3" />
                <circle cx="58" cy="140" r="24" fill="#FDE68A" stroke="#EAB308" strokeWidth="2" />

                {/* Right Ear */}
                <circle cx="262" cy="140" r="38" fill="url(#furGrad)" stroke="#45271F" strokeWidth="3" />
                <circle cx="262" cy="140" r="24" fill="#FDE68A" stroke="#EAB308" strokeWidth="2" />

                {/* Main Monkey Head Base */}
                <ellipse cx="160" cy="155" rx="98" ry="92" fill="url(#furGrad)" stroke="#45271F" strokeWidth="4" />

                {/* Monkey Hair Tuft on Top */}
                <path
                  d="M 152,65 C 145,45 158,35 160,35 C 164,35 174,45 168,65 C 178,50 188,48 188,52 C 188,60 178,70 170,72 Z"
                  fill="url(#furGrad)"
                  stroke="#45271F"
                  strokeWidth="2"
                />

                {/* Eye Area Mask (Heart-like Face Patch) */}
                <path
                  d="M 160,135 C 140,95 85,95 88,140 C 90,170 135,185 160,185 C 185,185 230,170 232,140 C 235,95 180,95 160,135 Z"
                  fill="url(#faceMuzzleGrad)"
                  stroke="#EAB308"
                  strokeWidth="2.5"
                />

                {/* Big Goofy Funny Eyes */}
                {/* Left Eye */}
                <ellipse cx="125" cy="132" rx="18" ry="24" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
                <ellipse cx="130" cy="132" rx="10" ry="14" fill="#1E293B" />
                <circle cx="134" cy="126" r="4.5" fill="#FFFFFF" />
                <circle cx="127" cy="138" r="2" fill="#FFFFFF" />

                {/* Right Eye */}
                <ellipse cx="195" cy="132" rx="18" ry="24" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
                <ellipse cx="190" cy="132" rx="10" ry="14" fill="#1E293B" />
                <circle cx="187" cy="126" r="4.5" fill="#FFFFFF" />
                <circle cx="193" cy="138" r="2" fill="#FFFFFF" />

                {/* Comical Raised Eyebrows */}
                <path d="M 108,102 C 118,94 135,97 142,106" stroke="#45271F" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M 212,102 C 202,94 185,97 178,106" stroke="#45271F" strokeWidth="4.5" strokeLinecap="round" />

                {/* Large Muzzle & Cheek Area */}
                <ellipse cx="160" cy="205" rx="72" ry="52" fill="url(#faceMuzzleGrad)" stroke="#EAB308" strokeWidth="2.5" />

                {/* Cute Cute Monkey Nose */}
                <ellipse cx="160" cy="176" rx="14" ry="9" fill="#5C382C" />
                <circle cx="154" cy="177" r="3" fill="#1E293B" />
                <circle cx="166" cy="177" r="3" fill="#1E293B" />

                {/* Cheeky Blushes */}
                <ellipse cx="106" cy="198" rx="12" ry="8" fill="#F43F5E" opacity="0.35" />
                <ellipse cx="214" cy="198" rx="12" ry="8" fill="#F43F5E" opacity="0.35" />

                {/* HUGE GOOFY CHEEKY MONKEY GRIN ("Eeeeeeeee" style!) */}
                <path
                  d="M 105,195 Q 160,255 215,195 Q 160,210 105,195 Z"
                  fill="#781024"
                  stroke="#45271F"
                  strokeWidth="3.5"
                />

                {/* Big Funny White Teeth Bar */}
                <path
                  d="M 112,198 Q 160,218 208,198 L 204,212 Q 160,230 116,212 Z"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1.5"
                />
                {/* Tooth separator lines for goofy cartoon grin */}
                <line x1="130" y1="202" x2="130" y2="216" stroke="#CBD5E1" strokeWidth="1.5" />
                <line x1="145" y1="205" x2="145" y2="220" stroke="#CBD5E1" strokeWidth="1.5" />
                <line x1="160" y1="206" x2="160" y2="222" stroke="#CBD5E1" strokeWidth="1.5" />
                <line x1="175" y1="205" x2="175" y2="220" stroke="#CBD5E1" strokeWidth="1.5" />
                <line x1="190" y1="202" x2="190" y2="216" stroke="#CBD5E1" strokeWidth="1.5" />

                {/* Funny Cheeky Tongue poking at bottom of grin */}
                <path
                  d="M 144,222 C 144,235 176,235 176,222 Z"
                  fill="#F43F5E"
                />

                {/* Cute Monkey Paws Peeking Up at Bottom */}
                <ellipse cx="95" cy="272" rx="26" ry="18" fill="url(#furGrad)" stroke="#45271F" strokeWidth="2.5" />
                <ellipse cx="225" cy="272" rx="26" ry="18" fill="url(#furGrad)" stroke="#45271F" strokeWidth="2.5" />
              </svg>
            </div>
          </div>

          {/* 4. TEXT APPEARANCE BELOW THE MONKEY: "Avlothan madam nenga pogalam. Eeeeeeeee" (Slow smooth fade-in) */}
          <div
            className="mt-6 sm:mt-8 md:mt-10 px-4 text-center transition-all duration-[1500ms] ease-out will-change-transform"
            style={{
              opacity: showMonkeyText ? 1 : 0,
              transform: showMonkeyText ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <h2 className="text-3xl sm:text-5xl md:text-6xl text-amber-300 font-bold tracking-wide drop-shadow-[0_2px_18px_rgba(253,224,71,0.5)]">
              Avlothan madam nenga pogalam. Eeeeeeeee
            </h2>
          </div>
        </div>
      )}
    </div>
  );
}
