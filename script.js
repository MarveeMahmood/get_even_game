// =====================================================================
//  Get Even!
// =====================================================================

// ===================== Config =====================

const GAME_SECONDS = 30;
const HURRY_SECONDS = 5;    // border pulses red for the last few seconds
const SOUND_VOLUME = 1.0;   // master volume for synth sounds (0 – 1.5)
const MAX_MARKS = 10;       // damage marks kept on the monster at once
const BOARD_SIZE = 10;      // top-10 list per level

const DIFFICULTY = {
    // size: monster px (stays the same all game)
    // defendEvery: ms between defences · defendMs: how long it defends
    // stars: score needed for ⭐⭐ and ⭐⭐⭐
    easy:   { name: "Easy",   size: 80, defendEvery: [4000, 6500], defendMs: 800,  stars: [15, 25] },
    medium: { name: "Medium", size: 64, defendEvery: [3000, 5000], defendMs: 950,  stars: [12, 20] },
    hard:   { name: "Hard",   size: 50, defendEvery: [2000, 3800], defendMs: 1100, stars: [8, 15] },
};

// big comic word where you hit
const SOUND_WORDS = {
    heart: { text: "MUAH!",    color: "#ff4fa3" },
    egg:   { text: "SPLAT!",   color: "#fde047" },
    punch: { text: "POW!",     color: "#f97316" },
    shoe:  { text: "WHACK!",   color: "#38bdf8" },
    zap:   { text: "BZZZT!",   color: "#a5f3fc" },
    trash: { text: "SPLOOSH!", color: "#a3e635" },
};

// personal game-over message: who = opponent name (or the player's name)
const GAME_OVER_MESSAGES = {
    classic: {
        good: (who) => `${who} cleared the arcade! 👾`,
        low:  () => "Insert coin to try again 🪙",
    },
    teddy: {
        good: (_who, weapon) => weapon === "heart" ? "Teddy loves you forever 🧸💕" : "Teddy needs a hug now... 🥺",
        low:  () => "Teddy is still waiting to play... 🧸",
    },
    robot: {
        good: () => "System shutdown complete. Robot uninstalled. 💻",
        low:  () => "Firewall too strong... reboot and retry. 🔁",
    },
    alien: {
        good: () => "Earth is safe! Alien sent back home. 🚀",
        low:  () => "Houston, we have a problem... 🛸",
    },
    ex: {
        good: (who) => `${who} is good to go! 💅 Blocked, deleted, forgotten.`,
        low:  () => "Still checking their stories? 👀 Try again.",
    },
    boss: {
        good: (_who, _weapon, score) => `Two weeks' notice? Nah, ${score} hits. Best resignation ever! 📦`,
        low:  () => "Your ex-boss wants that report by Monday... 📋 Try again.",
    },
};

// animated background for each battle (runs while the game is playing)
const BACKGROUNDS = {
    classic: { floaters: [], popups: [] },
    teddy:   { floaters: ["☁️", "✨", "💗", "⭐", "☁️", "💗"], drift: "up", popups: [] },
    robot:   { floaters: [], popups: [] },
    alien:   { floaters: ["✦", "✧", "·", "✦", "·", "✧", "·", "✦"], drift: "twinkle", popups: [] },
    ex:      { floaters: ["💔", "💔", "🥀", "💔", "💔"], drift: "down",
               popups: ["Seen ✓✓", "u up? 👀", "I miss u 🥺", "New message 💬", "Typing...", "Can we talk?"] },
    boss:    { floaters: ["📄", "📄", "📎", "📄", "📊"], drift: "down",
               popups: ["Reply-all 📧", "URGENT!!! 🚨", "Meeting at 5pm 📅", "Per my last email...", "Quick sync? ☕", "Overtime 🕔"] },
};

// every weapon is worth the same – they only look, sound and mark differently
const WEAPONS = {
    heart: { emoji: "❤️", name: "Hearts" },
    egg:   { emoji: "🥚", name: "Eggs" },
    punch: { emoji: "👊", name: "Punches" },
    shoe:  { emoji: "👟", name: "Shoes" },
    zap:   { emoji: "⚡", name: "the Zapper" },
    trash: { emoji: "🗑️", name: "the Trash Bag" },
};

// any monster hit with the trash bag says one of these
const TRASH_LINES = ["EWW!", "What is that SMELL?!", "Is that... a tomato?!", "Gross, gross, GROSS!"];

// Ready-made battles for the "Choose your battle" popup.
// Classic's opponent is the player themselves (name: null = use the typed name).
const OPPONENTS = {
    classic: { face: "🙂", name: null },
    teddy:   { face: "🤗", name: "Best Friend" },
    robot:   { face: "🧑‍💻", name: "Hacker" },
    alien:   { face: "🧑‍🚀", name: "Astronaut" },
    ex:      { face: "😎", name: "The New Me" },
    boss:    { face: "🧑‍💼", name: "Just Resigned" },
};

// where the monster's replies appear (left box) – a screen that fits each theme
const MESSENGERS = {
    classic: { title: "👾 PLAYER 2", status: "● LIVE",  idle: "INSERT COIN..." },
    teddy:   { title: "🧸 Teddy's notes", status: "✏️", idle: "Teddy wants to play!" },
    robot:   { title: "robot@laptop:~$", status: "▮",  idle: "waiting for input_" },
    alien:   { title: "📡 INCOMING TRANSMISSION", status: "◉", idle: "...scanning deep space..." },
    ex:      { title: "💔 The Ex", status: "online",    idle: "typing..." },
    boss:    { title: "📧 Inbox", status: "",           idle: "No new emails (yet)" },
};
const MAX_MESSAGES = 4;
const DEFAULT_FACE = "🙂";
const DEFAULT_NAME = "Player";


// ===================== Monster drawings (SVG, 100 x 100) =====================

