import React, { useEffect, useRef, useState } from 'react';

// --- VISUAL PALETTE & TEXTURES ---
const PALETTE = {
  '.': 'transparent',
  'X': '#141013', // Deep Shadow Outline
  'S': '#c2c1e8', // Plate Mail White/Silver
  's': '#646985', // Shadow Armor Silver
  'W': '#ffffff', // Highlight shine
  'R': '#e03d50', // Hero red / fire
  'r': '#901e38', // Dark blood red
  'F': '#ffcd94', // Sun-kissed skin tone
  'f': '#cf8d55', // Shaded skin / blush
  'G': '#f7e214', // Regal Gold
  'g': '#a88f00', // Dark brass gold
  'P': '#ff8cb0', // Princess Pink / flower
  'p': '#b53d75', // Crimson shadow / roses
  'L': '#00d2f7', // Mystic bright sky blue
  'l': '#1a6fa8', // Deep sea blue
  'a': '#87e0f2', // Frothy foam water
  'C': '#b2bec7', // Cobblestone light grey
  'c': '#4b526d', // Dark stone grey
  'b': '#4a2511', // Deep timber brown
  'B': '#946629', // Sand/Wood bright tan
  'd': '#fcdfa2', // Sunlit Desert Sand
  'D': '#cfa153', // Dark Shaded Sand
  'E': '#6fe014', // Lush forest green
  'e': '#2c6114', // Deep shade green
  'T': '#009e6c', // Mythic teal/swamp
  'K': '#48206b', // Rogue purple shadow
  'k': '#1a0d2e', // Deep rogue dark violet
};

const PALETTE_SWAPS = {
  Knight: {},
  Rogue: { 'S': '#323c39', 's': '#14181a', 'R': '#a124db', 'r': '#4d1070', 'W': '#e89eff' },
  Ranger: { 'S': '#2c6114', 's': '#142a07', 'R': '#ffcd94', 'r': '#a88f00' },
  Wizard: { 'S': '#00d2f7', 's': '#1a6fa8', 'R': '#ffffff', 'r': '#b2bec7' },
  Princess: {},
  Woodcutter: { 'S': '#946629', 's': '#4a2511', 'R': '#6fe014', 'r': '#2c6114' },
  Orc: { 'X': '#141013', 'S': '#8a2323', 's': '#4d1010', 'F': '#2c6114', 'f': '#142a07' },
  Wyrm: { 'X': '#141013', 'e': '#a88f00', 'E': '#f7e214', 'T': '#df7126', 'Y': '#e03d50' },
  Boss: { 'S': '#140d2e', 's': '#080414', 'R': '#76428a', 'r': '#48206b' },
  Skeleton: { 'S': '#eef0f2', 's': '#99aab8', 'R': '#141013', 'r': '#141013', 'F': '#eef0f2', 'f': '#99aab8' }
};

