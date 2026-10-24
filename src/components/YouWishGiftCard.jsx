import React, { useState, useEffect, useRef } from 'react';
import youWishImg from '../assets/you Wish.gif';

// ── Omar's 5 wishes ────────────────────────────────────────────────────────
const OMAR_WISHES = [
  {
    id: 1,
    shortLabel: 'Forever & Ever',
    text: "I really wish for us to stay together — forever and ever. Not just for now, not just through the easy parts. Through every season, every change, every version of each other. I want all of it. Always.",
  },
  {
    id: 2,
    shortLabel: 'Every Single Day',
    text: "I wish I could look at your beautiful face every single day. Not just in my phone screen, not just when distance decides. I mean waking up and seeing you — and knowing that I get to.",
  },
  {
    id: 3,
    shortLabel: 'Count Every Second',
    text: "I wish time would pass faster — so we could be officially together without waiting, without the space in between. Every second that brings us closer to that feels like the best second I've ever counted.",
  },
  {
    id: 4,
    shortLabel: 'Always There',
    text: "I wish I could stay with you and comfort you every day — to be the one there when things get heavy. To sit beside you when you need someone and to actually be that someone. That's all I want.",
  },
  {
    id: 5,
    shortLabel: 'What You Did to Me',
    text: "I wish you knew how our time together made me feel about life. You didn't just make me happy — you made everything make more sense. Like before you, I was just going through it. Then you happened.",
  },
];