const MONSTERS = {
    classic: {
        name: "Classic", title: "the Monster", glow: "#c084fc", ink: "#2e1065",
        eyes: { l: [39, 40], r: [61, 40], size: 8, style: "classic" },
        mouth: [50, 60, 18],
        lines: ["Grr!", "Missed me... wait", "Ouch!"],
        body: `
            <line x1="36" y1="18" x2="26" y2="5" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
            <line x1="64" y1="18" x2="74" y2="5" stroke="#a855f7" stroke-width="3" stroke-linecap="round"/>
            <circle cx="26" cy="5" r="4" fill="#f0abfc"/><circle cx="74" cy="5" r="4" fill="#f0abfc"/>
            <path d="M18 42 Q18 12 50 12 Q82 12 82 42 L82 80 Q74 71 66 80 Q58 71 50 80 Q42 71 34 80 Q26 71 18 80 Z" fill="#a855f7"/>
            <path d="M26 30 Q30 20 40 18" stroke="#d8b4fe" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,
        // ghost mode: turns see-through, hits pass right through
        defense: `
            <text x="50" y="0" text-anchor="middle" font-size="17" font-weight="900" fill="#f0abfc"
                  stroke="#2e1065" stroke-width="1" font-family="Arial">BOO!</text>`,
        defenseClass: "ghost",
    },
    teddy: {
        name: "Teddy", title: "Teddy", glow: "#f9a8d4", ink: "#3b2414",
        eyes: { l: [38, 46], r: [62, 46], size: 6, style: "bead" },
        mouth: [50, 71, 13],
        lines: ["Hey! Meanie!", "Ow... I thought we were friends", "Hug me instead?"],
        loveLines: ["Aww, love you too! 🥰", "Best friends forever! 💕", "Mwah! 😘", "Hehe, that tickles!"],
        body: `
            <circle cx="22" cy="22" r="13" fill="#b07a4a"/><circle cx="78" cy="22" r="13" fill="#b07a4a"/>
            <circle cx="22" cy="22" r="7" fill="#f3c6a5"/><circle cx="78" cy="22" r="7" fill="#f3c6a5"/>
            <circle cx="50" cy="54" r="38" fill="#c68a55"/>
            <ellipse cx="50" cy="67" rx="16" ry="12" fill="#f1d3b3"/>
            <ellipse cx="50" cy="61" rx="5.5" ry="4" fill="#3b2414"/>`,
        // arms come up from the shoulders, paws over the eyes
        defense: `
            <path d="M12 104 Q6 72 30 50" stroke="#7c4f27" stroke-width="17" stroke-linecap="round" fill="none"/>
            <path d="M88 104 Q94 72 70 50" stroke="#7c4f27" stroke-width="17" stroke-linecap="round" fill="none"/>
            <path d="M12 104 Q6 72 30 50" stroke="#a8713f" stroke-width="14" stroke-linecap="round" fill="none"/>
            <path d="M88 104 Q94 72 70 50" stroke="#a8713f" stroke-width="14" stroke-linecap="round" fill="none"/>
            <ellipse cx="36" cy="46" rx="14" ry="12" fill="#a8713f" stroke="#7c4f27" stroke-width="1.5"/>
            <ellipse cx="64" cy="46" rx="14" ry="12" fill="#a8713f" stroke="#7c4f27" stroke-width="1.5"/>
            <ellipse cx="36" cy="49" rx="6" ry="5" fill="#f3c6a5"/><ellipse cx="64" cy="49" rx="6" ry="5" fill="#f3c6a5"/>
            <circle cx="30" cy="40" r="2.5" fill="#f3c6a5"/><circle cx="36" cy="38" r="2.5" fill="#f3c6a5"/><circle cx="42" cy="40" r="2.5" fill="#f3c6a5"/>
            <circle cx="58" cy="40" r="2.5" fill="#f3c6a5"/><circle cx="64" cy="38" r="2.5" fill="#f3c6a5"/><circle cx="70" cy="40" r="2.5" fill="#f3c6a5"/>`,
    },
    robot: {
        name: "Robot", title: "the Robot", glow: "#38bdf8", ink: "#22d3ee",
        eyes: { l: [38, 45], r: [62, 45], size: 7, style: "led" },
        mouth: [50, 71, 20],
        lines: ["BEEP BOOP!", "SYSTEM ERROR", "Rebooting..."],
        loveLines: ["ERROR: FEELINGS DETECTED", "01001100 01001111 01010110 01000101"],
        body: `
            <line x1="50" y1="8" x2="50" y2="18" stroke="#64748b" stroke-width="3"/>
            <circle cx="50" cy="7" r="4.5" fill="#ef4444"/>
            <rect x="7" y="40" width="9" height="18" rx="2" fill="#64748b"/>
            <rect x="84" y="40" width="9" height="18" rx="2" fill="#64748b"/>
            <rect x="14" y="18" width="72" height="66" rx="12" fill="#94a3b8" stroke="#64748b" stroke-width="2"/>
            <rect x="23" y="30" width="54" height="30" rx="8" fill="#0f172a"/>
            <rect x="33" y="64" width="34" height="14" rx="4" fill="#0f172a"/>
            <circle cx="20" cy="24" r="1.8" fill="#64748b"/><circle cx="80" cy="24" r="1.8" fill="#64748b"/>
            <circle cx="20" cy="78" r="1.8" fill="#64748b"/><circle cx="80" cy="78" r="1.8" fill="#64748b"/>`,
        // welding mask flips down
        defense: `
            <path d="M15 28 Q15 15 28 15 L72 15 Q85 15 85 28 L85 70 Q85 88 68 89 L32 89 Q15 88 15 70 Z" fill="#374151" stroke="#111827" stroke-width="2"/>
            <rect x="26" y="35" width="48" height="17" rx="3" fill="#14532d" stroke="#0b0f19" stroke-width="2.5"/>
            <line x1="30" y1="39" x2="46" y2="39" stroke="#86efac" stroke-width="1.5" opacity=".6"/>
            <circle cx="15" cy="48" r="4.5" fill="#6b7280" stroke="#111827"/><circle cx="85" cy="48" r="4.5" fill="#6b7280" stroke="#111827"/>
            <path d="M30 64 H70 M30 70 H70 M30 76 H70" stroke="#4b5563" stroke-width="2"/>
            <path d="M88 80 l8 -4 M90 86 l9 2 M86 91 l5 7 M80 94 l-1 7" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>`,
    },
    alien: {
        name: "Alien", title: "the Alien", glow: "#4ade80", ink: "#052e16",
        eyes: { l: [36, 50], r: [64, 50], size: 9, style: "alien" },
        mouth: [50, 75, 10],
        lines: ["Zorp!", "Take me to your leader", "Earthlings!"],
        zapLines: ["BZZT! My weakness!", "Not the electricity!", "Zzzorp... ⚡"],
        body: `
            <line x1="40" y1="14" x2="32" y2="2" stroke="#22c55e" stroke-width="2.5"/>
            <line x1="60" y1="14" x2="68" y2="2" stroke="#22c55e" stroke-width="2.5"/>
            <circle cx="32" cy="2" r="3.5" fill="#bbf7d0"/><circle cx="68" cy="2" r="3.5" fill="#bbf7d0"/>
            <path d="M50 10 C82 10 90 40 81 60 C72 80 60 94 50 94 C40 94 28 80 19 60 C10 40 18 10 50 10 Z" fill="#4ade80"/>
            <path d="M30 24 Q36 16 46 15" stroke="#bbf7d0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`,
        // energy shield bubble
        defense: `
            <circle cx="50" cy="52" r="49" fill="rgba(74,222,128,0.25)" stroke="#86efac" stroke-width="3"/>
            <circle cx="50" cy="52" r="42" fill="none" stroke="#bbf7d0" stroke-width="1.5" stroke-dasharray="4 6" opacity=".8"/>
            <path d="M24 30 Q34 16 50 14" stroke="#ecfccb" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`,
        defenseClass: "shield",
    },
    ex: {
        name: "The Ex", title: "the Ex", glow: "#f43f5e", ink: "#3f1d1d",
        eyes: { l: [40, 50], r: [60, 50], size: 5, style: "human" },
        mouth: [50, 70, 14],
        lines: ["We need to talk...", "It's not you, it's me", "Can I get my hoodie back?", "I've changed, I swear!"],
        loveLines: ["Don't try to win me back...", "Too late for that 💔", "Is this about the hoodie?"],
        body: `
            <path d="M18 54 Q12 12 50 10 Q88 12 82 54 L82 66 L18 66 Z" fill="#3f2a1d"/>
            <rect x="43" y="80" width="14" height="12" fill="#c99169"/>
            <path d="M24 90 Q50 100 76 90 L84 100 L16 100 Z" fill="#be123c"/>
            <ellipse cx="23" cy="56" rx="4" ry="7" fill="#c99169"/><ellipse cx="77" cy="56" rx="4" ry="7" fill="#c99169"/>
            <ellipse cx="50" cy="55" rx="27" ry="31" fill="#d9a77c"/>
            <path d="M22 46 Q24 14 50 16 Q76 14 78 46 Q70 30 58 34 Q52 24 42 34 Q30 30 22 46 Z" fill="#4a3324"/>
            <path d="M63 72 L72 64 M64 66 L67 69 M67 63 L70 66" stroke="#7f1d1d" stroke-width="1.5" stroke-linecap="round"/>`,
        // too-cool sunglasses slide down
        defense: `
            <line x1="31" y1="47" x2="23" y2="52" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="69" y1="47" x2="77" y2="52" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="29" y="42" width="19" height="14" rx="5" fill="#0f172a"/>
            <rect x="52" y="42" width="19" height="14" rx="5" fill="#0f172a"/>
            <path d="M48 46 Q50 43 52 46" stroke="#0f172a" stroke-width="3" fill="none"/>
            <path d="M32 46 L38 46 M55 46 L61 46" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/>`,
        defenseClass: "from-top",
    },
    boss: {
        name: "Ex-Boss", title: "the Ex-Boss", glow: "#fbbf24", ink: "#3f1d1d",
        eyes: { l: [40, 48], r: [60, 48], size: 4.5, style: "human" },
        mouth: [50, 73, 12],
        lines: ["You're fired! ...again!", "Let's circle back on this", "This could've been an email", "My office. NOW."],
        loveLines: ["Is this a bribe for a raise?", "HR will hear about this 💌", "Flattery won't save your job"],
        body: `
            <rect x="43" y="78" width="14" height="10" fill="#e0a96d"/>
            <path d="M14 100 Q18 84 38 82 L50 92 L62 82 Q82 84 86 100 Z" fill="#1e3a8a"/>
            <path d="M38 82 L50 92 L62 82 L58 100 L42 100 Z" fill="#f8fafc"/>
            <path d="M48 88 L52 88 L55 100 L45 100 Z" fill="#dc2626"/>
            <ellipse cx="24" cy="52" rx="4" ry="7" fill="#e0a96d"/><ellipse cx="76" cy="52" rx="4" ry="7" fill="#e0a96d"/>
            <ellipse cx="50" cy="50" rx="26" ry="30" fill="#f1c27d"/>
            <path d="M25 46 Q22 30 32 26 L31 44 Z" fill="#9ca3af"/><path d="M75 46 Q78 30 68 26 L69 44 Z" fill="#9ca3af"/>
            <ellipse cx="44" cy="28" rx="7" ry="3" fill="#fff" opacity=".35"/>
            <rect x="32" y="42" width="16" height="12" rx="3" fill="none" stroke="#1f2937" stroke-width="1.8"/>
            <rect x="52" y="42" width="16" height="12" rx="3" fill="none" stroke="#1f2937" stroke-width="1.8"/>
            <path d="M48 46 L52 46" stroke="#1f2937" stroke-width="1.8"/>
            <path d="M37 66 Q44 61 50 64 Q56 61 63 66 Q56 69 50 67 Q44 69 37 66 Z" fill="#6b7280"/>`,
        // hides behind the laptop: "in a meeting"
        defense: `
            <rect x="18" y="34" width="64" height="42" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
            <circle cx="50" cy="52" r="5" fill="#94a3b8"/>
            <rect x="58" y="38" width="20" height="14" fill="#fde047" transform="rotate(6 68 45)"/>
            <text x="68" y="48" text-anchor="middle" font-size="5.5" font-weight="bold" fill="#78350f" font-family="Arial" transform="rotate(6 68 45)">BUSY!</text>
            <text x="50" y="69" text-anchor="middle" font-size="6.5" font-weight="bold" fill="#475569" font-family="Arial">IN A MEETING</text>
            <ellipse cx="18" cy="74" rx="6" ry="5" fill="#f1c27d"/><ellipse cx="82" cy="74" rx="6" ry="5" fill="#f1c27d"/>`,
    },
};