const SPRITES = {
  Knight: [
    "................",
    "......rrr.......",
    ".....rRRr.......",
    ".....rRRs.......",
    "....XSSSSSX.....",
    "....XsXWXsX.....",
    "....XSSSSSX.....",
    ".....XXSXX......",
    "....XXsSsXX.....",
    "...XsXXSXXsX....",
    "...XSS.s.SSW....",
    "..XXXS.s.SSX....",
    "..Xs.S.s.SSX....",
    "..XX.X.X.XXX....",
    ".....X.X........",
    "....XX.XX......."
  ],
  Princess: [
    "................",
    "......XGGX......",
    ".....XGRRGX.....",
    "....XGGGGGGX....",
    "....XGFFFFGX....",
    "...XGFFXFFXX....",
    "...XGFfFFFfX....",
    "....XGFFFFGX....",
    ".....GXFFXG.....",
    ".....XPPPPX.....",
    "....XXpPPpXX....",
    "....XPPPPPPX....",
    "...XXpPPPPpXX...",
    "...XPPPPPPPPX...",
    "...XXXXXXXXXX...",
    "................"
  ],
  Dragon: [
    "................",
    "......XeeX......",
    ".....XEEEXX.....",
    "Y...XEEYEXX.....",
    "YO.XXEEEXX......",
    "Y..XeeEEX.......",
    "...XeeEEX.......",
    "..XeeEEETX......",
    ".XXEEEEEeEX.....",
    ".XEEeeEEEEXX....",
    "..XEeeTeEEEX....",
    "..XETX.XEEEX....",
    "...XX..XEEeTX...",
    "........XXTEX...",
    "..........XX....",
    "................"
  ],
  Castle: [
    "...L........L...",
    "...LL......LL...",
    "..LLLL....LLLL..",
    "..XCCX....XCCX..",
    "..XCCXXXXXXCCX..",
    "..XcCXcCCcXcCX..",
    "..XCCXCCCCXCCX..",
    "..XYYXcCCcXYYX..",
    "..XCCXCCCCXCCX..",
    "..XcCXcCCcXcCX..",
    "..XCCXXbbXXCCX..",
    "..XcCXbBBbXcCX..",
    "..XCCXbBBbXCCX..",
    "..XXXXXXXXXXXX..",
    "................",
    "................"
  ],
  Chest: [
    "................",
    ".....XXXXXX.....",
    "....XGGggGGX....",
    "....XGbbbbGX....",
    "....XgbbbbgX....",
    "....XXgGGgXX....",
    "....XGbbbbGX....",
    "....XGbbbbGX....",
    "....XXXXXX......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ]
};

const TILES = {
  // Overworld Tiles
  Grass: { solid: false, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#2c6114', '#142a07', 'grass') },
  Path: { solid: false, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#946629', '#4a2511', 'path') },
  Water: { solid: true, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#1a6fa8', '#00d2f7', 'water') },
  Mountain: { solid: true, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#4b526d', '#b2bec7', 'mountain') },
  Sand: { solid: false, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#fcdfa2', '#cfa153', 'sand') },
  WoodBridge: { solid: false, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#946629', '#4a2511', 'bridge') },
  
  // Dungeon Tiles
  StoneFloor: { solid: false, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#2b2b36', '#14141a', 'stonefloor') },
  StoneWall: { solid: true, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#14141a', '#4b526d', 'stonewall') },
  PrisonBars: { solid: true, draw: (ctx, x, y) => drawFlatColor(ctx, x, y, '#2b2b36', '#8b9bb4', 'bars') }
};

// Procedural tile background styling
function drawFlatColor(ctx, wx, wy, primary, secondary, type) {
  ctx.fillStyle = primary;
  ctx.fillRect(wx, wy, 16, 16);
  ctx.fillStyle = secondary;
  if (type === 'grass') {
    ctx.fillRect(wx + 2, wy + 2, 1, 1);
    ctx.fillRect(wx + 10, wy + 6, 1, 1);
    ctx.fillRect(wx + 5, wy + 11, 1, 1);
  } else if (type === 'water') {
    const wave = Math.sin((Date.now() / 300) + wx * 0.1) * 2;
    ctx.fillRect(wx + 2 + Math.floor(wave), wy + 4, 3, 1);
    ctx.fillRect(wx + 8 - Math.floor(wave), wy + 12, 3, 1);
  } else if (type === 'mountain') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(wx + 8, wy + 2);
    ctx.lineTo(wx + 15, wy + 15);
    ctx.lineTo(wx + 1, wy + 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(wx + 8, wy + 2);
    ctx.lineTo(wx + 10, wy + 6);
    ctx.lineTo(wx + 6, wy + 6);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'bridge') {
    ctx.fillStyle = '#4a2511';
    ctx.fillRect(wx, wy, 16, 2);
    ctx.fillRect(wx, wy + 14, 16, 2);
    ctx.fillStyle = '#946629';
    for (let i = 2; i < 16; i += 4) {
      ctx.fillRect(wx + i, wy + 2, 2, 12);
    }
  } else if (type === 'stonefloor') {
    ctx.fillRect(wx, wy, 16, 1);
    ctx.fillRect(wx, wy, 1, 16);
    ctx.fillStyle = '#3c3c4a';
    ctx.fillRect(wx + 4, wy + 4, 2, 2);
  } else if (type === 'stonewall') {
    ctx.fillStyle = '#4b526d';
    ctx.fillRect(wx, wy, 16, 16);
    ctx.fillStyle = '#14141a';
    ctx.fillRect(wx, wy, 16, 2);
    ctx.fillRect(wx, wy + 8, 16, 2);
    ctx.fillRect(wx, wy, 2, 16);
    ctx.fillRect(wx + 8, wy, 2, 8);
    ctx.fillRect(wx + 4, wy + 8, 2, 8);
  } else if (type === 'bars') {
    ctx.fillStyle = '#2b2b36';
    ctx.fillRect(wx, wy, 16, 16);
    ctx.fillStyle = '#8b9bb4';
    ctx.fillRect(wx, wy + 1, 16, 2);
    ctx.fillRect(wx, wy + 13, 16, 2);
    ctx.fillRect(wx + 4, wy, 2, 16);
    ctx.fillRect(wx + 10, wy, 2, 16);
  }
}

// --- PROCEDURAL GRIDS GENERATION ---
const OVERWORLD_COLS = 96;
const OVERWORLD_ROWS = 48;
let OVERWORLD_GRID = Array(OVERWORLD_ROWS).fill(null).map(() => Array(OVERWORLD_COLS).fill('Grass'));

const DUNGEON_COLS = 48;
const DUNGEON_ROWS = 32;
let DUNGEON_GRID = Array(DUNGEON_ROWS).fill(null).map(() => Array(DUNGEON_COLS).fill('StoneFloor'));

function buildGrids() {
  // Overworld Generation
  for (let r = 0; r < OVERWORLD_ROWS; r++) {
    for (let c = 0; c < OVERWORLD_COLS; c++) {
      if (r === 0 || r === OVERWORLD_ROWS - 1 || c === 0 || c === OVERWORLD_COLS - 1) {
        OVERWORLD_GRID[r][c] = 'Mountain';
        continue;
      }
      if (c === 32) {
        OVERWORLD_GRID[r][c] = 'Water';
        continue;
      }
      if (c === 64) {
        OVERWORLD_GRID[r][c] = (r === 24 || r === 25) ? 'Grass' : 'Mountain';
        continue;
      }
      if (c < 32) {
        if (r === 12) OVERWORLD_GRID[r][c] = 'Path';
        if (c === 16 && r >= 12 && r <= 28) OVERWORLD_GRID[r][c] = 'Path';
        if (r === 28 && c >= 16 && c <= 32) OVERWORLD_GRID[r][c] = 'Path';
      }
      if (c >= 33 && c < 64) {
        if (r > 30) {
          OVERWORLD_GRID[r][c] = 'Sand';
        } else {
          if (r === 28 && c <= 48) OVERWORLD_GRID[r][c] = 'Path';
          if (c === 48 && r >= 12 && r <= 28) OVERWORLD_GRID[r][c] = 'Path';
          if (r === 12 && c >= 48) OVERWORLD_GRID[r][c] = 'Path';
        }
      }
      if (c >= 65) {
        if (r === 24) OVERWORLD_GRID[r][c] = 'Path';
        if (c === 80 && r >= 10 && r <= 24) OVERWORLD_GRID[r][c] = 'Path';
        if (r === 10 && c >= 80) OVERWORLD_GRID[r][c] = 'Path';
      }
    }
  }
  OVERWORLD_GRID[28][32] = 'Water'; // Originally broken bridge

  // Dungeon Generation (Stone labyrinth)
  for (let r = 0; r < DUNGEON_ROWS; r++) {
    for (let c = 0; c < DUNGEON_COLS; c++) {
      if (r === 0 || r === DUNGEON_ROWS - 1 || c === 0 || c === DUNGEON_COLS - 1) {
        DUNGEON_GRID[r][c] = 'StoneWall';
        continue;
      }
      // Add custom walls to create room structures
      if (c === 16 && r > 4 && r < 28 && r !== 16) {
        DUNGEON_GRID[r][c] = 'PrisonBars';
      }
      if (c === 32 && r > 4 && r < 28 && r !== 16) {
        DUNGEON_GRID[r][c] = 'StoneWall';
      }
      if (r === 16 && c > 8 && c < 40 && c !== 16 && c !== 32) {
        DUNGEON_GRID[r][c] = 'StoneWall';
      }
    }
  }
}
buildGrids();

// --- CHIPTUNE WEB AUDIO ENGINE ---
class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmInterval = null;
    this.bgmIndex = 0;
    this.currentTheme = 'overworld';
    
    this.overworldMelody = [
      329.63, 349.23, 392.00, 440.00, 392.00, 349.23, 329.63, 293.66,
      329.63, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 493.88
    ];
    this.dungeonMelody = [
      110.00, 116.54, 130.81, 116.54, 146.83, 130.81, 110.00, 98.00,
      110.00, 110.00, 146.83, 130.81, 164.81, 146.83, 110.00, 116.54
    ];
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.startBGM();
    }
  }

  playSlash() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playMagic() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playDash() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playHurt() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.setValueAtTime(80, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playShield() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.setValueAtTime(650, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playLevelUp() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  playChest() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [392.00, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.05, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  playInteract() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(392.00, this.ctx.currentTime);
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playVictory() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const fan = [523.25, 523.25, 523.25, 523.25, 659.25, 587.33, 659.25, 783.99];
    const lens = [0.12, 0.12, 0.12, 0.24, 0.24, 0.12, 0.12, 0.6];
    let running = now;
    fan.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, running);
      gain.gain.setValueAtTime(0.06, running);
      gain.gain.exponentialRampToValueAtTime(0.001, running + lens[i] - 0.02);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(running);
      osc.stop(running + lens[i]);
      running += lens[i];
    });
  }

  playPickup() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, this.ctx.currentTime);
    osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  startBGM() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);
    this.bgmInterval = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const melody = this.currentTheme === 'overworld' ? this.overworldMelody : this.dungeonMelody;
      osc.frequency.setValueAtTime(melody[this.bgmIndex], this.ctx.currentTime);
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
      this.bgmIndex = (this.bgmIndex + 1) % melody.length;
    }, 280);
  }

  setTheme(themeName) {
    if (this.currentTheme !== themeName) {
      this.currentTheme = themeName;
      this.bgmIndex = 0;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

const sfx = new RetroAudio();

// --- MAIN GAME COMPONENT ---
export default function App() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // UI states
  const [gameState, setGameState] = useState('menu'); // menu, playing, dialog, gameover, victory
  const [selectedHero, setSelectedHero] = useState('Knight');
  const [currentMapType, setCurrentMapType] = useState('Overworld'); // Overworld or Dungeon
  const [crtActive, setCrtActive] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  // Dialog HUD variables
  const [dialogue, setDialogue] = useState({ speaker: '', portrait: '', text: '', action: null });
  const [hudStats, setHudStats] = useState({ hp: 100, maxHp: 100, level: 1, xp: 0, nextXp: 50, quest: "Speak to Woodcutter" });

  const handleMuteToggle = () => {
    const val = sfx.toggleMute();
    setAudioMuted(val);
  };

  // Core Game State references (Optimized physics pipeline)
  const engine = useRef({
    player: {
      x: 80, y: 190, speed: 64, w: 10, h: 10, hp: 100, maxHp: 100, level: 1, xp: 0, nextXp: 50,
      dir: 1, isMoving: false, dashTimer: 0, dashCooldown: 0, attackTimer: 0, invuln: 0,
      shieldActive: false
    },
    camera: { x: 80, y: 190 },
    keys: { up: false, down: false, left: false, right: false, a: false, b: false },
    entities: [],
    particles: [],
    projectiles: [],
    activeQuest: 0, // 0: Woodcutter, 1: Slaughter Orcs, 2: Wyrm Sand Key, 3: Castle Dungeon
    orcsKilled: 0,
    hasKey: false,
    bridgeFixed: false,
    shake: 0,
    lastTime: 0
  });

  // Observe container sizing responsive resize
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setCanvasSize({ w: Math.floor(entry.contentRect.width), h: Math.floor(entry.contentRect.height) });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initiate World Data & Placement on Choice
  const handleGameStart = (hero) => {
    sfx.init();
    sfx.setTheme('overworld');
    setSelectedHero(hero);
    setCurrentMapType('Overworld');

    const unselected = ['Knight', 'Rogue', 'Ranger'].filter(h => h !== hero);
    const eng = engine.current;

    // Player Initializer
    eng.player = {
      x: 80, y: 190, speed: 72, w: 10, h: 10, hp: 100, maxHp: 100, level: 1, xp: 0, nextXp: 50,
      dir: 1, isMoving: false, dashTimer: 0, dashCooldown: 0, attackTimer: 0, invuln: 0,
      shieldActive: false
    };
    eng.camera = { x: 80, y: 190 };
    eng.activeQuest = 0;
    eng.orcsKilled = 0;
    eng.hasKey = false;
    eng.bridgeFixed = false;
    OVERWORLD_GRID[28][32] = 'Water'; // Ensure default overworld state

    // Entity Spawn Set
    eng.entities = [
      // Companions & Advisors
      { type: 'NPC', name: 'Woodcutter', sprite: 'Knight', variant: 'Woodcutter', x: 256, y: 180, w: 10, h: 10, dir: -1 },
      { type: 'NPC', name: unselected[0], sprite: 'Knight', variant: unselected[0], x: 128, y: 120, w: 10, h: 10, dir: 1 },
      { type: 'NPC', name: unselected[1], sprite: 'Knight', variant: unselected[1], x: 96, y: 250, w: 10, h: 10, dir: 1 },
      { type: 'NPC', name: 'Mage Gwydion', sprite: 'Princess', variant: 'Wizard', x: 200, y: 320, w: 10, h: 10, dir: 1 },
      
      // Chests
      { type: 'Chest', x: 160, y: 140, w: 12, h: 12, sub: 'Gold' },
      { type: 'Chest', x: 740, y: 350, w: 12, h: 12, sub: 'HPUp' },

      // Enemies
      { type: 'Enemy', name: 'Forest Orc', sprite: 'Dragon', variant: 'Orc', x: 410, y: 160, w: 12, h: 12, hp: 20, maxHp: 20, speed: 32, state: 'patrol', origX: 410 },
      { type: 'Enemy', name: 'Forest Orc', sprite: 'Dragon', variant: 'Orc', x: 440, y: 260, w: 12, h: 12, hp: 20, maxHp: 20, speed: 32, state: 'patrol', origX: 440 },
      { type: 'Enemy', name: 'Orc Scout', sprite: 'Dragon', variant: 'Orc', x: 480, y: 100, w: 12, h: 12, hp: 15, maxHp: 15, speed: 45, state: 'patrol', origX: 480 },
      { type: 'Enemy', name: 'Forest Shaman', sprite: 'Dragon', variant: 'Orc', x: 340, y: 380, w: 12, h: 12, hp: 25, maxHp: 25, speed: 20, state: 'shaman', projectileCooldown: 0 },

      // Desert Sandwyrm Mini-boss
      { type: 'Enemy', name: 'Desert Wyrm', sprite: 'Dragon', variant: 'Wyrm', x: 680, y: 640, w: 16, h: 16, hp: 80, maxHp: 80, speed: 42, state: 'wyrm', projectileCooldown: 0 }
    ];

    eng.projectiles = [];
    eng.particles = [];

    syncHud();
    setGameState('playing');
    triggerDialog("Narrator", "Wizard", "Welcome brave voyager! Talk to the local Woodcutter to start clearing your passage to the Castle dungeon Keep.");
  };

  // Switch Map to Stage 2: Dungeon
  const loadDungeonStage = () => {
    sfx.playInteract();
    sfx.setTheme('dungeon');
    setCurrentMapType('Dungeon');

    const eng = engine.current;
    eng.player.x = 80;
    eng.player.y = 250;
    eng.camera = { x: 80, y: 250 };

    // Reset dungeon layouts
    eng.entities = [
      // Loot Chests inside Dungeon cells
      { type: 'Chest', x: 200, y: 100, w: 12, h: 12, sub: 'Gold' },
      { type: 'Chest', x: 220, y: 400, w: 12, h: 12, sub: 'AttackUp' },

      // Skeleton enemies
      { type: 'Enemy', name: 'Crypt Skeleton', sprite: 'Knight', variant: 'Skeleton', x: 240, y: 160, w: 12, h: 12, hp: 35, maxHp: 35, speed: 48, state: 'chase' },
      { type: 'Enemy', name: 'Crypt Skeleton', sprite: 'Knight', variant: 'Skeleton', x: 380, y: 300, w: 12, h: 12, hp: 35, maxHp: 35, speed: 48, state: 'chase' },
      { type: 'Enemy', name: 'Crypt Sentry', sprite: 'Knight', variant: 'Skeleton', x: 420, y: 100, w: 12, h: 12, hp: 40, maxHp: 40, speed: 40, state: 'chase' },

      // Shadow Final Boss
      { type: 'Enemy', name: 'Shadow Warlord', sprite: 'Dragon', variant: 'Boss', x: 680, y: 250, w: 18, h: 18, hp: 160, maxHp: 160, speed: 52, state: 'boss', projectileCooldown: 0 },

      // Princess Amber
      { type: 'Princess', name: 'Princess Amber', sprite: 'Princess', variant: 'Princess', x: 740, y: 250, w: 12, h: 12, dir: -1 }
    ];

    eng.projectiles = [];
    eng.particles = [];
    syncHud();
    triggerDialog("Dungeon Guard", "Skeleton", "Fools! None survive the Obsidian Throne dungeon! Prepare to perish!");
  };

  const syncHud = () => {
    const p = engine.current.player;
    const overworldQuests = [
      "Find & talk to the Woodcutter",
      `Defeat Forest Orcs (${engine.current.orcsKilled}/4)`,
      "Collect Golden Dungeon Key from Sandwyrm on the Sand Beach",
      "Unlock Castle dungeon gates to the Northeast"
    ];
    const questText = currentMapType === 'Overworld' ? (overworldQuests[engine.current.activeQuest] || "Enter the Castle Gate") : "Defeat Shadow Warlord & Rescue Princess Amber";
    
    setHudStats({
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      level: p.level,
      xp: p.xp,
      nextXp: p.nextXp,
      quest: questText
    });
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const keys = engine.current.keys;
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
      
      if (e.key === 'j' || e.key === ' ') handleActionA();
      if (e.key === 'k' || e.key === 'Shift') handleActionB(true);
    };

    const handleKeyUp = (e) => {
      const keys = engine.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
      if (e.key === 'k' || e.key === 'Shift') handleActionB(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, selectedHero, currentMapType]);

  const setDirectionalInput = (dir, val) => {
    engine.current.keys[dir] = val;
  };

  // Action A: Fire Arrow / Swing Blade / Advanced Dialogues
  const handleActionA = () => {
    const eng = engine.current;
    if (gameState === 'dialog') {
      sfx.playInteract();
      setGameState('playing');
      if (dialogue.action) dialogue.action();
      return;
    }
    if (gameState !== 'playing') return;

    // Cooldown verification
    if (eng.player.attackTimer <= 0) {
      eng.player.attackTimer = selectedHero === 'Rogue' ? 0.16 : 0.32;
      
      if (selectedHero === 'Ranger') {
        sfx.playMagic();
        // Fire Arrow Projectile
        eng.projectiles.push({
          type: 'arrow',
          x: eng.player.x + (eng.player.dir === 1 ? 10 : -10),
          y: eng.player.y - 6,
          vx: eng.player.dir * 180,
          vy: 0,
          life: 2.0
        });
      } else {
        sfx.playSlash();
        // Melee Swords/Dagger sweeping hitbox
        const reach = selectedHero === 'Rogue' ? 18 : 28;
        const swingBox = {
          x: eng.player.x + (eng.player.dir === 1 ? 2 : -reach - 2),
          y: eng.player.y - 12,
          w: reach,
          h: 24
        };

        // Swing VFX particle
        eng.particles.push({
          type: 'slash',
          x: eng.player.x + (eng.player.dir === 1 ? 16 : -16),
          y: eng.player.y - 4,
          dir: eng.player.dir,
          life: 0.12, maxLife: 0.12
        });

        // Resolve swing hits
        eng.entities.forEach(ent => {
          if (ent.type === 'Enemy' && ent.hp > 0) {
            const entBox = { x: ent.x - ent.w/2, y: ent.y - ent.h, w: ent.w, h: ent.h };
            if (rectOverlap(swingBox, entBox)) {
              damageEnemy(ent, 10 + eng.player.level * 4);
            }
          }
          if (ent.type === 'Chest' && !ent.collected) {
            const chestBox = { x: ent.x - ent.w/2, y: ent.y - ent.h, w: ent.w, h: ent.h };
            if (rectOverlap(swingBox, chestBox)) {
              openChest(ent);
            }
          }
        });
      }

      // Proximity Checks for NPCs
      eng.entities.forEach(ent => {
        if (ent.type === 'NPC') {
          const dist = Math.hypot(eng.player.x - ent.x, eng.player.y - ent.y);
          if (dist < 24) interactNPC(ent);
        }
        if (ent.type === 'Princess') {
          const dist = Math.hypot(eng.player.x - ent.x, eng.player.y - ent.y);
          if (dist < 24) {
            triggerDialog("Princess Amber", "Princess", "My hero! The Dark Shadow Warlord has been vaporized! Our kingdom is saved!", () => {
              sfx.playVictory();
              setGameState('victory');
            });
          }
        }
      });
    }
  };

  // Action B: Active Defense / Cloaked Dashing / Evasive Maneuver
  const handleActionB = (isPressed) => {
    const eng = engine.current;
    if (gameState !== 'playing') return;

    if (selectedHero === 'Knight') {
      // Aegis Wall Projectile Shield Toggle
      eng.player.shieldActive = isPressed;
      if (isPressed) {
        sfx.playShield();
        eng.particles.push({ type: 'shieldFlash', x: eng.player.x, y: eng.player.y - 4, life: 0.2, maxLife: 0.2 });
      }
    } 
    else if (selectedHero === 'Ranger' && isPressed) {
      // Wind Leap Backwards
      if (eng.player.dashCooldown <= 0) {
        sfx.playDash();
        eng.player.dashTimer = 0.25;
        eng.player.dashCooldown = 1.0;
        eng.player.invuln = 0.25;

        // Propel backward
        eng.player.x -= eng.player.dir * 45;

        // Shoot spread arrows forward
        [-0.15, 0, 0.15].forEach(ang => {
          eng.projectiles.push({
            type: 'arrow',
            x: eng.player.x,
            y: eng.player.y - 6,
            vx: Math.cos(ang) * eng.player.dir * 140,
            vy: Math.sin(ang) * 140,
            life: 1.5
          });
        });
      }
    }
    else if (selectedHero === 'Rogue' && isPressed) {
      // Shadow Cloak Fast Forward Flash Teleport
      if (eng.player.dashCooldown <= 0) {
        sfx.playDash();
        eng.player.dashTimer = 0.2;
        eng.player.dashCooldown = 0.8;
        eng.player.invuln = 0.3; // Invulnerable state

        // Forward flash dash
        const originalX = eng.player.x;
        eng.player.x += eng.player.dir * 48;
        
        // Prevent flashing deep into collision boundaries
        if (checkTileCollision(eng.player.x, eng.player.y, eng.player.w, eng.player.h)) {
          eng.player.x = originalX;
        }

        // Leave shadow trail particles
        for (let i = 0; i < 4; i++) {
          eng.particles.push({
            type: 'trail',
            x: originalX + (eng.player.dir * (i * 12)),
            y: eng.player.y,
            variant: selectedHero,
            dir: eng.player.dir,
            life: 0.15 + i * 0.04,
            maxLife: 0.3
          });
        }
      }
    }
  };

  const damageEnemy = (ent, dmg) => {
    const eng = engine.current;
    ent.hp -= dmg;
    ent.hitFlash = 0.2;
    eng.shake = 5;

    // Pushback vector
    ent.x += eng.player.dir * 10;

    // Floater indicator text
    eng.particles.push({
      type: 'damageText', text: `-${dmg}`,
      x: ent.x, y: ent.y - 18, life: 0.6, maxLife: 0.6, vy: -20, color: '#ff3355'
    });

    if (ent.hp <= 0) {
      sfx.playPickup();
      eng.particles.push({ type: 'explosion', x: ent.x, y: ent.y - 6, life: 0.3, maxLife: 0.3 });
      
      // Spawn items
      eng.entities.push({ type: 'Pickup', sub: 'XP', x: ent.x, y: ent.y, val: 12 + ent.maxHp/2, w: 8, h: 8 });
      if (Math.random() > 0.4) {
        eng.entities.push({ type: 'Pickup', sub: 'Heart', x: ent.x + 8, y: ent.y, val: 20, w: 8, h: 8 });
      }

      // Check Quests
      if (ent.name.includes('Forest Orc')) {
        eng.orcsKilled++;
        if (eng.activeQuest === 1 && eng.orcsKilled >= 4) {
          eng.activeQuest = 2;
        }
      }
      if (ent.variant === 'Wyrm') {
        eng.entities.push({ type: 'Pickup', sub: 'Key', x: ent.x, y: ent.y, w: 8, h: 8 });
        triggerDialog("Spellbook System", "Wizard", "You recovered the brass Dungeon Key! Head Northeast to crack the Locked Dungeon wall gate!");
      }
      syncHud();
    } else {
      sfx.playHurt();
    }
  };

  const openChest = (chest) => {
    const eng = engine.current;
    chest.collected = true;
    sfx.playChest();
    eng.shake = 4;
    eng.particles.push({ type: 'explosion', x: chest.x, y: chest.y - 4, life: 0.2, maxLife: 0.2 });

    if (chest.sub === 'Gold') {
      eng.particles.push({ type: 'damageText', text: "+50 Gold", x: chest.x, y: chest.y - 12, life: 0.8, maxLife: 0.8, vy: -15, color: '#f7e214' });
    } else if (chest.sub === 'HPUp') {
      eng.player.maxHp += 20;
      eng.player.hp = eng.player.maxHp;
      eng.particles.push({ type: 'damageText', text: "Max HP +20!", x: chest.x, y: chest.y - 12, life: 0.8, maxLife: 0.8, vy: -15, color: '#ff8cb0' });
    } else if (chest.sub === 'AttackUp') {
      eng.player.level += 1; // Direct damage boost
      eng.particles.push({ type: 'damageText', text: "Attack Up!", x: chest.x, y: chest.y - 12, life: 0.8, maxLife: 0.8, vy: -15, color: '#00d2f7' });
    }
    syncHud();
  };

  const interactNPC = (npc) => {
    const eng = engine.current;
    sfx.playInteract();
    
    if (npc.name === 'Woodcutter') {
      if (eng.activeQuest === 0) {
        triggerDialog("Woodcutter", "Woodcutter", "Halt traveler! The river bridge is broken, and vicious Forest Orcs block the path. Cull down 4 Forest Orcs and I will fix the bridge!", () => {
          eng.activeQuest = 1;
          syncHud();
        });
      } else if (eng.activeQuest === 1) {
        triggerDialog("Woodcutter", "Woodcutter", `I need 4 Orcs cleared! You've only stopped ${eng.orcsKilled}/4 of them.`);
      } else if (eng.activeQuest === 2 && !eng.bridgeFixed) {
        triggerDialog("Woodcutter", "Woodcutter", "Outstanding! I've fully repaired the river bridge. Safe travels through the sandy beaches ahead!", () => {
          eng.bridgeFixed = true;
          OVERWORLD_GRID[28][32] = 'WoodBridge';
          syncHud();
        });
      } else {
        triggerDialog("Woodcutter", "Woodcutter", "The path is clear. May safety follow your path.");
      }
    } else if (npc.variant === 'Wizard') {
      triggerDialog("Mage Gwydion", "Wizard", "Brave one, the Dungeon Gate demands a Golden Key. Hunt down the colossal Sandwyrm deep in the southern shore!");
    } else {
      triggerDialog(npc.name, npc.variant, "Onward! Reclaim our castles and cleanse the blight!");
    }
  };

  const triggerDialog = (speaker, portrait, text, action = null) => {
    setDialogue({ speaker, portrait, text, action });
    setGameState('dialog');
  };

  // --- PHYSICS ENGINE TICK PIPELINE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;

    let animFrame;

    const runTick = (timestamp) => {
      const eng = engine.current;
      const dt = Math.min((timestamp - eng.lastTime) / 1000, 0.1);
      eng.lastTime = timestamp;

      updatePhysics(dt);
      renderGraphics(ctx, canvasSize.w, canvasSize.h);

      animFrame = requestAnimationFrame(runTick);
    };

    engine.current.lastTime = performance.now();
    animFrame = requestAnimationFrame(runTick);
    return () => cancelAnimationFrame(animFrame);
  }, [gameState, canvasSize, selectedHero, currentMapType]);

  const updatePhysics = (dt) => {
    const eng = engine.current;
    if (gameState !== 'playing') return;

    // Player Cooldown counters
    if (eng.player.attackTimer > 0) eng.player.attackTimer -= dt;
    if (eng.player.dashTimer > 0) eng.player.dashTimer -= dt;
    if (eng.player.dashCooldown > 0) eng.player.dashCooldown -= dt;
    if (eng.player.invuln > 0) eng.player.invuln -= dt;

    // Movement vectors
    let mx = 0, my = 0;
    if (eng.keys.up) my -= 1;
    if (eng.keys.down) my += 1;
    if (eng.keys.left) mx -= 1;
    if (eng.keys.right) mx += 1;

    let speed = eng.player.speed;
    if (eng.player.shieldActive) speed *= 0.4; // Shield penalty
    if (eng.player.dashTimer > 0 && selectedHero === 'Rogue') speed *= 2.8;

    if (mx !== 0 || my !== 0) {
      const len = Math.sqrt(mx*mx + my*my);
      mx = (mx / len) * speed * dt;
      my = (my / len) * speed * dt;
      eng.player.isMoving = true;
      if (mx > 0) eng.player.dir = 1;
      else if (mx < 0) eng.player.dir = -1;
    } else {
      eng.player.isMoving = false;
    }

    // Move player with collision checks
    if (mx !== 0) {
      eng.player.x += mx;
      if (checkTileCollision(eng.player.x, eng.player.y, eng.player.w, eng.player.h)) eng.player.x -= mx;
    }
    if (my !== 0) {
      eng.player.y += my;
      if (checkTileCollision(eng.player.x, eng.player.y, eng.player.w, eng.player.h)) eng.player.y -= my;
    }

    // World Map Boundaries
    const mapBoundsWidth = currentMapType === 'Overworld' ? OVERWORLD_COLS * 16 : DUNGEON_COLS * 16;
    const mapBoundsHeight = currentMapType === 'Overworld' ? OVERWORLD_ROWS * 16 : DUNGEON_ROWS * 16;
    
    eng.player.x = Math.max(8, Math.min(mapBoundsWidth - 8, eng.player.x));
    eng.player.y = Math.max(16, Math.min(mapBoundsHeight - 8, eng.player.y));

    // Transitions: Entering Castle Keep Dungeon
    if (currentMapType === 'Overworld' && eng.player.x >= 1270 && eng.player.x <= 1300 && eng.player.y >= 150 && eng.player.y <= 176 && eng.hasKey) {
       loadDungeonStage();
       return;
    }

    // Projectile Updates
    eng.projectiles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Collides with Player
      if (p.type !== 'arrow') {
        const dist = Math.hypot(eng.player.x - p.x, eng.player.y - p.y);
        if (dist < 10) {
          p.life = 0; // Destroy projectile
          if (!eng.player.shieldActive && eng.player.invuln <= 0) {
            eng.player.hp -= 15;
            eng.player.invuln = 0.4;
            eng.shake = 5;
            sfx.playHurt();
            syncHud();
            if (eng.player.hp <= 0) setGameState('gameover');
          } else if (eng.player.shieldActive) {
            // Deflected
            sfx.playInteract();
            eng.particles.push({ type: 'explosion', x: p.x, y: p.y, life: 0.15, maxLife: 0.15 });
          }
        }
      } else {
        // Arrow strikes enemies
        eng.entities.forEach(ent => {
          if (ent.type === 'Enemy' && ent.hp > 0) {
            const dist = Math.hypot(ent.x - p.x, ent.y - p.y);
            if (dist < 12) {
              p.life = 0;
              damageEnemy(ent, 8 + eng.player.level * 3);
            }
          }
        });
      }
    });
    eng.projectiles = eng.projectiles.filter(p => p.life > 0);

    // AI Behaviors
    eng.entities.forEach(ent => {
      if (ent.hitFlash > 0) ent.hitFlash -= dt;

      if (ent.type === 'Enemy' && ent.hp > 0) {
        const dx = eng.player.x - ent.x;
        const dy = eng.player.y - ent.y;
        const dist = Math.hypot(dx, dy);

        if (ent.state === 'patrol') {
          if (!ent.patrolDir) ent.patrolDir = 1;
          const px = ent.patrolDir * ent.speed * dt;
          ent.x += px;
          if (checkTileCollision(ent.x, ent.y, ent.w, ent.h) || Math.abs(ent.x - ent.origX) > 40) {
            ent.patrolDir *= -1;
            ent.x -= px;
          }
          if (dist < 80) ent.state = 'chase';
        }
        else if (ent.state === 'chase') {
          if (dist > 120 && ent.variant !== 'Skeleton') {
            ent.state = 'patrol';
          } else {
            const cx = (dx / dist) * ent.speed * dt;
            const cy = (dy / dist) * ent.speed * dt;
            ent.x += cx;
            if (checkTileCollision(ent.x, ent.y, ent.w, ent.h)) ent.x -= cx;
            ent.y += cy;
            if (checkTileCollision(ent.x, ent.y, ent.w, ent.h)) ent.y -= cy;
            ent.dir = dx > 0 ? 1 : -1;
          }
        }
        else if (ent.state === 'shaman') {
          ent.projectileCooldown -= dt;
          if (dist < 140) {
            // Keep at distance
            if (dist < 60) {
              ent.x -= (dx / dist) * ent.speed * dt;
              ent.y -= (dy / dist) * ent.speed * dt;
            }
            if (ent.projectileCooldown <= 0) {
              ent.projectileCooldown = 2.4;
              sfx.playMagic();
              const ang = Math.atan2(dy, dx);
              eng.projectiles.push({
                x: ent.x, y: ent.y - 6,
                vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60,
                type: 'magmaball', life: 3.0
              });
            }
          }
        }
        else if (ent.state === 'wyrm') {
          ent.projectileCooldown -= dt;
          if (dist < 140 && ent.projectileCooldown <= 0) {
            ent.projectileCooldown = 1.8;
            sfx.playSlash();
            const ang = Math.atan2(dy, dx);
            eng.projectiles.push({
              x: ent.x, y: ent.y - 8,
              vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80,
              type: 'sandball', life: 2.5
            });
          }
        }
        else if (ent.state === 'boss') {
          ent.projectileCooldown -= dt;
          if (dist < 160) {
            // Charge aggressive
            const bx = (dx / dist) * ent.speed * dt;
            const by = (dy / dist) * ent.speed * dt;
            ent.x += bx;
            if (checkTileCollision(ent.x, ent.y, ent.w, ent.h)) ent.x -= bx;
            ent.y += by;
            if (checkTileCollision(ent.x, ent.y, ent.w, ent.h)) ent.y -= by;
            ent.dir = dx > 0 ? 1 : -1;

            if (ent.projectileCooldown <= 0) {
              ent.projectileCooldown = 1.4;
              sfx.playMagic();
              const ang = Math.atan2(dy, dx);
              [-0.25, 0, 0.25].forEach(off => {
                eng.projectiles.push({
                  x: ent.x, y: ent.y - 8,
                  vx: Math.cos(ang + off) * 90, vy: Math.sin(ang + off) * 90,
                  type: 'shadowbolt', life: 3.0
                });
              });
            }
          }
        }

        // Touch damage collision
        if (dist < 12 && eng.player.invuln <= 0) {
          if (!eng.player.shieldActive) {
            eng.player.hp -= 10;
            eng.player.invuln = 0.5;
            eng.shake = 6;
            sfx.playHurt();
            syncHud();
            if (eng.player.hp <= 0) setGameState('gameover');
          } else {
            // Knockback bounce off shield
            ent.x -= eng.player.dir * 18;
            sfx.playShield();
          }
        }
      }

      // Pickups collisions
      if (ent.type === 'Pickup') {
        const dist = Math.hypot(eng.player.x - ent.x, eng.player.y - ent.y);
        if (dist < 12) {
          sfx.playPickup();
          if (ent.sub === 'XP') {
            eng.player.xp += ent.val;
            eng.particles.push({ type: 'damageText', text: `+${ent.val} XP`, x: eng.player.x, y: eng.player.y - 16, life: 0.6, maxLife: 0.6, vy: -15, color: '#6fe014' });
            
            if (eng.player.xp >= eng.player.nextXp) {
              eng.player.level++;
              eng.player.xp -= eng.player.nextXp;
              eng.player.nextXp = Math.floor(eng.player.nextXp * 1.5);
              eng.player.maxHp += 10;
              eng.player.hp = eng.player.maxHp;
              sfx.playLevelUp();
              eng.particles.push({ type: 'levelUp', x: eng.player.x, y: eng.player.y, life: 1.0, maxLife: 1.0 });
            }
          }
          else if (ent.sub === 'Heart') {
            eng.player.hp = Math.min(eng.player.maxHp, eng.player.hp + ent.val);
            eng.particles.push({ type: 'damageText', text: `+${ent.val} HP`, x: eng.player.x, y: eng.player.y - 16, life: 0.6, maxLife: 0.6, vy: -15, color: '#e03d50' });
          }
          else if (ent.sub === 'Key') {
            eng.hasKey = true;
            eng.activeQuest = 3;
          }
          ent.collected = true;
          syncHud();
        }
      }
    });

    eng.entities = eng.entities.filter(e => !e.collected);

    // Particles timers
    eng.particles.forEach(p => {
      p.life -= dt;
      if (p.vy) p.y += p.vy * dt;
    });
    eng.particles = eng.particles.filter(p => p.life > 0);

    // Camera follow (Smooth Lerp)
    eng.camera.x += (eng.player.x - eng.camera.x) * 0.12;
    eng.camera.y += (eng.player.y - eng.camera.y) * 0.12;
    if (eng.shake > 0) {
      eng.camera.x += (Math.random() - 0.5) * eng.shake;
      eng.camera.y += (Math.random() - 0.5) * eng.shake;
      eng.shake *= 0.9;
    }
  };

  const checkTileCollision = (x, y, w, h) => {
    const pts = [
      {px: x - w/2, py: y - h/2}, {px: x + w/2, py: y - h/2},
      {px: x - w/2, py: y}, {px: x + w/2, py: y}
    ];
    const grid = currentMapType === 'Overworld' ? OVERWORLD_GRID : DUNGEON_GRID;
    const maxC = currentMapType === 'Overworld' ? OVERWORLD_COLS : DUNGEON_COLS;
    const maxR = currentMapType === 'Overworld' ? OVERWORLD_ROWS : DUNGEON_ROWS;

    for (let pt of pts) {
      const col = Math.floor(pt.px / 16);
      const row = Math.floor(pt.py / 16);
      if (col < 0 || col >= maxC || row < 0 || row >= maxR) return true;
      
      const t = grid[row][col];
      // Locked Castle Gate
      if (currentMapType === 'Overworld' && col === 64 && (row === 24 || row === 25) && !engine.current.hasKey) {
        return true;
      }
      if (t === 'Castle' || (TILES[t] && TILES[t].solid)) return true;
    }
    return false;
  };

  const renderGraphics = (ctx, cw, ch) => {
    const eng = engine.current;
    ctx.fillStyle = '#141013';
    ctx.fillRect(0, 0, cw, ch);

    const scale = Math.max(3, Math.floor(cw / 240));

    ctx.save();
    ctx.scale(scale, scale);

    const tx = Math.floor(cw / (2 * scale) - eng.camera.x);
    const ty = Math.floor(ch / (2 * scale) - eng.camera.y);
    ctx.translate(tx, ty);

    // Visible window optimizing calculations
    const minCol = Math.max(0, Math.floor((-tx) / 16));
    const maxCol = currentMapType === 'Overworld' ? Math.min(OVERWORLD_COLS - 1, Math.floor((-tx + cw / scale) / 16) + 1) : Math.min(DUNGEON_COLS - 1, Math.floor((-tx + cw / scale) / 16) + 1);
    const minRow = Math.max(0, Math.floor((-ty) / 16));
    const maxRow = currentMapType === 'Overworld' ? Math.min(OVERWORLD_ROWS - 1, Math.floor((-ty + ch / scale) / 16) + 1) : Math.min(DUNGEON_ROWS - 1, Math.floor((-ty + ch / scale) / 16) + 1);

    const grid = currentMapType === 'Overworld' ? OVERWORLD_GRID : DUNGEON_GRID;

    // --- Draw Tile Map ---
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const t = grid[r][c];
        if (currentMapType === 'Overworld') {
          TILES['Grass'].draw(ctx, c * 16, r * 16);
          if (t === 'Castle') {
            drawPixelSprite(ctx, SPRITES['Castle'], c * 16, r * 16, 1, 'Castle');
          } else if (t !== 'Grass' && TILES[t]) {
            TILES[t].draw(ctx, c * 16, r * 16);
          }
        } else {
          // Dungeon Stage
          TILES['StoneFloor'].draw(ctx, c * 16, r * 16);
          if (t !== 'StoneFloor' && TILES[t]) {
            TILES[t].draw(ctx, c * 16, r * 16);
          }
        }
      }
    }

    // Lock Barrier Gate indicator
    if (currentMapType === 'Overworld' && !eng.hasKey) {
      ctx.fillStyle = '#ff3355';
      ctx.fillRect(64 * 16, 24 * 16, 4, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(64 * 16 + 1, 24 * 16 + 12, 2, 8);
    }

    // --- Sort & Render Entities ---
    const drawables = [...eng.entities];
    
    // Add Player to drawable queue
    drawables.push({
      type: 'Player',
      x: eng.player.x, y: eng.player.y,
      w: eng.player.w, h: eng.player.h,
      sprite: 'Knight', variant: selectedHero,
      dir: eng.player.dir,
      isMoving: eng.player.isMoving,
      flash: eng.player.invuln > 0
    });

    drawables.sort((a, b) => a.y - b.y).forEach(ent => {
      ctx.fillStyle = 'rgba(20, 16, 19, 0.45)';
      ctx.beginPath();
      ctx.ellipse(ent.x, ent.y - 1, ent.w/2 + 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const bob = ent.isMoving ? Math.abs(Math.sin(Date.now() / 90)) * 2 : 0;

      if (ent.type === 'Pickup') {
        const spin = Math.sin(Date.now() / 150) * 3;
        ctx.fillStyle = ent.sub === 'XP' ? '#6fe014' : ent.sub === 'Key' ? '#f7e214' : '#e03d50';
        ctx.fillRect(ent.x - 3, ent.y - 6 + spin, 6, 6);
      } 
      else if (ent.type === 'Chest') {
        if (!ent.collected) {
          drawPixelSprite(ctx, SPRITES['Chest'], ent.x, ent.y - 8, 1, 'Knight');
        } else {
          // Open state chest
          ctx.fillStyle = '#946629';
          ctx.fillRect(ent.x - 6, ent.y - 8, 12, 8);
          ctx.fillStyle = '#f7e214';
          ctx.fillRect(ent.x - 4, ent.y - 6, 8, 2);
        }
      }
      else {
        drawPixelSprite(ctx, SPRITES[ent.sprite], ent.x, ent.y - 8 - bob, ent.dir, ent.variant, ent.flash);
      }

      // Active Shield VFX Render
      if (ent.type === 'Player' && eng.player.shieldActive) {
        ctx.strokeStyle = '#00d2f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ent.x + (ent.dir * 4), ent.y - 4, 10, -Math.PI/2, Math.PI/2);
        ctx.stroke();
      }

      if (ent.type === 'Enemy' && ent.hp < ent.maxHp) {
        ctx.fillStyle = '#141013';
        ctx.fillRect(ent.x - 8, ent.y - 20, 16, 3);
        ctx.fillStyle = '#e03d50';
        ctx.fillRect(ent.x - 8, ent.y - 20, 16 * (ent.hp/ent.maxHp), 3);
      }
    });

    // Draw projectiles
    eng.projectiles.forEach(p => {
      ctx.fillStyle = p.type === 'arrow' ? '#c2c1e8' : p.type === 'magmaball' ? '#df7126' : '#76428a';
      if (p.type === 'arrow') {
        ctx.fillRect(p.x - 3, p.y, 6, 1.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.type === 'shadowbolt' ? 3 : 2, 0, Math.PI*2);
        ctx.fill();
      }
    });

    // Draw particles
    eng.particles.forEach(p => {
      if (p.type === 'damageText') {
        ctx.fillStyle = p.color || '#ffffff';
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      }
      else if (p.type === 'levelUp') {
        ctx.fillStyle = `rgba(247, 226, 20, ${p.life / p.maxLife})`;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("LEVEL UP!", p.x, p.y - 24 + (p.life * 10));
      }
      else if (p.type === 'slash') {
        ctx.strokeStyle = `rgba(255,255,255, ${p.life / p.maxLife})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, p.dir === 1 ? -Math.PI/3 : Math.PI, p.dir === 1 ? Math.PI/3 : Math.PI + Math.PI/3);
        ctx.stroke();
      }
      else if (p.type === 'explosion') {
        ctx.fillStyle = '#ff8cb0';
        ctx.beginPath();
        ctx.arc(p.x, p.y, (1 - p.life/p.maxLife) * 10, 0, Math.PI*2);
        ctx.fill();
      }
      else if (p.type === 'shieldFlash') {
        ctx.strokeStyle = `rgba(0, 210, 247, ${p.life / p.maxLife})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14 * (1 - p.life / p.maxLife), 0, Math.PI * 2);
        ctx.stroke();
      }
      else if (p.type === 'trail') {
        ctx.globalAlpha = p.life / p.maxLife * 0.4;
        drawPixelSprite(ctx, SPRITES['Knight'], p.x, p.y - 8, p.dir, p.variant, false);
        ctx.globalAlpha = 1.0;
      }
    });

    ctx.restore();
  };

  return (
    <div className="fixed inset-0 bg-[#141013] overflow-hidden flex flex-col select-none touch-none" ref={containerRef}>
      
      {/* Visual scanning overlay */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .font-pixel { font-family: 'Press Start 2P', monospace; }
        .crt::after {
          content: " "; display: block; position: absolute; top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
          z-index: 20; background-size: 100% 4px, 3px 100%; pointer-events: none;
        }
      `}} />

      {/* --- CORE CANVAS FRAME --- */}
      <div className={`relative flex-grow w-full bg-black shadow-inner overflow-hidden ${crtActive ? 'crt' : ''}`}>
        <canvas 
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="block w-full h-full"
        />

        {/* --- STATS OVERLAY --- */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none">
            <div className="flex items-center gap-2 bg-[#1b1c2c]/90 p-2 rounded-md border-2 border-[#c2c1e8] shadow-lg">
              <span className="font-pixel text-[8px] text-white">HP</span>
              <div className="w-24 sm:w-36 h-3 bg-black border border-[#646985] rounded overflow-hidden">
                <div 
                  className="h-full bg-[#e03d50]" 
                  style={{ width: `${Math.max(0, (hudStats.hp / hudStats.maxHp) * 100)}%` }}
                />
              </div>
              <span className="font-pixel text-[8px] text-white">{hudStats.hp}/{hudStats.maxHp}</span>
            </div>

            <div className="flex items-center gap-2 bg-[#1b1c2c]/90 p-2 rounded-md border-2 border-[#6fe014] shadow-lg">
              <span className="font-pixel text-[8px] text-[#6fe014]">LV {hudStats.level}</span>
              <div className="w-20 sm:w-28 h-2 bg-black border border-[#2c6114] rounded overflow-hidden">
                <div 
                  className="h-full bg-[#6fe014]" 
                  style={{ width: `${Math.min(100, (hudStats.xp / hudStats.nextXp) * 100)}%` }}
                />
              </div>
              <span className="font-pixel text-[6px] text-white">XP {hudStats.xp}/{hudStats.nextXp}</span>
            </div>

            <div className="bg-[#141013]/90 border border-[#f7e214] p-2 rounded max-w-xs">
              <span className="font-pixel text-[7px] text-[#f7e214] uppercase block mb-1">Quest Log:</span>
              <span className="font-pixel text-[6px] text-[#b2bec7] leading-relaxed">{hudStats.quest}</span>
            </div>
          </div>
        )}

        {/* --- DIALOG COMPONENT --- */}
        {gameState === 'dialog' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl z-30 bg-[#1b1c2c]/95 border-4 border-[#c2c1e8] p-4 rounded-lg flex items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 bg-black border-2 border-[#646985] rounded flex-shrink-0 flex items-center justify-center p-1 relative overflow-hidden">
              <div className={`w-8 h-8 rounded-full ${
                dialogue.portrait === 'Knight' ? 'bg-[#c2c1e8]' :
                dialogue.portrait === 'Rogue' ? 'bg-[#323c39]' :
                dialogue.portrait === 'Ranger' ? 'bg-[#2c6114]' :
                dialogue.portrait === 'Wizard' ? 'bg-[#00d2f7]' :
                dialogue.portrait === 'Woodcutter' ? 'bg-[#946629]' : 'bg-[#ff8cb0]'
              }`} />
              <div className="absolute bottom-1 font-pixel text-[5px] text-center w-full text-white bg-black/40">
                {dialogue.portrait}
              </div>
            </div>
            <div className="flex-grow flex flex-col gap-1">
              <h4 className="font-pixel text-[9px] text-[#f7e214]">{dialogue.speaker}</h4>
              <p className="font-pixel text-[7px] text-[#b2bec7] leading-loose">{dialogue.text}</p>
            </div>
            <button 
              onClick={handleActionA}
              className="font-pixel text-[8px] text-[#6fe014] animate-bounce px-2 py-1 bg-black border border-[#646985] rounded self-end focus:outline-none"
            >
              ▶
            </button>
          </div>
        )}

        {/* --- START MENU PANEL --- */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-40 bg-[#141013]/90 flex flex-col items-center justify-center p-4">
            <h1 className="font-pixel text-2xl sm:text-4xl text-[#f7e214] mb-2 tracking-wider text-center" style={{ textShadow: '4px 4px 0px #901e38' }}>
              KINGDOM QUEST
            </h1>
            <p className="font-pixel text-[#646985] text-[8px] sm:text-[10px] mb-8 uppercase text-center">
              16-Bit Interactive Action RPG
            </p>

            <div className="bg-[#1b1c2c] border-4 border-[#646985] p-6 rounded-lg max-w-md w-full shadow-2xl flex flex-col items-center">
              <h2 className="font-pixel text-[10px] text-white mb-6">SELECT YOUR HERO:</h2>
              <div className="grid grid-cols-3 gap-3 w-full">
                {['Knight', 'Rogue', 'Ranger'].map(cls => (
                  <button
                    key={cls}
                    onClick={() => handleGameStart(cls)}
                    className="py-3 bg-[#901e38] border-b-4 border-black hover:bg-[#e03d50] active:translate-y-1 active:border-b-0 text-white font-pixel text-[8px] rounded uppercase focus:outline-none"
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- GAME OVER SCREEN --- */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
            <h2 className="font-pixel text-3xl text-[#e03d50] mb-4 tracking-widest text-center" style={{ textShadow: '4px 4px 0px #141013' }}>
              YOU PERISHED
            </h2>
            <p className="font-pixel text-[#646985] text-[8px] mb-8 text-center leading-loose">
              The darkness consumed the realm. Reclaim your honor.
            </p>
            <button
              onClick={() => setGameState('menu')}
              className="px-6 py-3 bg-[#2c6114] border-b-4 border-black hover:bg-[#6fe014] font-pixel text-[9px] text-white rounded uppercase focus:outline-none"
            >
              Restart Quest
            </button>
          </div>
        )}

        {/* --- VICTORY SCREEN --- */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
            <h2 className="font-pixel text-3xl text-[#f7e214] mb-4 tracking-widest text-center animate-bounce" style={{ textShadow: '4px 4px 0px #2c6114' }}>
              VICTORY!
            </h2>
            <p className="font-pixel text-[#6fe014] text-[8px] mb-8 text-center leading-loose">
              You defeated the Shadow Warlord and rescued the Princess!
            </p>
            <button
              onClick={() => setGameState('menu')}
              className="px-6 py-3 bg-[#901e38] border-b-4 border-black hover:bg-[#e03d50] font-pixel text-[9px] text-white rounded uppercase focus:outline-none"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* --- RETRO HARDWARE SKIN --- */}
      <div className="h-44 sm:h-52 bg-[#333c57] border-t-8 border-[#141013] w-full flex flex-col justify-between p-3 sm:p-5 relative z-30 shadow-2xl">
        <div className="flex justify-between items-center w-full border-b border-[#646985]/30 pb-2 mb-2">
          <span className="font-pixel text-[7px] sm:text-[9px] text-[#c2c1e8] tracking-widest uppercase opacity-75">
            ★ SYSTEM ADVANCE ★
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setCrtActive(!crtActive)}
              className={`px-2 py-1 rounded font-pixel text-[6px] sm:text-[7px] border-b-2 active:translate-y-0.5 ${
                crtActive ? 'bg-[#6fe014] border-[#2c6114] text-black' : 'bg-[#901e38] border-black text-white'
              }`}
            >
              CRT: {crtActive ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleMuteToggle}
              className={`px-2 py-1 rounded font-pixel text-[6px] sm:text-[7px] border-b-2 active:translate-y-0.5 ${
                audioMuted ? 'bg-[#901e38] border-black text-white' : 'bg-[#6fe014] border-[#2c6114] text-black'
              }`}
            >
              SOUND: {audioMuted ? 'MUTED' : 'ON'}
            </button>
          </div>
        </div>

        {/* Handheld Controllers */}
        <div className="flex-grow flex justify-between items-center px-2 sm:px-6">
          
          {/* Complete 4-Way D-Pad Directionals */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
            {/* Horizontal Bridge */}
            <div className="absolute w-20 sm:w-24 h-8 sm:h-9 bg-[#1b1c2c] rounded border-y border-[#c2c1e8]/20 shadow-lg flex justify-between items-center px-1">
              <button 
                onPointerDown={() => setDirectionalInput('left', true)}
                onPointerUp={() => setDirectionalInput('left', false)}
                onPointerLeave={() => setDirectionalInput('left', false)}
                className="w-6 h-6 rounded active:bg-[#6fe014] text-white text-[10px] font-pixel flex items-center justify-center focus:outline-none select-none"
              >
                ◀
              </button>
              <button 
                onPointerDown={() => setDirectionalInput('right', true)}
                onPointerUp={() => setDirectionalInput('right', false)}
                onPointerLeave={() => setDirectionalInput('right', false)}
                className="w-6 h-6 rounded active:bg-[#6fe014] text-white text-[10px] font-pixel flex items-center justify-center focus:outline-none select-none"
              >
                ▶
              </button>
            </div>
            {/* Vertical Bridge */}
            <div className="absolute h-20 sm:h-24 w-8 sm:w-9 bg-[#1b1c2c] rounded border-x border-[#c2c1e8]/20 shadow-lg flex flex-col justify-between items-center py-1">
              <button 
                onPointerDown={() => setDirectionalInput('up', true)}
                onPointerUp={() => setDirectionalInput('up', false)}
                onPointerLeave={() => setDirectionalInput('up', false)}
                className="w-6 h-6 rounded active:bg-[#6fe014] text-white text-[10px] font-pixel flex items-center justify-center focus:outline-none select-none"
              >
                ▲
              </button>
              <button 
                onPointerDown={() => setDirectionalInput('down', true)}
                onPointerUp={() => setDirectionalInput('down', false)}
                onPointerLeave={() => setDirectionalInput('down', false)}
                className="w-6 h-6 rounded active:bg-[#6fe014] text-white text-[10px] font-pixel flex items-center justify-center focus:outline-none select-none"
              >
                ▼
              </button>
            </div>
            <div className="absolute w-4 h-4 bg-black rounded-full pointer-events-none border border-[#646985]" />
          </div>

          {/* Action Face Buttons */}
          <div className="flex gap-4 sm:gap-6 transform -rotate-12">
            <div className="flex flex-col items-center">
              <button 
                onPointerDown={() => handleActionB(true)}
                onPointerUp={() => handleActionB(false)}
                onPointerLeave={() => handleActionB(false)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#2c6114] border-b-4 border-[#142a07] active:border-b-0 active:translate-y-1 flex items-center justify-center text-[#6fe014] font-pixel text-xs sm:text-sm shadow-xl cursor-pointer select-none"
              >
                B
              </button>
              <span className="font-pixel text-[5px] sm:text-[6px] text-[#c2c1e8] mt-2 tracking-widest uppercase">
                {selectedHero === 'Knight' ? 'SHIELD' : selectedHero === 'Ranger' ? 'LEAP' : 'CLOAK'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <button 
                onPointerDown={handleActionA}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#901e38] border-b-4 border-black active:border-b-0 active:translate-y-1 flex items-center justify-center text-white font-pixel text-xs sm:text-sm shadow-xl cursor-pointer select-none"
              >
                A
              </button>
              <span className="font-pixel text-[5px] sm:text-[6px] text-[#c2c1e8] mt-2 tracking-widest uppercase">ATTACK</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}