// ── Generate initial node positions ────────────────────────────────────────
function makeInitialNodes(wishes) {
  const positions = [
    { x: 0.50, y: 0.12 },
    { x: 0.18, y: 0.28 },
    { x: 0.80, y: 0.25 },
    { x: 0.12, y: 0.60 },
    { x: 0.70, y: 0.58 },
    { x: 0.38, y: 0.72 },
    { x: 0.82, y: 0.80 },
    { x: 0.55, y: 0.45 },
    { x: 0.22, y: 0.88 },
  ];
  return wishes.map((w, i) => {
    const pos = positions[i % positions.length];
    return {
      id: w.id,
      wish: w,
      isOmar: w.isOmar !== false,
      nx: pos.x + (Math.random() - 0.5) * 0.06,
      ny: pos.y + (Math.random() - 0.5) * 0.06,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

const ORB_R = 24;

export default function YouWishGiftCard({ onClose }) {
  const [wishes, setWishes] = useState(() =>
    OMAR_WISHES.map((w) => ({ ...w, isOmar: true }))
  );
  const [activeWish, setActiveWish] = useState(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [downloading, setDownloading] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const nodesRef = useRef([]);
  const rafRef = useRef(null);
  const timeRef = useRef(0);
  const [dims, setDims] = useState({ w: 320, h: 320 });

  // Seed initial nodes once
  useEffect(() => {
    nodesRef.current = makeInitialNodes(wishes);
  }, []); // eslint-disable-line

  // Add new wish nodes when wishes grow
  useEffect(() => {
    const existing = nodesRef.current;
    const existingIds = new Set(existing.map((n) => n.id));
    const newNodes = wishes
      .filter((w) => !existingIds.has(w.id))
      .map((w) => ({
        id: w.id,
        wish: w,
        isOmar: w.isOmar !== false,
        nx: 0.3 + Math.random() * 0.4,
        ny: 0.85 + Math.random() * 0.1,
        vx: (Math.random() - 0.5) * 0.00012,
        vy: (Math.random() - 0.5) * 0.00012,
        phase: Math.random() * Math.PI * 2,
      }));
    if (newNodes.length > 0) {
      nodesRef.current = [...existing, ...newNodes];
    }
  }, [wishes]);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDims({ w: rect.width, h: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Animation loop
  useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      const dt = now - last;
      last = now;
      timeRef.current += dt;
      nodesRef.current = nodesRef.current.map((node) => {
        let { nx, ny, vx, vy } = node;
        nx += vx * dt;
        ny += vy * dt;
        if (nx < 0.06 || nx > 0.94) { vx = -vx; nx = Math.max(0.06, Math.min(0.94, nx)); }
        if (ny < 0.04 || ny > 0.92) { vy = -vy; ny = Math.max(0.04, Math.min(0.92, ny)); }
        return { ...node, nx, ny, vx, vy };
      });
      setRenderTick((r) => r + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleNodeClick = (node) => {
    setRevealedIds((prev) => new Set([...prev, node.id]));
    setActiveWish(node.wish);
  };

  const handleAddWish = () => {
    const title = inputTitle.trim();
    const text = inputValue.trim();
    if (!title || !text) return;
    const newWish = {
      id: Date.now(),
      shortLabel: title.length > 11 ? title.slice(0, 10) + '…' : title,
      text,
      isOmar: false,
    };
    setWishes((prev) => [...prev, newWish]);
    setInputTitle('');
    setInputValue('');
    setShowAddInput(false);
  };

  // ── Download network as PNG ────────────────────────────────────────────
  const downloadAsImage = () => {
    if (!svgRef.current || downloading) return;
    setDownloading(true);
    try {
      const svgEl = svgRef.current;
      const W = dims.w || 360;
      const H = dims.h || 360;
      const PAD = 40;
      const CW = W + PAD * 2;
      const CH = H + PAD * 2 + 80;

      const clone = svgEl.cloneNode(true);
      clone.setAttribute('width', W);
      clone.setAttribute('height', H);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CW;
        canvas.height = CH;
        const ctx = canvas.getContext('2d');

        // Background
        const bg = ctx.createRadialGradient(CW / 2, CH * 0.35, 0, CW / 2, CH * 0.35, CW * 0.8);
        bg.addColorStop(0, '#17255a');
        bg.addColorStop(0.6, '#080c24');
        bg.addColorStop(1, '#000000');
        ctx.fillStyle = bg;
        ctx.roundRect(0, 0, CW, CH, 20);
        ctx.fill();

        // Grid
        ctx.save();
        ctx.strokeStyle = 'rgba(96,165,250,0.07)';
        ctx.lineWidth = 0.8;
        for (let gx = 0; gx < CW; gx += 36) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke(); }
        for (let gy = 0; gy < CH; gy += 36) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke(); }
        ctx.restore();

        // Title
        ctx.save();
        ctx.fillStyle = 'rgba(147,197,253,0.9)';
        ctx.font = 'italic bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ You Wish — Omar & Shahd', CW / 2, 28);
        ctx.restore();

        // SVG network
        ctx.drawImage(img, PAD, 50, W, H);

        // Footer wish labels
        ctx.save();
        ctx.fillStyle = 'rgba(96,165,250,0.55)';
        ctx.font = 'italic 10px Georgia, serif';
        ctx.textAlign = 'center';
        const labels = wishes.map((w) => w.shortLabel).join('  ·  ');
        ctx.fillText(labels, CW / 2, CH - 16);
        ctx.restore();

        URL.revokeObjectURL(svgUrl);
        const link = document.createElement('a');
        link.download = 'Our Wishes — Shahd & Omar.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloading(false);
      };

      img.onerror = () => { URL.revokeObjectURL(svgUrl); setDownloading(false); };
      img.src = svgUrl;
    } catch {
      setDownloading(false);
    }
  };

  // ── Download a SINGLE WISH CARD as PNG ────────────────────────────────
  const downloadWishCard = (wish) => {
    try {
      const CW = 480;
      const CH = 320;
      const canvas = document.createElement('canvas');
      canvas.width = CW;
      canvas.height = CH;
      const ctx = canvas.getContext('2d');

      // Background
      const bg = ctx.createRadialGradient(CW / 2, CH * 0.4, 10, CW / 2, CH * 0.4, CW * 0.85);
      bg.addColorStop(0, '#0d1540');
      bg.addColorStop(0.7, '#060a20');
      bg.addColorStop(1, '#000000');
      ctx.fillStyle = bg;
      ctx.roundRect(0, 0, CW, CH, 22);
      ctx.fill();

      // Subtle grid
      ctx.save();
      ctx.strokeStyle = 'rgba(96,165,250,0.07)';
      ctx.lineWidth = 0.8;
      for (let gx = 0; gx < CW; gx += 36) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CH); ctx.stroke(); }
      for (let gy = 0; gy < CH; gy += 36) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CW, gy); ctx.stroke(); }
      ctx.restore();

      // Card border glow
      ctx.save();
      ctx.strokeStyle = wish.isOmar ? 'rgba(96,165,250,0.45)' : 'rgba(244,63,94,0.45)';
      ctx.lineWidth = 1.5;
      ctx.roundRect(1, 1, CW - 2, CH - 2, 21);
      ctx.stroke();
      ctx.restore();

      // Orb glow aura
      ctx.save();
      ctx.beginPath();
      ctx.arc(CW / 2, 44, 32, 0, Math.PI * 2);
      ctx.fillStyle = wish.isOmar ? 'rgba(59,130,246,0.15)' : 'rgba(244,63,94,0.15)';
      ctx.fill();
      ctx.restore();

      // Orb circle
      ctx.save();
      const orbGrad = ctx.createRadialGradient(CW / 2 - 7, 37, 2, CW / 2, 44, 22);
      orbGrad.addColorStop(0, wish.isOmar ? '#93c5fd' : '#fda4af');
      orbGrad.addColorStop(0.55, wish.isOmar ? '#3b82f6' : '#f43f5e');
      orbGrad.addColorStop(1, wish.isOmar ? '#1d4ed8' : '#be123c');
      ctx.beginPath();
      ctx.arc(CW / 2, 44, 22, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.shadowColor = wish.isOmar ? '#3b82f6' : '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      // Orb emoji
      ctx.save();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨', CW / 2, 44);
      ctx.restore();

      // Owner label
      ctx.save();
      ctx.fillStyle = wish.isOmar ? 'rgba(147,197,253,0.85)' : 'rgba(251,113,133,0.85)';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wish.isOmar ? "OMAR'S WISH" : "YOUR WISH", CW / 2, 78);
      ctx.restore();

      // Title
      ctx.save();
      ctx.fillStyle = 'rgba(219,234,254,0.95)';
      ctx.font = 'italic bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(wish.shortLabel, CW / 2, 108);
      ctx.restore();

      // Thin divider
      ctx.save();
      ctx.strokeStyle = 'rgba(96,165,250,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CW * 0.2, 122);
      ctx.lineTo(CW * 0.8, 122);
      ctx.stroke();
      ctx.restore();

      // Wish text — word-wrapped
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'italic 13px Georgia, serif';
      ctx.textAlign = 'center';
      const maxW = CW - 80;
      const lineH = 20;
      const words = `"${wish.text}"`.split(' ');
      let line = '';
      const lines = [];
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      let startY = 142;
      lines.forEach((l, i) => ctx.fillText(l, CW / 2, startY + i * lineH));
      ctx.restore();

      // Download
      const link = document.createElement('a');
      link.download = `Wish — ${wish.shortLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('Card download error', e);
    }
  };

  // Pixel coords
  const nodes = nodesRef.current;
  const t = timeRef.current;
  const px = (node) => node.nx * dims.w;
  const py = (node) => node.ny * dims.h + Math.sin(t * 0.0018 + node.phase) * 5;

  // Full-mesh edges
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      edges.push([nodes[i], nodes[j]]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Dark holographic backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 35%, rgba(23,37,100,0.70) 0%, rgba(8,12,36,0.92) 65%, rgba(0,0,0,0.96) 100%)',
        }}
        onClick={() => activeWish && setActiveWish(null)}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-md flex flex-col"
        style={{
          maxHeight: '92dvh',
          background: 'rgba(6,10,32,0.92)',
          borderRadius: '20px',
          border: '1.5px solid rgba(96,165,250,0.28)',
          boxShadow: '0 0 60px rgba(59,130,246,0.18), 0 0 130px rgba(59,130,246,0.07)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 pt-4 pb-3"
          style={{ borderBottom: '1px solid rgba(96,165,250,0.13)' }}
        >
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold font-playfair italic text-blue-200">
              ✨ You Wish
            </h2>
            <p className="text-[10px] font-playfair italic text-blue-400/70">
              Tap the orbs — your wishes await
            </p>
          </div>
          <img src={youWishImg} alt="You Wish" className="w-10 h-10 object-contain rounded-full opacity-90" />
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-blue-300 hover:text-white transition-colors text-sm font-bold cursor-pointer flex-shrink-0"
            style={{ background: 'rgba(96,165,250,0.13)', border: '1px solid rgba(96,165,250,0.28)' }}
          >
            ✕
          </button>
        </div>

        {/* Instruction */}
        <p className="text-center text-[11px] font-playfair italic text-blue-300/80 pt-3 pb-1 px-4">
          Tap on them — your wishes will come true
        </p>

        {/* Network Graph Area */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          style={{ minHeight: '300px', maxHeight: '54dvh' }}
        >
          <svg
            ref={svgRef}
            width={dims.w}
            height={dims.h}
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            <defs>
              <radialGradient id="blueGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="55%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
              <radialGradient id="pinkGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="55%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </radialGradient>
            </defs>

            {/* Edges — full mesh */}
            {edges.map(([a, b], idx) => {
              const x1 = px(a), y1 = py(a), x2 = px(b), y2 = py(b);
              const dist = Math.hypot(x2 - x1, y2 - y1);
              const maxDist = Math.max(dims.w, dims.h) * 0.85;
              const opacity = Math.max(0.06, 0.5 * (1 - dist / maxDist));
              const bothOmar = a.isOmar && b.isOmar;
              const mixed = a.isOmar !== b.isOmar;
              const stroke = bothOmar
                ? `rgba(96,165,250,${opacity})`
                : mixed
                ? `rgba(192,132,252,${opacity * 0.8})`
                : `rgba(244,114,182,${opacity})`;
              return (
                <line
                  key={idx}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={stroke}
                  strokeWidth={1.2}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const cx = px(node);
              const cy = py(node);
              const isRevealed = revealedIds.has(node.id);

              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(node)}>
                  {/* Outer glow */}
                  <circle
                    cx={cx} cy={cy} r={ORB_R + 7}
                    fill={node.isOmar ? 'rgba(59,130,246,0.10)' : 'rgba(244,63,94,0.10)'}
                  />
                  {/* Main orb */}
                  <circle
                    cx={cx} cy={cy} r={ORB_R}
                    fill={node.isOmar ? 'url(#blueGrad)' : 'url(#pinkGrad)'}
                    stroke={node.isOmar ? 'rgba(147,197,253,0.65)' : 'rgba(251,113,133,0.65)'}
                    strokeWidth={isRevealed ? 2.5 : 1.5}
                    style={{
                      filter: node.isOmar
                        ? 'drop-shadow(0 0 8px rgba(59,130,246,0.7))'
                        : 'drop-shadow(0 0 8px rgba(244,63,94,0.7))',
                    }}
                  />
                  {/* Glint */}
                  <circle
                    cx={cx - ORB_R * 0.28} cy={cy - ORB_R * 0.3}
                    r={ORB_R * 0.22}
                    fill="rgba(255,255,255,0.30)"
                  />
                  {/* Label */}
                  <text
                    x={cx} y={cy + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fontFamily="Georgia, serif"
                    fontStyle="italic" fontWeight="bold"
                    fill="white"
                  >
                    {node.wish.shortLabel}
                  </text>
                  {/* Owner */}
                  <text
                    x={cx} y={cy + ORB_R + 11}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fontFamily="Georgia, serif"
                    fontWeight="bold"
                    fill={node.isOmar ? 'rgba(147,197,253,0.85)' : 'rgba(251,113,133,0.85)'}
                  >
                    {node.isOmar ? 'Omar' : 'Shahd'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Bar */}
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid rgba(96,165,250,0.13)' }}
        >
          {showAddInput ? (
            <div className="flex flex-col gap-2 w-full">
              {/* Title field */}
              <input
                autoFocus
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                maxLength={30}
                placeholder="Wish title (e.g. Forever & Ever)"
                className="w-full rounded-full px-4 py-1.5 text-xs font-playfair font-bold text-white placeholder-blue-400/50 outline-none"
                style={{
                  background: 'rgba(30,58,138,0.35)',
                  border: '1px solid rgba(96,165,250,0.4)',
                }}
              />
              {/* Description field — textarea for multi-line wrapping */}
              <div className="flex gap-2 items-start">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe your wish..."
                  className="flex-1 rounded-2xl px-4 py-2 text-xs font-playfair italic text-white placeholder-blue-400/50 outline-none resize-none leading-relaxed"
                  style={{
                    background: 'rgba(30,58,138,0.35)',
                    border: '1px solid rgba(96,165,250,0.35)',
                  }}
                />
                <button
                  onClick={handleAddWish}
                  disabled={!inputTitle.trim() || !inputValue.trim()}
                  className="px-3 py-1.5 rounded-full text-xs font-bold font-playfair text-white cursor-pointer hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
                >
                  Add ✨
                </button>
                <button
                  onClick={() => { setShowAddInput(false); setInputTitle(''); setInputValue(''); }}
                  className="text-blue-400 text-xs font-bold cursor-pointer hover:text-white transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              {/* Add Wish */}
              <button
                onClick={() => setShowAddInput(true)}
                className="px-5 py-2 rounded-full text-xs font-bold font-playfair italic text-white cursor-pointer transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg,rgba(59,130,246,0.6),rgba(96,165,250,0.6))',
                  border: '1px solid rgba(96,165,250,0.4)',
                  boxShadow: '0 0 14px rgba(59,130,246,0.22)',
                }}
              >
                Add Wish ✨
              </button>

              {/* Divider */}
              <div className="w-px h-6" style={{ background: 'rgba(96,165,250,0.2)' }} />

              {/* Save Memory */}
              <button
                onClick={downloadAsImage}
                disabled={downloading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold font-playfair italic text-blue-200 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(30,58,138,0.35)',
                  border: '1px solid rgba(96,165,250,0.3)',
                }}
                title="Save as image — a memory forever"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloading ? 'Saving…' : 'Save Memory'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wish Reveal Popup */}
      {activeWish && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-5"
          onClick={() => setActiveWish(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl p-5 text-center animate-card-entrance overflow-y-auto"
            style={{
              background: 'rgba(6,10,40,0.97)',
              border: '1.5px solid rgba(96,165,250,0.5)',
              boxShadow: '0 0 50px rgba(59,130,246,0.4)',
              maxHeight: '80dvh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center shadow-2xl"
              style={{
                background: activeWish.isOmar
                  ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                  : 'linear-gradient(135deg,#f43f5e,#be123c)',
                boxShadow: activeWish.isOmar
                  ? '0 0 28px rgba(59,130,246,0.75)'
                  : '0 0 28px rgba(244,63,94,0.75)',
              }}
            >
              <span className="text-white text-xl">✨</span>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest font-playfair text-blue-400 mb-1">
              {activeWish.isOmar ? "Omar's Wish" : "Your Wish"}
            </p>

            <p className="text-base sm:text-lg font-bold font-playfair italic text-blue-200 mb-2">
              {activeWish.shortLabel}
            </p>

            <p className="text-sm font-playfair italic text-white/90 leading-relaxed mb-5 px-1 break-words whitespace-pre-wrap" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              "{activeWish.text}"
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveWish(null)}
                className="px-5 py-2 rounded-full text-xs font-bold font-playfair text-white cursor-pointer transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}
              >
                Close ✨
              </button>

              {/* Download this wish as image */}
              <button
                onClick={() => downloadWishCard(activeWish)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold font-playfair italic text-blue-200 cursor-pointer transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(30,58,138,0.5)',
                  border: '1px solid rgba(96,165,250,0.4)',
                }}
                title="Save this memory as an image"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {downloading ? 'Saving…' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