// ===================== Face parts =====================

function eyesSVG(m, type) {
    const { l, r, size, style } = m.eyes;
    const ink = m.ink;
    const both = (fn) => fn(l[0], l[1], "l") + fn(r[0], r[1], "r");

    const humanEye = (x, y) =>
        `<ellipse cx="${x}" cy="${y}" rx="${size * 1.3}" ry="${size}" fill="#fff"/>
         <circle cx="${x}" cy="${y}" r="${size * 0.6}" fill="#3b2414"/>`;

    const normalEye = (x, y, side) => {
        if (style === "led") {
            return `<circle cx="${x}" cy="${y}" r="${size}" fill="#22d3ee"/><circle cx="${x}" cy="${y}" r="${size * 0.45}" fill="#cffafe"/>`;
        }
        if (style === "alien") {
            const rot = side === "l" ? 25 : -25;
            return `<ellipse cx="${x}" cy="${y}" rx="${size * 1.25}" ry="${size * 0.75}" fill="#020617" transform="rotate(${rot} ${x} ${y})"/>
                    <circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff"/>`;
        }
        if (style === "bead") {
            return `<circle cx="${x}" cy="${y}" r="${size}" fill="#1c1008"/><circle cx="${x - size * 0.3}" cy="${y - size * 0.3}" r="${size * 0.35}" fill="#fff"/>`;
        }
        if (style === "human") {
            return humanEye(x, y) +
                `<path d="M${x - size * 1.2} ${y + size * 1.4} Q${x} ${y + size * 2.1} ${x + size * 1.2} ${y + size * 1.4}" stroke="#a0715a" stroke-width="1.2" fill="none"/>`;
        }
        // classic
        return `<circle cx="${x}" cy="${y}" r="${size}" fill="#fff"/><circle cx="${x + 1}" cy="${y + 1}" r="${size * 0.5}" fill="${ink}"/>
                <circle cx="${x - 1}" cy="${y - 1.5}" r="${size * 0.18}" fill="#fff"/>`;
    };

    const stroke = `stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

    switch (type) {
        case "happy": // ^ ^
            return both((x, y) => `<path d="M${x - size} ${y + size * 0.4} Q${x} ${y - size * 1.1} ${x + size} ${y + size * 0.4}" ${stroke}/>`);
        case "hearts":
            return both((x, y) => {
                const s = size * 0.13;
                return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 4 C-8 -4 -14 2 -10 8 L0 17 L10 8 C14 2 8 -4 0 4 Z" fill="#ef4444" stroke="#991b1b" stroke-width="${1 / s}"/>`;
            });
        case "sad": { // normal eye + worried brows + tear
            const brows = both((x, y, side) => {
                const inner = side === "l" ? 1 : -1;
                return `<path d="M${x - size * inner * 1.1} ${y - size * 1.3} L${x + size * inner * 1.1} ${y - size * 2}" ${stroke}/>`;
            });
            const tear = `<path d="M${l[0] - 2} ${l[1] + size + 2} q-3 6 0 8 q3 -2 0 -8 z" fill="#60a5fa"/>`;
            return both(normalEye) + brows + tear;
        }
        case "squint": // > <  (flinch)
            return both((x, y, side) => side === "l"
                ? `<path d="M${x - size} ${y - size} L${x + size} ${y} L${x - size} ${y + size}" ${stroke}/>`
                : `<path d="M${x + size} ${y - size} L${x - size} ${y} L${x + size} ${y + size}" ${stroke}/>`);
        case "x": // X X
            return both((x, y) => `<path d="M${x - size} ${y - size} L${x + size} ${y + size} M${x + size} ${y - size} L${x - size} ${y + size}" ${stroke}/>`);
        case "spiral": // @ @ spinning
            return both((x, y) => {
                const k = size * 0.35;
                return `<g><path d="M${x} ${y} a${k} ${k} 0 1 1 ${k * 2} 0 a${k * 2} ${k * 2} 0 1 1 ${-k * 4} 0 a${k * 3} ${k * 3} 0 1 1 ${k * 6} 0" ${stroke} stroke-width="2"/>
                        <animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="360 ${x} ${y}" dur="0.8s" repeatCount="indefinite"/></g>`;
            });
        default:
            return both(normalEye);
    }
}

