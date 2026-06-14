import React, { useEffect, useRef } from 'react';

interface ConfettiEffectProps {
  active: boolean;
}

// Spark entity for firework explosion
class FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  fadeSpeed: number;
  gravity: number;
  drag: number;
  sparkleChance: boolean;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    
    // Radial distribution
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.size = 2 + Math.random() * 3.5;
    this.color = color;
    this.alpha = 1.0;
    this.fadeSpeed = 0.008 + Math.random() * 0.012;
    this.gravity = 0.12;
    this.drag = 0.96; // soft air deceleration
    this.sparkleChance = Math.random() > 0.4;
  }

  update() {
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.fadeSpeed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Sparkle twinkling effect
    if (this.sparkleChance && Math.random() > 0.5) {
      ctx.globalAlpha = this.alpha * 0.3;
    } else {
      ctx.globalAlpha = this.alpha;
    }
    
    // Soft radial glow on sparks
    ctx.shadowBlur = this.size * 2.5;
    ctx.shadowColor = this.color;
    
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Rocket entity shooting upwards before bursting
class FireworkRocket {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  isDead: boolean;
  trail: { x: number; y: number; alpha: number }[];

  constructor(startX: number, startY: number, targetY: number, color: string) {
    this.x = startX;
    this.y = startY;
    this.targetY = targetY;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -12 - Math.random() * 5; // upward speed
    this.color = color;
    this.isDead = false;
    this.trail = [];
  }

  update() {
    // Add current position to trail
    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > 12) {
      this.trail.shift();
    }

    // Move
    this.x += this.vx;
    this.y += this.vy;
    
    // Slow down of rocket as it reaches peak, or trigger explosion if reached target height
    this.vy *= 0.985;
    
    if (this.vy >= -2 || this.y <= this.targetY) {
      this.isDead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    
    // Draw smoke/sparkle trail
    this.trail.forEach((t, i) => {
      ctx.globalAlpha = (i / this.trail.length) * 0.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = this.color;
      ctx.fillStyle = '#fff9c4'; // glowing trails
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.8 + (i / this.trail.length) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw rocket tip
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Standard Confetti falling particles
class ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 'circle' | 'rect' | 'star';
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  gravity: number;
  resistance: number;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, isCenter: boolean) {
    this.x = x;
    this.y = y;
    
    if (isCenter) {
      // Explode outwards from center
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 11;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 1.5;
    } else {
      // Side launcher diagonal trajectory
      const isLeft = x < window.innerWidth / 2;
      this.vx = (isLeft ? 7 : -7) + (Math.random() - 0.5) * 6;
      this.vy = -10 - Math.random() * 13;
    }

    this.size = 4 + Math.random() * 6;
    this.gravity = 0.16 + Math.random() * 0.08;
    this.resistance = 0.982;

    const colors = ['#F5D77A', '#F8E7A8', '#FFFFFF', '#9FD3FF'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    
    const randShape = Math.random();
    if (randShape < 0.25) this.shape = 'star';
    else if (randShape < 0.55) this.shape = 'circle';
    else this.shape = 'rect';
    if (this.shape === 'star') this.shape = 'rect';

    this.rotation = Math.random() * 360;
    this.rotationSpeed = (Math.random() - 0.5) * 5;
    this.opacity = 1.0;
    this.maxLife = 100 + Math.random() * 70;
    this.life = this.maxLife;
  }

  update() {
    this.vx *= this.resistance;
    this.vy = (this.vy * this.resistance) + this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.life--;
    this.opacity = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.opacity * 0.82;
    ctx.fillStyle = this.color;
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    }
    ctx.restore();
  }
}

export default function ConfettiEffect({ active }: ConfettiEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Active arrays for our graphics engine
    const confetti: ConfettiParticle[] = [];
    const rockets: FireworkRocket[] = [];
    const sparks: FireworkSpark[] = [];

    // Trigger Initial celebratory burst
    // Side cannon 1: Left
    for (let i = 0; i < 26; i++) {
      confetti.push(new ConfettiParticle(30, window.innerHeight * 0.85, false));
    }
    // Side cannon 2: Right
    for (let i = 0; i < 26; i++) {
      confetti.push(new ConfettiParticle(window.innerWidth - 30, window.innerHeight * 0.85, false));
    }
    // Keep the center line clear so the prize stays readable.
    for (let i = 0; i < 12; i++) {
      confetti.push(new ConfettiParticle(window.innerWidth * 0.26, window.innerHeight * 0.46, true));
      confetti.push(new ConfettiParticle(window.innerWidth * 0.74, window.innerHeight * 0.46, true));
    }

    // Sparkle colors for premium visual sparks
    const fireworkColors = ['#F5D77A', '#F8E7A8', '#FFFFFF', '#9FD3FF'];

    // Helper functions to launch randomly
    const launchRocket = () => {
      const startX = window.innerWidth * 0.15 + Math.random() * (window.innerWidth * 0.7);
      const startY = window.innerHeight + 10;
      const targetY = window.innerHeight * 0.15 + Math.random() * (window.innerHeight * 0.4);
      const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      rockets.push(new FireworkRocket(startX, startY, targetY, color));
    };

    // Spawn 1 initial rocket right away
    launchRocket();

    let ticker = 0;
    let animationFrameId: number;

    const tick = () => {
      // Draw trails elegantly over background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Periodically space out new random rockets to maintain atmosphere!
      ticker++;
      if (ticker % 90 === 0) {
        launchRocket();
      }
      if (ticker % 280 === 0) {
        for (let i = 0; i < 10; i++) {
          confetti.push(new ConfettiParticle(20, window.innerHeight * 0.85, false));
          confetti.push(new ConfettiParticle(window.innerWidth - 20, window.innerHeight * 0.85, false));
        }
      }

      // 1. Process Confetti
      for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.update();
        c.draw(ctx);
        if (c.life <= 0 || c.opacity <= 0) {
          confetti.splice(i, 1);
        }
      }

      // 2. Process Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.update();
        r.draw(ctx);
        
        if (r.isDead) {
          // EXPLODE! Spawn sparks radially
          const burstSize = 28 + Math.floor(Math.random() * 14);
          for (let k = 0; k < burstSize; k++) {
            sparks.push(new FireworkSpark(r.x, r.y, r.color));
          }
          for (let k = 0; k < 6; k++) {
            sparks.push(new FireworkSpark(r.x, r.y, '#ffffff'));
          }
          rockets.splice(i, 1);
        }
      }

      // 3. Process Sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.update();
        s.draw(ctx);
        if (s.alpha <= 0) {
          sparks.splice(i, 1);
        }
      }

      // Ensure persistent visual loop is sustained
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-40 pointer-events-none w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