function mouthSVG(m, type) {
    const [x, y, w] = m.mouth;
    const h = w / 2;
    const stroke = `stroke="${m.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    switch (type) {
        case "big":
            return `<path d="M${x - h} ${y - 2} Q${x} ${y + w * 0.75} ${x + h} ${y - 2} Z" fill="#7f1d1d" stroke="${m.ink}" stroke-width="2"/>
                    <ellipse cx="${x}" cy="${y + w * 0.25}" rx="${w * 0.2}" ry="${w * 0.12}" fill="#f87171"/>`;
        case "o":
            return `<ellipse cx="${x}" cy="${y + 2}" rx="${w * 0.2}" ry="${w * 0.28}" fill="#450a0a" stroke="${m.ink}" stroke-width="2"/>`;
        case "frown":
            return `<path d="M${x - h} ${y + w * 0.3} Q${x} ${y - w * 0.3} ${x + h} ${y + w * 0.3}" ${stroke}/>`;
        case "wavy":
            return `<path d="M${x - h} ${y} q${w / 8} ${-w / 5} ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0" ${stroke}/>`;
        case "grit":
            return `<rect x="${x - h}" y="${y - w * 0.15}" width="${w}" height="${w * 0.4}" rx="2" fill="#fff" stroke="${m.ink}" stroke-width="2"/>
                    <path d="M${x - h / 2} ${y - w * 0.15} v${w * 0.4} M${x} ${y - w * 0.15} v${w * 0.4} M${x + h / 2} ${y - w * 0.15} v${w * 0.4}" stroke="${m.ink}" stroke-width="1.2"/>`;
        default: // smile
            return `<path d="M${x - h} ${y} Q${x} ${y + w * 0.5} ${x + h} ${y}" ${stroke}/>`;
    }
}

function blushSVG(m) {
    const { l, r, size } = m.eyes;
    return `<ellipse cx="${l[0] - 3}" cy="${l[1] + size * 1.8}" rx="${size}" ry="${size * 0.55}" fill="#fb7185" opacity=".6"/>
            <ellipse cx="${r[0] + 3}" cy="${r[1] + size * 1.8}" rx="${size}" ry="${size * 0.55}" fill="#fb7185" opacity=".6"/>`;
}

function faceSVG(m, face) {
    return eyesSVG(m, face.eyes) + mouthSVG(m, face.mouth) + (face.blush ? blushSVG(m) : "");
}

// 3 stars circling above the head
const STARS_SVG = [0, -0.4, -0.8].map((delay) =>
    `<text font-size="12" text-anchor="middle" dominant-baseline="middle">⭐
        <animateMotion dur="1.2s" begin="${delay}s" repeatCount="indefinite" path="M20,4 a30,8 0 1,0 60,0 a30,8 0 1,0 -60,0"/>
    </text>`).join("");

function monsterSVG(key, face = { eyes: "normal", mouth: "smile" }) {
    const m = MONSTERS[key];
    return `<svg viewBox="0 0 100 100" overflow="visible" xmlns="http://www.w3.org/2000/svg">
        <g class="body">${m.body}</g>
        <g class="face">${faceSVG(m, face)}</g>
        <g class="marks"></g>
        <g class="stars">${STARS_SVG}</g>
        <g class="defense ${m.defenseClass || ""}">${m.defense}</g>
    </svg>`;
}


// ===================== Damage marks (stay on the monster) =====================

const rand = (min, max) => min + Math.random() * (max - min);

const MARKS = {
    // 💋 kiss
    heart: (x, y) => `<text x="${x}" y="${y}" font-size="13" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rand(-30, 30)} ${x} ${y})">💋</text>`,

    // Sunny Plast style bandage
    punch: (x, y) => `
        <g transform="rotate(${rand(-50, 50)} ${x} ${y})">
            <rect x="${x - 12}" y="${y - 4}" width="24" height="8" rx="4" fill="#e5b083" stroke="#c48a5a" stroke-width=".6"/>
            <rect x="${x - 4}" y="${y - 3}" width="8" height="6" rx="1.5" fill="#f6dcc2"/>
            <g fill="#c48a5a">
                <circle cx="${x - 9}" cy="${y - 1.5}" r=".6"/><circle cx="${x - 9}" cy="${y + 1.5}" r=".6"/>
                <circle cx="${x - 6.5}" cy="${y}" r=".6"/><circle cx="${x + 6.5}" cy="${y}" r=".6"/>
                <circle cx="${x + 9}" cy="${y - 1.5}" r=".6"/><circle cx="${x + 9}" cy="${y + 1.5}" r=".6"/>
            </g>
        </g>`,

    // 👟 shoe-sole print with tread
    shoe: (x, y) => `
        <g transform="rotate(${rand(-35, 35)} ${x} ${y})" opacity=".8">
            <path d="M${x - 5} ${y - 12} q5 -4 10 0 q2 6 0 12 q-1 3 -1 6 q0 6 -4 6 q-4 0 -4 -6 q0 -3 -1 -6 q-2 -6 0 -12 z" fill="#1f2937"/>
            <path d="M${x - 4} ${y - 9} h8 M${x - 4.5} ${y - 5} h9 M${x - 4} ${y - 1} h8 M${x - 3} ${y + 7} h6 M${x - 3} ${y + 10} h6"
                  stroke="#6b7280" stroke-width="1"/>
        </g>`,

    // 🥚 egg white splashed on the face, dripping
    egg: (x, y) => `
        <g>
            <g fill="#fff" opacity=".95">
                <circle cx="${x}" cy="${y}" r="7"/>
                <circle cx="${x - 7}" cy="${y + 2}" r="4.5"/>
                <circle cx="${x + 7}" cy="${y - 2}" r="5"/>
                <circle cx="${x + 2}" cy="${y - 7}" r="4"/>
                <circle cx="${x - 4}" cy="${y - 5}" r="3"/>
                <rect x="${x - 4}" y="${y + 2}" width="3.5" height="0" rx="1.75">
                    <animate attributeName="height" from="0" to="${rand(9, 15)}" dur="0.9s" fill="freeze"/>
                </rect>
                <rect x="${x + 3}" y="${y + 2}" width="3" height="0" rx="1.5">
                    <animate attributeName="height" from="0" to="${rand(5, 10)}" dur="1.1s" fill="freeze"/>
                </rect>
            </g>
            <ellipse cx="${x - 2}" cy="${y - 3}" rx="3" ry="1.6" fill="#e0f2fe" opacity=".9"/>
            <path d="M${x + 8} ${y - 9} l4 -1 l-1 4 z" fill="#fef3c7" stroke="#d6d3d1" stroke-width=".5"/>
        </g>`,

    // 🗑️ squashed rotten tomato with seeds + green slime
    trash: (x, y) => Math.random() < 0.6
        ? `<g>
            <path d="M${x} ${y - 7} l3 4 l5 -1 l-1 5 l4 3 l-5 2 l1 5 l-5 -2 l-3 4 l-2 -5 l-5 1 l2 -5 l-4 -3 l5 -2 l-1 -5 l5 2 z" fill="#dc2626"/>
            <circle cx="${x}" cy="${y}" r="4" fill="#ef4444"/>
            <g fill="#fde68a"><ellipse cx="${x - 2}" cy="${y - 1}" rx="1" ry=".6"/><ellipse cx="${x + 2}" cy="${y + 1}" rx="1" ry=".6"/><ellipse cx="${x}" cy="${y + 2.5}" rx="1" ry=".6"/></g>
            <path d="M${x - 1} ${y - 8} l2 -3 l2 3" fill="#16a34a"/>
          </g>`
        : `<g fill="#65a30d" opacity=".75">
            <ellipse cx="${x}" cy="${y}" rx="8" ry="5"/>
            <circle cx="${x - 6}" cy="${y + 2}" r="3"/>
            <rect x="${x + 2}" y="${y + 2}" width="3" height="0" rx="1.5">
                <animate attributeName="height" from="0" to="${rand(6, 12)}" dur="1s" fill="freeze"/>
            </rect>
          </g>`,

    // ⚡ black burn mark with smoke rising off it
    zap: (x, y) => `
        <g>
            <circle cx="${x}" cy="${y}" r="8" fill="#0b0b0b" opacity=".55"/>
            <circle cx="${x + 3}" cy="${y - 2}" r="5" fill="#000" opacity=".5"/>
            <circle cx="${x - 4}" cy="${y + 3}" r="3.5" fill="#1f1f1f" opacity=".5"/>
            ${[0, 0.35, 0.7].map((d, i) => `
                <circle cx="${x + (i - 1) * 3}" cy="${y}" r="2" fill="#9ca3af" opacity="0">
                    <animate attributeName="cy" from="${y}" to="${y - 28}" dur="1.2s" begin="${d}s" repeatCount="3"/>
                    <animate attributeName="r" from="2" to="7" dur="1.2s" begin="${d}s" repeatCount="3"/>
                    <animate attributeName="opacity" values="0;.75;0" dur="1.2s" begin="${d}s" repeatCount="3"/>
                </circle>`).join("")}
        </g>`,
};


// ===================== Elements =====================

const monster = document.querySelector("#monster");
const gameArea = document.querySelector("#game-area");

const scoreElement = document.querySelector("#score");
const timerElement = document.querySelector("#timer");
const highScoreElement = document.querySelector("#high-score");
const highScoreByElement = document.querySelector("#high-score-by");
const matchupElement = document.querySelector("#matchup");

const startButton = document.querySelector("#start-button");
const newGameButton = document.querySelector("#new-game-button");
const levelButton = document.querySelector("#level-button");
const messenger = document.querySelector("#messenger");
const messengerTitle = messenger.querySelector(".msg-title");
const messengerStatus = messenger.querySelector(".msg-status");
const messengerList = messenger.querySelector(".msg-list");
const closeGameOverButton = document.querySelector("#close-game-over");
const levelDialog = document.querySelector("#level-dialog");
const bgLayer = gameArea.querySelector(".bg");
const setupInputs = document.querySelectorAll('input[name="monster"], input[name="weapon"], input[name="difficulty"]');

const playerNameInput = document.querySelector("#player-name");
const avatarButton = document.querySelector("#avatar-button");
const styleButton = document.querySelector("#style-button");

const styleDialog = document.querySelector("#style-dialog");
const opponentsBox = styleDialog.querySelector(".opponents");

const gameOverDialog = document.querySelector("#game-over-dialog");
const gameOverMonster = document.querySelector("#game-over-monster");
const gameOverMessage = document.querySelector("#game-over-message");
const gameOverSummary = document.querySelector("#game-over-summary");
const finalScoreElement = document.querySelector("#final-score");
const finalStarsElement = document.querySelector("#final-stars");
const finalRankElement = document.querySelector("#final-rank");
const newHighScoreElement = document.querySelector("#new-high-score");
const boardHeading = document.querySelector("#board-heading");
const leaderboardElement = document.querySelector("#leaderboard");
const playAgainButton = document.querySelector("#play-again-button");
const changeBattleButton = document.querySelector("#change-battle-button");


// ===================== Sound files =====================

const startSound = new Audio("assets/sounds/start.wav");
const gameOverSound = new Audio("assets/sounds/game-over.wav");

function playFile(audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {}); // ignore autoplay blocks
}


// ===================== Synth sound engine (Web Audio, no files) =====================

let audioCtx = null;
let master = null;
let noiseBuffer = null;

function getAudioCtx() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();

        // master volume -> compressor (loud without crackling) -> speakers
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 10;
        compressor.ratio.value = 6;
        master = audioCtx.createGain();
        master.gain.value = SOUND_VOLUME * 1.6;
        master.connect(compressor).connect(audioCtx.destination);

        noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function envelope(gainNode, t, dur, vol, attack = 0.005) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.linearRampToValueAtTime(vol, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(t, dur, { type = "sine", freq, freqEnd, vol = 0.5, attack, vibrato = 0, vibratoRate = 0 }) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    if (vibrato) {
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value = vibratoRate;
        lfoGain.gain.value = vibrato;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur);
    }
    envelope(gain, t, dur, vol, attack);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

function noise(t, dur, { filter = "lowpass", freq = 1000, freqEnd, q = 1, vol = 0.5, attack }) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const biquad = audioCtx.createBiquadFilter();
    biquad.type = filter;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(freq, t);
    if (freqEnd) biquad.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const gain = audioCtx.createGain();
    envelope(gain, t, dur, vol, attack);
    src.connect(biquad).connect(gain).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
}

const SOUNDS = {
    // 💋 kiss "mwah" + little love melody
    heart(t) {
        noise(t, 0.07, { filter: "bandpass", freq: 2800, freqEnd: 1200, q: 4, vol: 1 });
        tone(t + 0.01, 0.07, { freq: 700, freqEnd: 1300, vol: 0.4 });
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
            const start = t + 0.1 + i * 0.08;
            tone(start, 0.4, { type: "triangle", freq: f, vol: 0.5, attack: 0.01 });
            tone(start, 0.4, { type: "sine", freq: f * 2, vol: 0.15, attack: 0.01 });
        });
    },
    // 🥚 crack-crack-crack + splat
    egg(t) {
        [0, 0.035, 0.065].forEach((d, i) => {
            noise(t + d, 0.035, { filter: "highpass", freq: 2500 + i * 600, vol: 1, attack: 0.001 });
            tone(t + d, 0.025, { type: "square", freq: 1900 - i * 250, vol: 0.12, attack: 0.001 });
        });
        noise(t + 0.09, 0.3, { filter: "lowpass", freq: 1800, freqEnd: 180, q: 2, vol: 1 });
        tone(t + 0.09, 0.18, { freq: 260, freqEnd: 70, vol: 0.5 });
    },
    // 👊 crack + deep thud
    punch(t) {
        noise(t, 0.09, { filter: "lowpass", freq: 3500, freqEnd: 300, vol: 1, attack: 0.001 });
        tone(t, 0.35, { freq: 170, freqEnd: 40, vol: 1, attack: 0.002 });
        tone(t, 0.1, { type: "square", freq: 110, freqEnd: 40, vol: 0.3, attack: 0.001 });
    },
    // 👟 whoosh + slap + boing
    shoe(t) {
        noise(t, 0.16, { filter: "bandpass", freq: 400, freqEnd: 2600, q: 1.5, vol: 0.6, attack: 0.08 });
        noise(t + 0.15, 0.06, { filter: "highpass", freq: 1500, vol: 1, attack: 0.001 });
        tone(t + 0.15, 0.1, { type: "triangle", freq: 320, freqEnd: 120, vol: 0.7, attack: 0.001 });
        tone(t + 0.2, 0.45, { freq: 200, freqEnd: 550, vol: 0.5, vibrato: 40, vibratoRate: 16 });
    },
    // ⚡ electric bzzzt + crackles + sizzle
    zap(t) {
        tone(t, 0.45, { type: "sawtooth", freq: 110, freqEnd: 70, vol: 0.45, vibrato: 60, vibratoRate: 45 });
        tone(t, 0.3, { type: "square", freq: 880, freqEnd: 300, vol: 0.12 });
        [0, 0.06, 0.13, 0.22, 0.3].forEach((d) =>
            noise(t + d, 0.03, { filter: "highpass", freq: 3500, vol: 0.8, attack: 0.001 }));
        noise(t + 0.35, 0.5, { filter: "highpass", freq: 5000, vol: 0.25, attack: 0.05 });
    },
    // 🗑️ plastic bag rustle + wet SPLAT + squishy plops
    trash(t) {
        [0, 0.03, 0.06, 0.1].forEach((d) =>
            noise(t + d, 0.04, { filter: "highpass", freq: 4500, vol: 0.45, attack: 0.002 }));    // rustle
        noise(t + 0.12, 0.3, { filter: "lowpass", freq: 1400, freqEnd: 150, q: 3, vol: 1 });   // SPLAT
        tone(t + 0.12, 0.2, { freq: 220, freqEnd: 60, vol: 0.6 });
        [0.3, 0.42, 0.5].forEach((d, i) =>
            tone(t + d, 0.09, { freq: 500 - i * 90, freqEnd: 180, vol: 0.4, attack: 0.003 }));   // plop plop
    },
    // 🛡️ block: one loud metallic CLANG for every monster
    clang(t) {
        noise(t, 0.05, { filter: "highpass", freq: 3500, vol: 0.9, attack: 0.001 });
        tone(t, 0.4, { type: "square", freq: 880, vol: 0.28, attack: 0.001 });
        tone(t, 0.55, { type: "triangle", freq: 1320, vol: 0.55, attack: 0.001 });
        tone(t, 0.35, { freq: 2230, vol: 0.25, attack: 0.001 });
        tone(t, 0.25, { freq: 180, freqEnd: 120, vol: 0.4, attack: 0.001 });
    },
    miss(t) {
        noise(t, 0.15, { filter: "bandpass", freq: 600, freqEnd: 1500, q: 1, vol: 0.25, attack: 0.05 });
    },
};

function playSound(name) {
    const ctx = getAudioCtx();
    if (!ctx || !SOUNDS[name]) return;
    SOUNDS[name](ctx.currentTime + 0.01);
}


// ===================== Storage helpers =====================

function load(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage blocked (private mode etc.) – game still works
    }
}

// top-10 list per level, saved in this browser:
// [{ name, battle: "😎 The New Me vs The Ex", score }]
function getBoard(difficulty) {
    try {
        const data = JSON.parse(load("board_" + difficulty, "[]"));
        if (Array.isArray(data)) {
            return data
                .filter((e) => e && typeof e.score === "number")
                .map((e) => ({ name: String(e.name || ""), battle: String(e.battle || ""), score: e.score }));
        }
    } catch {
        // corrupted value – start a fresh list
    }
    return [];
}

// add a score; returns its rank (1-based) or 0 when it didn't make the top 10
function addToBoard(difficulty, entry) {
    const board = getBoard(difficulty);
    board.push(entry);
    board.sort((a, b) => b.score - a.score); // stable: earlier scores win ties
    const top = board.slice(0, BOARD_SIZE);
    save("board_" + difficulty, JSON.stringify(top));
    return top.indexOf(entry) + 1;
}

function getHighScore(difficulty) {
    const best = getBoard(difficulty)[0];
    return best ? { score: best.score, name: best.name } : { score: 0, name: "" };
}

function starRating(score, difficulty) {
    const [two, three] = DIFFICULTY[difficulty].stars;
    if (score >= three) return 3;
    if (score >= two) return 2;
    return score > 0 ? 1 : 0;
}


// ===================== State =====================

let score = 0;
let hits = 0;
let timeLeft = GAME_SECONDS;
let gameActive = false;
let defending = false;

// all running timers, so New Game / game over can stop everything at once
const timers = { tick: null, defense: null, defenseEnd: null, flinch: null, bgPopup: null };

function clearTimers() {
    clearInterval(timers.tick);
    clearInterval(timers.bgPopup);
    Object.keys(timers).forEach((k) => { clearTimeout(timers[k]); timers[k] = null; });
}


// ===================== Selection helpers =====================

const checked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
const selectedMonsterKey = () => checked("monster");
const selectedWeaponKey = () => checked("weapon");
const selectedDifficultyKey = () => checked("difficulty");
const selectedDifficulty = () => DIFFICULTY[selectedDifficultyKey()];

function restoreChoices() {
    ["monster", "weapon", "difficulty"].forEach((name) => {
        const value = load(name, null);
        const input = value && document.querySelector(`input[name="${name}"][value="${value}"]`);
        if (input) input.checked = true;
    });
}

function emojiCursor(emoji) {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">` +
        `<text x="50%" y="55%" font-size="30" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 20 20, crosshair`;
}

function applyWeapon() {
    gameArea.style.cursor = emojiCursor(WEAPONS[selectedWeaponKey()].emoji);
}

function showHighScore() {
    const best = getHighScore(selectedDifficultyKey());
    highScoreElement.textContent = best.score;
    highScoreByElement.textContent = best.score > 0 && best.name ? ` by ${best.name}` : "";
}

function setSetupEnabled(enabled) {
    setupInputs.forEach((input) => { input.disabled = !enabled; });
    playerNameInput.disabled = !enabled;
    avatarButton.disabled = !enabled;
    styleButton.disabled = !enabled;
    levelButton.disabled = !enabled;
    startButton.disabled = !enabled;
}

function updateLevelButton() {
    levelButton.textContent = `⚡ Level: ${selectedDifficulty().name}`;
}


// ===================== Player: own name + optional battle =====================
// The player always types their own name. Picking a battle in the popup lets
// them play as that monster's opponent ("😎 The New Me vs The Ex"). Choosing a
// different monster by hand goes back to their own name ("🙂 Marvee vs Robot").

let battle = load("battle", ""); // monster key of the chosen battle, or ""

const userName = () => playerNameInput.value.trim() || DEFAULT_NAME;

// the active battle opponent, or null when playing as yourself
function currentOpponent() {
    if (!battle || battle !== selectedMonsterKey()) return null;
    const o = OPPONENTS[battle];
    return o && o.name ? o : null; // Classic's "opponent" is the player themself
}

// "😎 The New Me" or "🙂 Marvee"
function playerLabel() {
    const o = currentOpponent();
    return o ? `${o.face} ${o.name}` : `${DEFAULT_FACE} ${userName()}`;
}

function updatePlayer() {
    const o = currentOpponent();
    avatarButton.textContent = o ? o.face : DEFAULT_FACE;
    matchupElement.textContent = `${playerLabel()}  vs  ${MONSTERS[selectedMonsterKey()].name}`;
}

// pick a ready-made battle – also selects its monster
function chooseBattle(monsterKey) {
    battle = monsterKey;
    save("battle", battle);
    if (monsterKey !== selectedMonsterKey()) {
        const card = document.querySelector(`input[name="monster"][value="${monsterKey}"]`);
        card.checked = true;
        card.dispatchEvent(new Event("change")); // redraws the monster, saves the choice
    }
    updatePlayer();
}

// popup rows:  [opponent face + name] ——vs—— [monster face + name]
function buildOpponentRows() {
    const current = battle === selectedMonsterKey() ? battle : "";

    const row = (value, left, right) => {
        const label = document.createElement("label");
        label.className = "opponent-row";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "opponent";
        input.value = value;
        input.checked = value === current;
        input.addEventListener("change", () => chooseBattle(value));
        label.append(input, left, right);
        return label;
    };

    const side = (artHTML, artText, name, className) => {
        const box = document.createElement("span");
        box.className = className;
        const art = document.createElement("span");
        art.className = "opp-art";
        if (artHTML) art.innerHTML = artHTML; // our own SVG drawing
        else art.textContent = artText;
        const text = document.createElement("span");
        text.className = "opp-name";
        text.textContent = name;
        box.append(art, text);
        return box;
    };

    const rows = [];

    Object.entries(OPPONENTS).forEach(([monsterKey, o]) => {
        const middle = document.createElement("span");
        middle.className = "opp-line";
        const word = document.createElement("span");
        word.className = "opp-word";
        word.textContent = "vs";
        middle.append(word);
        const left = side(null, o.face, o.name || userName(), "opp-left");
        const right = side(monsterSVG(monsterKey), null, MONSTERS[monsterKey].name, "opp-right");
        const label = row(monsterKey, left, right);
        label.insertBefore(middle, right);
        rows.push(label);
    });

    opponentsBox.replaceChildren(...rows);
}

function openStyleDialog() {
    buildOpponentRows();
    styleDialog.showModal();
}


// ===================== Monster: drawing, mood, size, movement =====================

// draw the selected monster fresh (no marks, normal face)
function applyMonster() {
    const key = selectedMonsterKey();
    const m = MONSTERS[key];
    monster.innerHTML = monsterSVG(key);
    monster.dataset.monster = key;
    monster.setAttribute("aria-label", m.name);
    monster.classList.remove("defending", "dizzy");
    gameArea.style.setProperty("--glow", m.glow);
    buildBackground(key);
    resetMessenger(key);
}


// ===================== Messenger: the monster's replies (left box) =====================

function resetMessenger(key) {
    const config = MESSENGERS[key];
    messenger.className = "messenger m-" + key;
    messengerTitle.textContent = config.title;
    messengerStatus.textContent = config.status;
    const idle = document.createElement("li");
    idle.className = "idle";
    idle.textContent = config.idle;
    messengerList.replaceChildren(idle);
}

function messengerSay(text) {
    const key = selectedMonsterKey();
    messengerList.querySelector(".idle")?.remove();

    const li = document.createElement("li");
    li.className = "new";
    if (key === "boss") {
        // email row: sender + subject
        const from = document.createElement("b");
        from.textContent = "Ex-Boss";
        const subject = document.createElement("span");
        subject.textContent = text;
        li.append(from, subject);
    } else {
        li.textContent = text;
    }
    messengerList.appendChild(li);

    while (messengerList.children.length > MAX_MESSAGES) messengerList.firstElementChild.remove();
    // only the newest message is highlighted
    [...messengerList.children].forEach((item) => item.classList.toggle("latest", item === li));
    setTimeout(() => li.classList.remove("new"), 400);
}


// ===================== Animated background per battle =====================

function buildBackground(key) {
    const config = BACKGROUNDS[key];
    bgLayer.className = "bg bg-" + key;
    bgLayer.replaceChildren();

    // Robot: falling green code
    if (key === "robot") {
        for (let i = 0; i < 12; i++) {
            const col = document.createElement("span");
            col.className = "code-col";
            col.textContent = Array.from({ length: 18 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
            col.style.left = (i / 12) * 100 + rand(0, 4) + "%";
            col.style.animationDuration = rand(3, 7) + "s";
            col.style.animationDelay = -rand(0, 7) + "s";
            bgLayer.appendChild(col);
        }
    }

    // Alien: a planet and a UFO flying past
    if (key === "alien") {
        bgLayer.insertAdjacentHTML("beforeend", `<span class="planet"></span><span class="ufo">🛸</span>`);
    }

    // Classic: the grid floor and stars are pure CSS (see .bg-classic)

    // floating things: hearts, clouds, papers, twinkling stars...
    config.floaters.forEach((emoji, i) => {
        const el = document.createElement("span");
        el.className = "floater drift-" + config.drift;
        el.textContent = emoji;
        el.style.left = ((i + 0.5) / config.floaters.length) * 100 + rand(-6, 6) + "%";
        el.style.top = rand(5, 90) + "%";
        el.style.fontSize = rand(14, 24) + "px";
        el.style.animationDuration = rand(5, 9) + "s";
        el.style.animationDelay = -rand(0, 9) + "s";
        bgLayer.appendChild(el);
    });
}

// The Ex / Ex-Boss: little phone/email notifications pop up while playing
function startBackgroundPopups() {
    const popups = BACKGROUNDS[selectedMonsterKey()].popups;
    if (!popups.length) return;
    timers.bgPopup = setInterval(() => {
        const el = document.createElement("span");
        el.className = "bg-popup";
        el.textContent = popups[Math.floor(Math.random() * popups.length)];
        el.style.left = rand(5, 65) + "%";
        el.style.top = rand(8, 80) + "%";
        bgLayer.appendChild(el);
        setTimeout(() => el.remove(), 2200);
    }, 1800);
}

function clearBackgroundPopups() {
    bgLayer.querySelectorAll(".bg-popup").forEach((el) => el.remove());
}

function setFace(face) {
    monster.querySelector(".face").innerHTML = faceSVG(MONSTERS[selectedMonsterKey()], face);
}

// mood depends on the weapon and how many times it's been hit
function currentMood() {
    if (selectedWeaponKey() === "heart") {
        if (hits >= 7) return { eyes: "hearts", mouth: "big", blush: true };
        if (hits >= 3) return { eyes: "happy", mouth: "big", blush: true };
        return { eyes: "normal", mouth: "smile", blush: hits > 0 };
    }
    if (hits >= 14) return { eyes: "spiral", mouth: "wavy", dizzy: true };
    if (hits >= 9) return { eyes: "x", mouth: "wavy", dizzy: true };
    if (hits >= 5) return { eyes: "sad", mouth: "frown" };
    if (hits >= 2) return { eyes: "normal", mouth: "o" };
    return { eyes: "normal", mouth: "smile" };
}

function showMood() {
    const mood = currentMood();
    setFace(mood);
    monster.classList.toggle("dizzy", !!mood.dizzy);
}

// short reaction face right after a hit, then back to the mood
function flinch(weaponKey) {
    clearTimeout(timers.flinch);
    if (weaponKey === "heart") setFace({ eyes: "happy", mouth: "big", blush: true });
    else setFace({ eyes: "squint", mouth: "grit" });
    timers.flinch = setTimeout(showMood, 280);
}

function addMark(weaponKey) {
    const marks = monster.querySelector(".marks");
    marks.insertAdjacentHTML("beforeend", `<g>${MARKS[weaponKey](rand(25, 75), rand(28, 80))}</g>`);
    while (marks.children.length > MAX_MARKS) marks.firstElementChild.remove();
}

function setMonsterSize() {
    const size = selectedDifficulty().size;
    monster.style.width = size + "px";
    monster.style.height = size + "px";
}

function moveMonster() {
    const maxX = gameArea.clientWidth - monster.offsetWidth;
    const maxY = gameArea.clientHeight - monster.offsetHeight;
    monster.style.left = Math.random() * Math.max(maxX, 0) + "px";
    monster.style.top = Math.random() * Math.max(maxY, 0) + "px";
}

function centerMonster() {
    monster.style.left = (gameArea.clientWidth - monster.offsetWidth) / 2 + "px";
    monster.style.top = (gameArea.clientHeight - monster.offsetHeight) / 2 + "px";
}


// ===================== Distraction 1: defence =====================

function scheduleDefense() {
    const [min, max] = selectedDifficulty().defendEvery;
    const faster = Math.max(0.6, 1 - score * 0.012); // defends more often as your score grows
    timers.defense = setTimeout(startDefense, rand(min, max) * faster);
}

function startDefense() {
    if (!gameActive) return;
    defending = true;
    monster.classList.add("defending");
    timers.defenseEnd = setTimeout(endDefense, selectedDifficulty().defendMs);
}

function endDefense() {
    defending = false;
    monster.classList.remove("defending");
    if (gameActive) scheduleDefense();
}


// ===================== Effects =====================

function pointInArea(event) {
    const rect = gameArea.getBoundingClientRect();
    return {
        x: event.clientX - rect.left - gameArea.clientLeft,
        y: event.clientY - rect.top - gameArea.clientTop,
    };
}

// temporary element in the game area that removes itself after its animation
function spawn(content, className, x, y, keyframes, options, isHTML = false) {
    const el = document.createElement("div");
    el.className = "fx " + className;
    if (isHTML) el.innerHTML = content;
    else el.textContent = content;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.setAttribute("aria-hidden", "true");
    gameArea.appendChild(el);

    const animation = el.animate(keyframes, { easing: "ease-out", fill: "forwards", ...options });
    animation.onfinish = () => el.remove();
    animation.oncancel = () => el.remove();
    setTimeout(() => el.remove(), (options.duration || 0) + (options.delay || 0) + 200); // safety net
    return el;
}

const fade = (from = 0.6, to = 1.1) => [
    { transform: `translate(-50%, -50%) scale(${from})`, opacity: 1 },
    { transform: `translate(-50%, -50%) scale(${to})`, opacity: 0 },
];

// a tied black garbage bag
const TRASH_BAG_SVG = `<svg viewBox="0 0 40 44" width="34" height="38">
    <path d="M14 10 Q20 4 26 10 L24 13 L16 13 Z" fill="#111827"/>
    <path d="M17 6 l-4 -4 M23 6 l4 -4" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M16 13 Q3 18 4 30 Q5 42 20 42 Q35 42 36 30 Q37 18 24 13 Z" fill="#1f2937"/>
    <path d="M10 22 Q12 30 11 36" stroke="#4b5563" stroke-width="1.5" fill="none"/>
    <path d="M27 20 Q29 26 28 32" stroke="#4b5563" stroke-width="1.5" fill="none"/>
</svg>`;

function throwProjectile(emoji, x, y) {
    const startX = gameArea.clientWidth / 2;
    const startY = gameArea.clientHeight;
    const isBag = emoji === WEAPONS.trash.emoji;
    spawn(isBag ? TRASH_BAG_SVG : emoji, "projectile", x, y, [
        { transform: `translate(-50%, -50%) translate(${startX - x}px, ${startY - y}px) scale(0.6) rotate(0deg)` },
        { transform: "translate(-50%, -50%) translate(0, 0) scale(1.1) rotate(360deg)", opacity: 1 },
        { transform: "translate(-50%, -50%) scale(1.1)", opacity: 0 },
    ], { duration: 220 }, isBag);
}

// a lightning bolt from the top of the game area down to the click
function lightningBolt(x, y) {
    const svg = `<svg viewBox="0 0 20 100" preserveAspectRatio="none" width="40" height="${Math.max(y, 1)}">
        <polyline points="10,0 4,22 14,38 5,58 15,74 8,100" fill="none" stroke="#e0f2fe" stroke-width="3"/>
        <polyline points="10,0 4,22 14,38 5,58 15,74 8,100" fill="none" stroke="#38bdf8" stroke-width="7" opacity=".45"/>
    </svg>`;
    spawn(svg, "bolt", x, 0, [
        { opacity: 1 }, { opacity: 0.3, offset: 0.3 }, { opacity: 1, offset: 0.5 }, { opacity: 0 },
    ], { duration: 350 }, true);
}

// egg white splashing out, with bits of shell
const EGG_SPLAT_SVG = `<svg viewBox="0 0 80 80" width="80" height="80">
    <path d="M40 14 C52 10 50 24 62 22 C74 22 70 36 68 42 C72 54 60 58 56 66 C48 74 38 66 30 70 C18 72 18 58 12 52 C6 42 16 36 14 28 C14 16 30 20 40 14 Z" fill="#fff" opacity=".95"/>
    <ellipse cx="34" cy="34" rx="9" ry="5" fill="#e0f2fe" opacity=".9"/>
    <circle cx="8" cy="40" r="3" fill="#fff"/><circle cx="72" cy="64" r="2.5" fill="#fff"/><circle cx="64" cy="10" r="2" fill="#fff"/>
    <path d="M6 18 l6 -8 l4 6 l4 -7 l3 10 z" fill="#fef3c7" stroke="#d6d3d1"/>
    <path d="M60 4 l8 2 l-2 6 l6 2 l-8 6 z" fill="#fef3c7" stroke="#d6d3d1"/>
</svg>`;

function playMonsterAnimation(className) {
    monster.classList.remove("hit-heart", "hit-egg", "hit-punch", "hit-shoe", "hit-zap", "hit-trash");
    void monster.offsetWidth; // restart animation
    monster.classList.add(className);
}

function hitEffect(weaponKey, x, y) {
    if (weaponKey === "heart") {
        const count = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const dx = (Math.random() - 0.5) * 80;
            spawn(i === 0 ? "💋" : "💖", "small", x, y, [
                { transform: "translate(-50%, -50%) scale(0.5)", opacity: 1 },
                { transform: `translate(calc(-50% + ${dx}px), calc(-50% - ${50 + Math.random() * 40}px)) scale(1)`, opacity: 0 },
            ], { duration: 700 + Math.random() * 300, delay: i * 40 });
        }
    } else if (weaponKey === "egg") {
        spawn(EGG_SPLAT_SVG, "splat", x, y, [
            { transform: "translate(-50%, -50%) scale(0.2) rotate(-20deg)", opacity: 1 },
            { transform: "translate(-50%, -50%) scale(1.1) rotate(0deg)", opacity: 1, offset: 0.12 },
            { transform: "translate(-50%, -50%) scale(1.1) translateY(6px)", opacity: 0 },
        ], { duration: 1000 }, true);
    } else if (weaponKey === "punch") {
        spawn("💥", "boom", x, y, fade(0.4, 1.5), { duration: 350 });
    } else if (weaponKey === "shoe") {
        spawn("👟", "projectile", x, y, [
            { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
            { transform: "translate(calc(-50% + 60px), calc(-50% - 50px)) rotate(200deg)", opacity: 1, offset: 0.5 },
            { transform: "translate(calc(-50% + 90px), calc(-50% + 30px)) rotate(400deg)", opacity: 0 },
        ], { duration: 600 });
    } else if (weaponKey === "zap") {
        lightningBolt(x, y);
        spawn("⚡", "boom", x, y, fade(0.5, 1.6), { duration: 400 });
    } else {
        trashBurst(x, y);
    }
    playMonsterAnimation("hit-" + weaponKey);
}

// 🗑️ the bag bursts: rotten veggies fly out, stink lines rise, flies buzz around
function trashBurst(x, y) {
    spawn("💥", "boom", x, y, fade(0.3, 1.1), { duration: 250 });

    ["🍅", "🥬", "🍅", "🧅", "🥔"].forEach((veg, i) => {
        const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
        const dist = 45 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        spawn(veg, "small", x, y, [
            { transform: "translate(-50%, -50%) scale(0.5) rotate(0deg)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${rand(-200, 200)}deg)`, opacity: 1, offset: 0.6 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 25}px)) scale(0.9)`, opacity: 0 },
        ], { duration: 800 });
    });

    // green stink lines
    const stink = `<svg viewBox="0 0 40 30" width="44" height="34">
        <path d="M6 28 q-4 -6 0 -12 t0 -12" stroke="#84cc16" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M20 28 q-4 -6 0 -12 t0 -12" stroke="#a3e635" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M34 28 q-4 -6 0 -12 t0 -12" stroke="#84cc16" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`;
    spawn(stink, "stink", x, y - 20, [
        { transform: "translate(-50%, -50%) translateY(0)", opacity: 0 },
        { transform: "translate(-50%, -50%) translateY(-8px)", opacity: 1, offset: 0.3 },
        { transform: "translate(-50%, -50%) translateY(-30px)", opacity: 0 },
    ], { duration: 1200 }, true);

    // two flies buzzing in little loops
    [0, 1].forEach((i) => {
        const s = i ? -1 : 1;
        spawn("🪰", "fly", x + s * 15, y - 10, [
            { transform: "translate(-50%, -50%) translate(0, 0)", opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${s * 18}px, -12px)` },
            { transform: `translate(-50%, -50%) translate(${s * 4}px, -24px)` },
            { transform: `translate(-50%, -50%) translate(${s * -14}px, -10px)` },
            { transform: `translate(-50%, -50%) translate(${s * 10}px, -30px)`, opacity: 1 },
            { transform: `translate(-50%, -50%) translate(${s * 24}px, -44px)`, opacity: 0 },
        ], { duration: 1400, easing: "linear" });
    });
}

let currentBubble = null;

function showReaction(weaponKey) {
    const m = MONSTERS[selectedMonsterKey()];
    let lines = m.lines;
    if (weaponKey === "heart" && m.loveLines) lines = m.loveLines;
    if (weaponKey === "zap" && m.zapLines) lines = m.zapLines;
    if (weaponKey === "trash") lines = TRASH_LINES;
    messengerSay(lines[Math.floor(Math.random() * lines.length)]);
}

// BLOCKED! box in the game area
function showBubble(text, x, y, className = "") {
    if (currentBubble) currentBubble.remove();
    const clampedX = Math.min(Math.max(x, 110), gameArea.clientWidth - 110);
    currentBubble = spawn(text, "bubble " + className, clampedX, Math.max(y - 58, 30), [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.05)", opacity: 1, offset: 0.12 },
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.8 },
        { transform: "translate(-50%, -50%) translateY(-12px)", opacity: 0 },
    ], { duration: 1500 });
}

// big comic sound word where you hit: MUAH! SPLAT! POW!...
function comicWord(weaponKey, x, y) {
    const word = SOUND_WORDS[weaponKey];
    const el = spawn(word.text, "comic", x, y + 6, [
        { transform: `translate(-50%, -50%) scale(0.3) rotate(${rand(-15, 15)}deg)`, opacity: 1 },
        { transform: `translate(-50%, -50%) scale(1.35) rotate(${rand(-10, 10)}deg)`, opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -50%) scale(1.15)", opacity: 1, offset: 0.7 },
        { transform: "translate(-50%, -50%) scale(1.2)", opacity: 0 },
    ], { duration: 800 });
    el.style.color = word.color;
}

function floatPoint(x, y) {
    spawn("+1", "points", x + 22, y - 10, [
        { transform: "translate(-50%, -50%) translateY(0)", opacity: 1 },
        { transform: "translate(-50%, -50%) translateY(-30px)", opacity: 0 },
    ], { duration: 700 });
}

function smallPuff(text, x, y) {
    spawn(text, "small", x, y, fade(0.6, 1.1), { duration: 400 });
}


// ===================== Hit handling =====================

function isHit(event) {
    const r = monster.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
}

gameArea.addEventListener("pointerdown", function (event) {
    if (!gameActive) return;

    const weaponKey = selectedWeaponKey();
    const { x, y } = pointInArea(event);

    if (weaponKey !== "zap") throwProjectile(WEAPONS[weaponKey].emoji, x, y);

    if (!isHit(event)) {
        smallPuff("💨", x, y);
        playSound("miss");
        return;
    }

    // monster is defending
    if (defending) {
        showBubble("BLOCKED!", x, y, "blocked");
        playSound("clang");
        return;
    }

    // ---- it's a hit! every weapon = 1 point ----
    hits++;
    score++;
    scoreElement.textContent = score;
    floatPoint(x, y);

    playSound(weaponKey);
    hitEffect(weaponKey, x, y);
    comicWord(weaponKey, x, y);
    showReaction(weaponKey);
    addMark(weaponKey);
    flinch(weaponKey);
    moveMonster();
});


// ===================== Game flow =====================

function resetRound() {
    clearTimers();
    gameActive = false;
    defending = false;
    gameArea.classList.remove("playing", "hurry");
    gameArea.querySelectorAll(".fx").forEach((el) => el.remove());
    clearBackgroundPopups();

    score = 0;
    hits = 0;
    scoreElement.textContent = 0;
    timeLeft = GAME_SECONDS;
    timerElement.textContent = timeLeft;

    applyMonster();
    applyWeapon();
    setMonsterSize();
    showHighScore();
}

function startGame() {
    if (gameActive) return;

    resetRound();
    gameActive = true;

    getAudioCtx(); // unlock audio on this click
    playFile(startSound);

    setSetupEnabled(false);
    if (gameOverDialog.open) gameOverDialog.close();

    gameArea.classList.add("playing"); // starts the background animation
    moveMonster();
    scheduleDefense();
    startBackgroundPopups();

    // on phones the options are above the game – bring the game into view
    const rect = gameArea.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
        gameArea.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    timers.tick = setInterval(function () {
        timeLeft--;
        timerElement.textContent = timeLeft;
        gameArea.classList.toggle("hurry", timeLeft <= HURRY_SECONDS);
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    clearTimers();
    gameActive = false;
    defending = false;
    monster.classList.remove("defending");
    gameArea.classList.remove("playing", "hurry");
    clearBackgroundPopups();

    const monsterKey = selectedMonsterKey();
    const weaponKey = selectedWeaponKey();
    const m = MONSTERS[monsterKey];
    const w = WEAPONS[weaponKey];
    const o = currentOpponent();
    const difficulty = selectedDifficultyKey();
    const levelName = DIFFICULTY[difficulty].name;

    // "😎 The New Me (Marvee)" or "🙂 Marvee"
    const player = o ? `${o.face} ${o.name} (${userName()})` : `${DEFAULT_FACE} ${userName()}`;
    const battleLabel = `${o ? `${o.face} ${o.name}` : `${DEFAULT_FACE} ${userName()}`} vs ${m.name}`;

    // rating + personal message
    const stars = starRating(score, difficulty);
    const messages = GAME_OVER_MESSAGES[monsterKey];
    const who = o ? o.name : userName();
    gameOverMessage.textContent = stars >= 2 ? messages.good(who, weaponKey, score) : messages.low(who, weaponKey, score);

    // top-10 list (only real scores go on the board)
    const previousBest = getHighScore(difficulty).score;
    const rank = score > 0 ? addToBoard(difficulty, { name: userName(), battle: battleLabel, score }) : 0;
    const isNewHighScore = score > 0 && score > previousBest;
    showHighScore();

    playFile(gameOverSound);

    // show the monster exactly as beaten-up (or loved-up) as it ended
    gameOverMonster.innerHTML = monster.innerHTML;
    gameOverMonster.dataset.monster = monster.dataset.monster;
    gameOverMonster.className = "game-over-monster " + (monster.classList.contains("dizzy") ? "dizzy" : "");
    gameOverSummary.textContent = `${player} hit ${m.title} ${hits} time${hits === 1 ? "" : "s"} with ${w.name} ${w.emoji}`;
    finalScoreElement.textContent = score;
    finalStarsElement.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    finalRankElement.textContent = rank ? `#${rank}` : "–";
    newHighScoreElement.hidden = !isNewHighScore;
    renderBoard(difficulty, rank);
    boardHeading.textContent = `Top ${BOARD_SIZE} · ${levelName}`;

    setSetupEnabled(true);
    gameOverDialog.showModal();
    playAgainButton.focus({ preventScroll: true });
}

function renderBoard(difficulty, highlightRank) {
    const board = getBoard(difficulty);
    if (!board.length) {
        const empty = document.createElement("li");
        empty.className = "empty";
        empty.textContent = "No scores yet. Hit something!";
        leaderboardElement.replaceChildren(empty);
        return;
    }
    leaderboardElement.replaceChildren(...board.map((entry, i) => {
        const li = document.createElement("li");
        if (i + 1 === highlightRank) li.className = "you";
        const name = document.createElement("span");
        name.className = "lb-name";
        name.textContent = entry.name;
        const battleEl = document.createElement("span");
        battleEl.className = "lb-battle";
        battleEl.textContent = entry.battle;
        const scoreEl = document.createElement("span");
        scoreEl.className = "lb-score";
        scoreEl.textContent = entry.score;
        li.append(name, battleEl, scoreEl);
        return li;
    }));
}

// 🕹️ stop everything and go back to choosing (score is NOT saved)
function newGame() {
    resetRound();
    if (gameOverDialog.open) gameOverDialog.close();
    setSetupEnabled(true);
    centerMonster();
}


// ===================== Listeners =====================

startButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
newGameButton.addEventListener("click", newGame);

changeBattleButton.addEventListener("click", function () {
    gameOverDialog.close();
    openStyleDialog();
});

levelButton.addEventListener("click", () => levelDialog.showModal());
closeGameOverButton.addEventListener("click", () => gameOverDialog.close());

setupInputs.forEach((input) => {
    input.addEventListener("change", function () {
        save(input.name, input.value);
        if (input.name === "monster") {
            // picked by hand (not from the battle popup) → play as yourself again
            if (battle && battle !== input.value) {
                battle = "";
                save("battle", "");
            }
            applyMonster();
            updatePlayer();
        }
        if (input.name === "weapon") {
            applyWeapon();
            playSound(input.value); // preview the weapon's sound
        }
        if (input.name === "difficulty") {
            setMonsterSize();
            showHighScore();
            updateLevelButton();
            setTimeout(() => levelDialog.close(), 180); // close the popup right after choosing
        }
    });
});

playerNameInput.addEventListener("input", function () {
    save("playerName", playerNameInput.value.trim());
    updatePlayer();
});

avatarButton.addEventListener("click", openStyleDialog);
styleButton.addEventListener("click", openStyleDialog);

// close a popup when clicking the dark area around it
[styleDialog, levelDialog, gameOverDialog].forEach((dialog) => {
    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
    });
});


// ===================== Init =====================

// draw the monster pictures on the choice cards
document.querySelectorAll(".card-art").forEach((el) => {
    el.innerHTML = monsterSVG(el.dataset.monster);
});

restoreChoices();
playerNameInput.value = load("playerName", "");
applyMonster();
updatePlayer();
applyWeapon();
setMonsterSize();
showHighScore();
updateLevelButton();
centerMonster();
