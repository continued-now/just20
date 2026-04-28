const badges = [
  {
    id: 'starter-sprout',
    category: 'streak',
    name: 'Starter Sprout',
    xp: 10,
    progress: 100,
    status: 'Unlocked',
    unlock: 'Complete Day 1.',
    copy: 'Day 1 exists. That counts.',
    palette: ['#DFF4C7', '#58CC02', '#2E7D16'],
    symbol: 'sprout',
  },
  {
    id: 'tiny-spark',
    category: 'streak',
    name: 'Tiny Spark',
    xp: 25,
    progress: 66,
    status: '2/3 days',
    unlock: 'Reach a 3-day streak.',
    copy: 'Three days. Suspiciously consistent.',
    palette: ['#FFE6B8', '#FF9F1C', '#B76200'],
    symbol: 'spark',
  },
  {
    id: 'hatched-habit',
    category: 'streak',
    name: 'Hatched Habit',
    xp: 60,
    progress: 42,
    status: '3/7 days',
    unlock: 'Reach a 7-day streak.',
    copy: 'One week. The egg has opinions now.',
    palette: ['#FFF0D6', '#FFBE5C', '#8B5A1E'],
    symbol: 'egg',
  },
  {
    id: 'two-week-bean',
    category: 'streak',
    name: 'Two-Week Bean',
    xp: 100,
    progress: 21,
    status: '3/14 days',
    unlock: 'Reach a 14-day streak.',
    copy: 'Two weeks is where excuses get nervous.',
    palette: ['#F6DFCA', '#C7895D', '#7C4C33'],
    symbol: 'bean',
  },
  {
    id: 'monthling',
    category: 'streak',
    name: 'Monthling',
    xp: 220,
    progress: 10,
    status: '3/30 days',
    unlock: 'Reach a 30-day streak.',
    copy: 'Thirty days. This is becoming a thing.',
    palette: ['#FFE0D2', '#FF7A3D', '#9D3618'],
    symbol: 'cake',
  },
  {
    id: 'flame-friend',
    category: 'streak',
    name: 'Flame Friend',
    xp: 400,
    progress: 5,
    status: '3/60 days',
    unlock: 'Reach a 60-day streak.',
    copy: 'Sixty days. The floor knows your name.',
    palette: ['#FFD3BA', '#FF6B2C', '#9E2D14'],
    symbol: 'hoodie',
    locked: true,
  },
  {
    id: 'tiny-legend',
    category: 'streak',
    name: 'Tiny Legend',
    xp: 700,
    progress: 3,
    status: '3/90 days',
    unlock: 'Reach a 90-day streak.',
    copy: 'Ninety days. Tiny legend behavior.',
    palette: ['#FFE8A3', '#F5B900', '#8E6900'],
    symbol: 'crown',
    locked: true,
  },
  {
    id: 'ancient-egg',
    category: 'streak',
    name: 'Ancient Egg',
    xp: 1200,
    progress: 2,
    status: 'Hidden until Day 90',
    unlock: 'Reach a 180-day streak.',
    copy: 'Half a year. Absurd, politely.',
    palette: ['#F7E9C8', '#D6A85C', '#73522E'],
    symbol: 'fossil',
    locked: true,
  },
  {
    id: 'year-goblin',
    category: 'streak',
    name: 'Year Goblin',
    xp: 2500,
    progress: 1,
    status: 'Hidden until Day 180',
    unlock: 'Reach a 365-day streak.',
    copy: 'A whole year. The goblin bows.',
    palette: ['#E8F6D8', '#78C850', '#3F7C37'],
    symbol: 'goblin',
    locked: true,
  },
  {
    id: 'first-buddy',
    category: 'social',
    name: 'First Buddy',
    xp: 40,
    progress: 100,
    status: 'Unlocked',
    unlock: 'Link 1 buddy.',
    copy: 'Someone joined the accountability loop.',
    palette: ['#DCEEFF', '#1CB0F6', '#126A9C'],
    symbol: 'buddy',
  },
  {
    id: 'popular',
    category: 'social',
    name: 'Popular',
    xp: 120,
    progress: 33,
    status: '1/3 buddies',
    unlock: 'Link 3 buddies.',
    copy: 'The tiny movement begins.',
    palette: ['#D7F0FF', '#4BC3FF', '#146E99'],
    symbol: 'popular',
  },
  {
    id: 'buddy-magnet',
    category: 'social',
    name: 'Buddy Magnet',
    xp: 220,
    progress: 20,
    status: '1/5 buddies',
    unlock: 'Link 5 referred friends.',
    copy: 'The accountability field is getting suspiciously strong.',
    palette: ['#DDF7FF', '#2DC5E8', '#0F728A'],
    symbol: 'magnet',
  },
  {
    id: 'tiny-evangelist',
    category: 'social',
    name: 'Tiny Evangelist',
    xp: 500,
    progress: 0,
    status: 'Secret',
    unlock: '10 referred friends complete Day 1.',
    copy: 'You spread the tiny gospel. Politely.',
    palette: ['#E7F3FF', '#5E9BFF', '#2859B8'],
    symbol: 'megaphone',
    locked: true,
  },
  {
    id: 'pack-starter',
    category: 'social',
    name: 'Pack Starter',
    xp: 180,
    progress: 33,
    status: '1/3 room joins',
    unlock: '3 people join your team room.',
    copy: 'The floor has a group chat now.',
    palette: ['#E0F7FF', '#1CB0F6', '#0B638D'],
    symbol: 'pack',
  },
  {
    id: 'room-captain',
    category: 'social',
    name: 'Room Captain',
    xp: 450,
    progress: 10,
    status: 'Secret',
    unlock: '10 people join your team room.',
    copy: 'You are now responsible for vibes and hydration.',
    palette: ['#DCE9FF', '#4169E1', '#243E91'],
    symbol: 'flag',
    locked: true,
  },
  {
    id: 'nudge-goblin',
    category: 'social',
    name: 'Nudge Goblin',
    xp: 250,
    progress: 0,
    status: 'Backend needed',
    unlock: '7 nudges lead to friend completions.',
    copy: 'You nudged. They moved. The goblin is pleased.',
    palette: ['#E9F8D9', '#7AC943', '#3A7626'],
    symbol: 'bell',
    locked: true,
  },
  {
    id: 'everybody-ate',
    category: 'social',
    name: 'Everybody Ate',
    xp: 300,
    progress: 0,
    status: 'Secret',
    unlock: '3 buddies complete on the same day.',
    copy: 'The whole table got their 20.',
    palette: ['#DFF5FF', '#39C7F3', '#126F96'],
    symbol: 'table',
    locked: true,
  },
  {
    id: 'clean-20',
    category: 'performance',
    name: 'Clean 20',
    xp: 80,
    progress: 75,
    status: '15/20 reps',
    unlock: 'Finish 20 reps without manual adjustment.',
    copy: 'Twenty clean reps. No counter fiddling.',
    palette: ['#DFF7E7', '#20C56C', '#167744'],
    symbol: 'check',
  },
  {
    id: 'speed-sprout',
    category: 'performance',
    name: 'Speed Sprout',
    xp: 100,
    progress: 0,
    status: 'PB pending',
    unlock: 'Beat your prior best 20-rep time.',
    copy: 'Tiny plant. Somehow faster.',
    palette: ['#E4FBE4', '#40D76F', '#207C3B'],
    symbol: 'speed',
    locked: true,
  },
  {
    id: 'sub-60-bean',
    category: 'performance',
    name: 'Sub-60 Bean',
    xp: 160,
    progress: 62,
    status: '62 sec best',
    unlock: 'Complete 20 reps under 60 seconds.',
    copy: 'The bean has entered sport mode.',
    palette: ['#E3FADE', '#67C94F', '#367D2E'],
    symbol: 'timer',
  },
  {
    id: 'no-excuses-bean',
    category: 'performance',
    name: 'No-Excuses Bean',
    xp: 120,
    progress: 0,
    status: 'Window pending',
    unlock: 'Complete inside your strict scheduled window.',
    copy: 'Set time. Showed up. No courtroom drama.',
    palette: ['#FFF0CF', '#FFB84D', '#A96000'],
    symbol: 'clock',
  },
  {
    id: 'baseline-badge',
    category: 'performance',
    name: 'Baseline Badge',
    xp: 150,
    progress: 0,
    status: 'Test pending',
    unlock: 'Complete your first monthly Test Me attempt.',
    copy: 'Measure first. Flex later.',
    palette: ['#E7F0FF', '#6E9DFF', '#355BBD'],
    symbol: 'ruler',
    locked: true,
  },
  {
    id: 'stronger-bean',
    category: 'performance',
    name: 'Stronger Bean',
    xp: 300,
    progress: 0,
    status: 'Secret',
    unlock: 'Improve monthly test reps by 10%.',
    copy: 'The bean has measurable opinions now.',
    palette: ['#E2F8E8', '#2FBC65', '#176C39'],
    symbol: 'strong',
    locked: true,
  },
  {
    id: 'form-snob',
    category: 'performance',
    name: 'Form Snob',
    xp: 220,
    progress: 40,
    status: '2/5 clean sessions',
    unlock: 'Complete 5 clean sessions in a row.',
    copy: 'A little picky. Honestly, fair.',
    palette: ['#DFF7E7', '#20B879', '#136B4A'],
    symbol: 'glasses',
    locked: true,
  },
  {
    id: 'perfect-week',
    category: 'consistency',
    name: 'Perfect Week',
    xp: 180,
    progress: 42,
    status: '3/7 days',
    unlock: 'Complete all 7 days in a week.',
    copy: 'Seven days. Seven checkmarks.',
    palette: ['#F1E6FF', '#9B6BFF', '#6239A6'],
    symbol: 'calendar',
  },
  {
    id: 'save-wizard',
    category: 'consistency',
    name: 'Save Wizard',
    xp: 120,
    progress: 0,
    status: 'Freeze pending',
    unlock: 'Use a freeze and recover the streak next day.',
    copy: 'Crisis avoided with tiny sorcery.',
    palette: ['#EFE8FF', '#A982FF', '#5D3AA6'],
    symbol: 'wand',
    locked: true,
  },
  {
    id: 'morning-bean',
    category: 'consistency',
    name: 'Morning Bean',
    xp: 90,
    progress: 33,
    status: '1/3 mornings',
    unlock: 'Complete before 9am three times.',
    copy: 'Before breakfast? Rude, but impressive.',
    palette: ['#FFF3C9', '#FFD43B', '#A67900'],
    symbol: 'sunrise',
  },
  {
    id: 'night-gremlin',
    category: 'consistency',
    name: 'Night Gremlin',
    xp: 90,
    progress: 0,
    status: 'Secret',
    unlock: 'Complete after 9pm three times.',
    copy: 'Late, quiet, slightly goblin-coded.',
    palette: ['#E8E5FF', '#7C6CF2', '#3B327F'],
    symbol: 'moon',
    locked: true,
  },
  {
    id: 'no-nudge-needed',
    category: 'consistency',
    name: 'No Nudge Needed',
    xp: 180,
    progress: 40,
    status: '2/5 early wins',
    unlock: 'Complete before any fallback nudge fires 5 times.',
    copy: 'You showed up before the app had to tap the glass.',
    palette: ['#E8F8DF', '#58CC02', '#357E0D'],
    symbol: 'quiet',
  },
];

const directions = [
  {
    id: 'stickers',
    label: 'Option A',
    name: 'Pocket Stickers',
    tag: 'Tiny grid fallback',
    accent: '#58CC02',
    accentDeep: '#43A300',
    accentSoft: 'rgba(88, 204, 2, 0.16)',
    sample: 'starter-sprout',
    summary: 'Soft sticker badges with tiny faces, chunky outlines, and toy-like shadows. Best for compact locked states.',
    bullets: ['Fastest at tiny sizes', 'Great locked-grid fallback', 'Less premium than pins'],
  },
  {
    id: 'pins',
    label: 'Option B',
    name: 'Enamel Pin Set',
    tag: 'Recommended direction',
    accent: '#1CB0F6',
    accentDeep: '#126A9C',
    accentSoft: 'rgba(28, 176, 246, 0.16)',
    sample: 'tiny-legend',
    summary: 'Glossy pin badges with raised rims and simple icon centers. Feels more physical and more worth bragging about.',
    bullets: ['Best unlock moment', 'Milestones feel valuable', 'Most rewards-app ready'],
  },
  {
    id: 'patches',
    label: 'Option C',
    name: 'Tiny Patch Club',
    tag: 'Community flavor',
    accent: '#FF9F1C',
    accentDeep: '#B76200',
    accentSoft: 'rgba(255, 159, 28, 0.18)',
    sample: 'popular',
    summary: 'Embroidered patch badges with stitch texture and imperfect charm. Great for squads, referrals, and future merch.',
    bullets: ['Most ownable long-term', 'Strong team-room energy', 'Busier at tiny sizes'],
  },
];

const directionGrid = document.querySelector('#directionGrid');
const badgeMatrix = document.querySelector('#badgeMatrix');
const miniGrid = document.querySelector('#miniGrid');
const featuredBadge = document.querySelector('#featuredBadge');
const shareCards = document.querySelector('#shareCards');
const unlockDemos = document.querySelector('#unlockDemos');
const filters = document.querySelectorAll('.filter');
const unlockFilters = document.querySelectorAll('.unlock-filter');
const replayAllUnlocks = document.querySelector('#replayAllUnlocks');
let svgSerial = 0;

function svgBadge(badge, variant, size = 132) {
  const [soft, mid, deep] = badge.palette;
  const id = `${badge.id}-${variant}-${size}-${svgSerial++}`;
  const hidden = badge.locked ? 0.54 : 1;
  const base = variant === 'stickers'
    ? stickerBase(id, soft, mid, deep)
    : variant === 'pins'
      ? pinBase(id, soft, mid, deep)
      : patchBase(id, soft, mid, deep);

  return `
    <svg class="badge-svg" viewBox="0 0 160 160" role="img" aria-label="${badge.name} ${variant} mockup" style="opacity:${hidden};--badge-size:${size}px">
      <defs>
        <filter id="softShadow-${id}" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#22311f" flood-opacity="0.16"/>
        </filter>
        <linearGradient id="shine-${id}" x1="20" x2="135" y1="10" y2="150" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="0.48" stop-color="${soft}" stop-opacity="0.96"/>
          <stop offset="1" stop-color="${mid}" stop-opacity="0.86"/>
        </linearGradient>
        <pattern id="stitch-${id}" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 4.5H9" stroke="${deep}" stroke-width="1.2" stroke-opacity="0.26" stroke-dasharray="2 4"/>
        </pattern>
      </defs>
      ${base}
      <g transform="translate(0 1)">
        ${iconForBadge(badge.symbol, mid, deep, soft)}
      </g>
      ${variant === 'pins' ? '<path d="M45 36C63 24 96 22 116 38" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.55"/>' : ''}
      ${variant === 'patches' ? '<path d="M38 126C62 139 99 139 122 124" fill="none" stroke="#fff7df" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 8" opacity="0.8"/>' : ''}
    </svg>
  `;
}

function stickerBase(id, soft, mid, deep) {
  return `
    <g filter="url(#softShadow-${id})">
      <path d="M80 10C108 10 139 27 145 57C151 88 137 126 108 142C80 157 40 149 22 122C4 95 9 50 32 28C45 16 62 10 80 10Z" fill="#fffdf2"/>
      <path d="M80 18C105 18 131 32 136 59C142 87 130 118 105 132C80 146 45 139 30 116C15 94 19 55 39 36C50 25 65 18 80 18Z" fill="${soft}"/>
      <path d="M47 34C62 25 93 22 116 38" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.62"/>
      <path d="M35 116C51 136 86 144 111 130" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round" opacity="0.16"/>
    </g>
  `;
}

function pinBase(id, soft, mid, deep) {
  return `
    <g filter="url(#softShadow-${id})">
      <circle cx="80" cy="80" r="68" fill="${deep}" opacity="0.22"/>
      <circle cx="80" cy="76" r="67" fill="${deep}"/>
      <circle cx="80" cy="73" r="59" fill="url(#shine-${id})"/>
      <circle cx="80" cy="73" r="47" fill="${soft}" stroke="#fffdf2" stroke-width="6"/>
      <path d="M32 94C43 126 87 143 120 116" fill="none" stroke="#11170f" stroke-width="6" stroke-linecap="round" opacity="0.1"/>
    </g>
  `;
}

function patchBase(id, soft, mid, deep) {
  return `
    <g filter="url(#softShadow-${id})">
      <path d="M80 12L129 31L150 78L130 126L80 148L31 126L10 78L31 31Z" fill="${deep}"/>
      <path d="M80 23L121 39L138 78L121 118L80 136L39 118L22 78L39 39Z" fill="${soft}"/>
      <path d="M80 23L121 39L138 78L121 118L80 136L39 118L22 78L39 39Z" fill="url(#stitch-${id})" opacity="0.42"/>
      <path d="M80 31L114 44L129 78L114 112L80 127L46 112L31 78L46 44Z" fill="${mid}" opacity="0.22"/>
      <path d="M80 23L121 39L138 78L121 118L80 136L39 118L22 78L39 39Z" fill="none" stroke="#fff7df" stroke-width="5" stroke-linejoin="round" stroke-dasharray="4 8"/>
    </g>
  `;
}

function iconForBadge(symbol, mid, deep, soft) {
  const face = `<circle cx="67" cy="83" r="4" fill="${deep}"/><circle cx="93" cy="83" r="4" fill="${deep}"/><path d="M70 99C76 105 86 105 92 99" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>`;

  const icons = {
    sprout: `
      <path d="M80 108C79 88 80 70 88 51" fill="none" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M82 71C62 51 42 54 35 75C55 85 72 83 82 71Z" fill="${mid}" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M87 58C92 34 113 27 128 43C119 63 103 70 87 58Z" fill="#fffdf2" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/>
      ${face}
    `,
    spark: `
      <path d="M82 28L94 62L130 72L98 89L88 126L70 93L32 84L66 65Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M54 34L59 48L73 52L60 59L56 73L49 60L35 56L48 49Z" fill="#fffdf2" stroke="${deep}" stroke-width="4" stroke-linejoin="round"/>
      ${face}
    `,
    egg: `
      <path d="M80 34C106 34 122 70 122 96C122 119 105 132 80 132C55 132 38 119 38 96C38 70 54 34 80 34Z" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <path d="M43 94L60 84L74 96L88 84L104 96L119 88" fill="none" stroke="${mid}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M76 45C88 57 93 67 88 82C81 77 74 72 76 45Z" fill="${mid}"/>
      ${face}
    `,
    bean: `
      <path d="M52 49C77 24 125 43 125 82C125 116 89 135 58 119C28 104 29 72 52 49Z" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <path d="M60 57C79 47 102 54 111 72" fill="none" stroke="#fffdf2" stroke-width="7" stroke-linecap="round" opacity="0.62"/>
      ${face}
    `,
    cake: `
      <path d="M48 72H112C121 72 127 79 127 88V121H33V88C33 79 39 72 48 72Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M35 93C49 104 60 81 75 92C88 102 98 81 125 92" fill="none" stroke="#fffdf2" stroke-width="7" stroke-linecap="round"/>
      <path d="M80 34C94 49 94 62 80 70C66 62 66 49 80 34Z" fill="#ff6b2c" stroke="${deep}" stroke-width="5"/>
      ${face}
    `,
    hoodie: `
      <path d="M53 119C56 87 49 63 80 47C111 63 104 87 107 119Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M58 76C63 51 97 51 102 76" fill="none" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M80 30C96 49 98 67 80 78C62 67 64 49 80 30Z" fill="#fffdf2" stroke="${deep}" stroke-width="5"/>
      ${face}
    `,
    crown: `
      <path d="M43 104L49 54L69 78L82 45L97 78L117 54L122 104Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M48 105H118V122H48Z" fill="#fffdf2" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      ${face}
    `,
    fossil: `
      <path d="M80 31C104 31 119 66 119 93C119 119 103 133 80 133C57 133 41 119 41 93C41 66 56 31 80 31Z" fill="#fff7df" stroke="${deep}" stroke-width="6"/>
      <path d="M61 64C72 55 91 56 100 67M58 90C72 101 92 101 104 88M70 119C77 113 86 113 93 119" fill="none" stroke="${mid}" stroke-width="5" stroke-linecap="round"/>
      <path d="M74 49L85 70L74 87L88 106L79 127" fill="none" stroke="${deep}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
      ${face}
    `,
    goblin: `
      <path d="M43 73L24 58L39 96Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M117 73L136 58L121 96Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M45 70C50 42 110 42 115 70L121 105C112 128 48 128 39 105Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M65 47L80 22L95 47Z" fill="#FFD43B" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M62 82H71M89 82H98" stroke="${deep}" stroke-width="7" stroke-linecap="round"/>
      <path d="M70 104C76 110 86 110 92 104" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>
    `,
    magnet: `
      <path d="M45 54V92C45 112 59 126 80 126C101 126 115 112 115 92V54H95V92C95 101 89 107 80 107C71 107 65 101 65 92V54Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M45 54H65V72H45ZM95 54H115V72H95Z" fill="#fffdf2" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M36 38L43 48M124 38L117 48M80 29V42" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>
    `,
    megaphone: `
      <path d="M45 76L106 45V109L45 89Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M43 73H28V92H43Z" fill="#fffdf2" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M55 91L67 124H48L39 93Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M120 60C128 68 128 87 120 96M131 49C146 65 146 91 131 107" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>
    `,
    pack: `
      <circle cx="57" cy="76" r="18" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <circle cx="83" cy="63" r="22" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <circle cx="107" cy="78" r="18" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <path d="M35 124C41 101 57 92 80 92C103 92 119 101 125 124Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      ${face}
    `,
    flag: `
      <path d="M52 127V39" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M56 43C75 32 94 54 114 43V92C94 104 75 82 56 92Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M70 58H100M70 74H94" stroke="#fffdf2" stroke-width="6" stroke-linecap="round"/>
      <path d="M42 128H88" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
    `,
    bell: `
      <path d="M50 104C58 91 54 72 62 58C69 45 91 45 98 58C106 72 102 91 110 104Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M43 105H117" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M70 120C75 128 85 128 90 120" fill="none" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
      <path d="M43 50L34 38M117 50L126 38" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>
      ${face}
    `,
    table: `
      <path d="M37 83H123V112C123 122 115 130 105 130H55C45 130 37 122 37 112Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <ellipse cx="80" cy="82" rx="45" ry="18" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <circle cx="58" cy="72" r="10" fill="${mid}" stroke="${deep}" stroke-width="5"/>
      <circle cx="80" cy="68" r="10" fill="${mid}" stroke="${deep}" stroke-width="5"/>
      <circle cx="102" cy="72" r="10" fill="${mid}" stroke="${deep}" stroke-width="5"/>
      <path d="M58 103H102" stroke="#fffdf2" stroke-width="6" stroke-linecap="round"/>
    `,
    buddy: `
      <circle cx="65" cy="65" r="19" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <circle cx="99" cy="70" r="17" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <path d="M35 122C39 96 55 87 72 87C87 87 98 97 101 122Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M76 122C79 101 92 94 106 94C121 94 131 104 134 122Z" fill="#fffdf2" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M41 50C31 42 29 31 37 25" fill="none" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
    `,
    popular: `
      <circle cx="80" cy="66" r="25" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <circle cx="53" cy="88" r="17" fill="#fffdf2" stroke="${deep}" stroke-width="5"/>
      <circle cx="107" cy="88" r="17" fill="#fffdf2" stroke="${deep}" stroke-width="5"/>
      <path d="M35 125C40 103 57 96 80 96C103 96 120 103 125 125Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      ${face}
    `,
    check: `
      <circle cx="80" cy="80" r="49" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <path d="M55 80L72 99L108 59" fill="none" stroke="#fffdf2" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M45 122H115" stroke="${deep}" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
    `,
    speed: `
      <path d="M77 114C76 92 78 71 88 50" fill="none" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M82 72C62 53 43 57 35 77C55 87 72 84 82 72Z" fill="${mid}" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M93 58H129M99 78H136M88 98H121" stroke="${deep}" stroke-width="6" stroke-linecap="round" opacity="0.75"/>
      <path d="M42 49H61M31 64H51" stroke="${mid}" stroke-width="6" stroke-linecap="round"/>
      ${face}
    `,
    timer: `
      <circle cx="80" cy="86" r="45" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <path d="M68 35H92M80 35V45M111 51L122 40" stroke="${deep}" stroke-width="7" stroke-linecap="round"/>
      <path d="M80 87L99 68M80 87V60" stroke="#fffdf2" stroke-width="8" stroke-linecap="round"/>
      <path d="M56 108C68 119 91 119 104 106" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round" opacity="0.38"/>
    `,
    clock: `
      <path d="M51 50C76 25 125 44 125 83C125 117 89 136 58 120C28 105 28 73 51 50Z" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <circle cx="80" cy="83" r="30" fill="#fffdf2" stroke="${deep}" stroke-width="5"/>
      <path d="M80 83V65M80 83L96 92" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
    `,
    ruler: `
      <path d="M48 111L104 38L122 52L66 125Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M83 67L96 77M72 82L82 89M62 96L75 106" stroke="#fffdf2" stroke-width="5" stroke-linecap="round"/>
      ${face}
    `,
    strong: `
      <path d="M49 83C52 56 82 43 103 58C124 73 119 111 94 123C64 138 45 113 49 83Z" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <path d="M64 89C71 71 90 69 96 84C101 96 92 108 78 108" fill="none" stroke="#fffdf2" stroke-width="9" stroke-linecap="round"/>
      <path d="M96 84L116 72M96 84L118 91" stroke="${deep}" stroke-width="7" stroke-linecap="round"/>
      ${face}
    `,
    glasses: `
      <circle cx="60" cy="77" r="19" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <circle cx="100" cy="77" r="19" fill="#fffdf2" stroke="${deep}" stroke-width="6"/>
      <path d="M79 77H81M39 75L26 68M121 75L134 68" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
      <path d="M55 112L72 126L107 96" fill="none" stroke="${mid}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    `,
    calendar: `
      <path d="M41 48H119V124H41Z" fill="#fffdf2" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M41 65H119" stroke="${deep}" stroke-width="6"/>
      <path d="M59 38V55M101 38V55" stroke="${deep}" stroke-width="7" stroke-linecap="round"/>
      <path d="M58 87L73 102L103 78" fill="none" stroke="${mid}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    `,
    wand: `
      <path d="M48 118L112 54" stroke="${deep}" stroke-width="10" stroke-linecap="round"/>
      <path d="M53 113L71 95" stroke="#fffdf2" stroke-width="5" stroke-linecap="round"/>
      <path d="M103 33L110 50L128 56L111 64L105 82L97 65L80 59L97 51Z" fill="${mid}" stroke="${deep}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M45 48L50 58L61 61L51 67L48 78L42 68L31 65L41 59Z" fill="#fffdf2" stroke="${deep}" stroke-width="4" stroke-linejoin="round"/>
    `,
    sunrise: `
      <path d="M38 111H122" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M50 111C51 91 64 76 80 76C96 76 109 91 110 111Z" fill="${mid}" stroke="${deep}" stroke-width="6"/>
      <path d="M80 37V58M45 53L58 67M115 53L102 67M33 84H53M107 84H127" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
      ${face}
    `,
    moon: `
      <path d="M103 34C78 42 64 69 72 94C80 119 104 130 126 121C112 142 78 142 57 120C34 96 36 59 60 38C74 26 90 24 103 34Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M46 49L51 61L63 65L51 70L47 83L41 71L29 67L41 61Z" fill="#fffdf2" stroke="${deep}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M80 83C86 90 96 90 102 83" fill="none" stroke="${deep}" stroke-width="5" stroke-linecap="round"/>
    `,
    quiet: `
      <path d="M51 102C58 90 55 72 62 59C69 46 91 46 98 59C105 72 102 90 109 102Z" fill="${mid}" stroke="${deep}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M43 104H117" stroke="${deep}" stroke-width="8" stroke-linecap="round"/>
      <path d="M42 42L118 118" stroke="#fffdf2" stroke-width="13" stroke-linecap="round"/>
      <path d="M42 42L118 118" stroke="${deep}" stroke-width="6" stroke-linecap="round"/>
    `,
  };

  return icons[symbol] || icons.spark;
}

function renderDirections() {
  directionGrid.innerHTML = directions.map(direction => {
    const sample = badges.find(badge => badge.id === direction.sample);
    return `
      <article class="direction-card" style="--accent:${direction.accent};--accent-deep:${direction.accentDeep};--accent-soft:${direction.accentSoft}">
        <div class="direction-top">
          ${svgBadge(sample, direction.id)}
          <div>
            <span class="direction-tag">${direction.tag}</span>
            <h3 class="direction-title">${direction.label}: ${direction.name}</h3>
          </div>
        </div>
        <p>${direction.summary}</p>
        <ul class="direction-list">
          ${direction.bullets.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </article>
    `;
  }).join('');
}

function burstColorsForBadge(badge) {
  const [soft, mid, deep] = badge.palette;
  return [mid, soft, '#FFD43B', '#FFFFFF', deep, '#FFF8DF'];
}

function renderUnlockDemos(filter = 'all') {
  const visibleBadges = badges.filter(badge => filter === 'all' || badge.category === filter);

  unlockDemos.innerHTML = visibleBadges.map(badge => {
    const previewBadge = { ...badge, locked: false };
    const [soft, mid, deep] = badge.palette;
    const colors = burstColorsForBadge(badge);
    return `
      <article class="unlock-demo playing" style="--demo-glow:${soft};--demo-accent:${mid};--demo-deep:${deep}" data-unlock-index="${badge.id}">
        <div class="unlock-stage">
          <div class="unlock-pop">
            <span class="unlock-ring one" aria-hidden="true"></span>
            <span class="unlock-ring two" aria-hidden="true"></span>
            <div class="burst-wrap" aria-hidden="true">
              ${colors.map(color => `<span class="burst" style="--burst-color:${color}"></span>`).join('')}
            </div>
            ${svgBadge(previewBadge, 'pins', 144)}
            <div class="unlock-copy">
              <span class="mini-kicker">Badge unlocked</span>
              <strong>${badge.name}</strong>
              <span>${badge.copy}</span>
              <span class="unlock-xp">+${badge.xp} XP</span>
            </div>
          </div>
        </div>
        <div class="unlock-meta">
          <div>
            <h3>${badge.name} unlock</h3>
            <p>${badge.unlock} The motion keeps the same reward pattern but inherits this badge's color and icon.</p>
          </div>
          <button class="replay-button" type="button" data-replay="${badge.id}">Replay</button>
        </div>
      </article>
    `;
  }).join('');

  unlockDemos.querySelectorAll('[data-replay]').forEach(button => {
    button.addEventListener('click', () => replayUnlock(button.dataset.replay));
  });
}

function replayUnlock(index) {
  const demo = unlockDemos.querySelector(`[data-unlock-index="${index}"]`);
  if (!demo) return;
  demo.classList.remove('playing');
  void demo.offsetWidth;
  demo.classList.add('playing');
}

function renderMatrix(filter = 'all') {
  const visibleBadges = badges.filter(badge => filter === 'all' || badge.category === filter);
  badgeMatrix.innerHTML = visibleBadges.map(badge => `
    <article class="badge-row" data-category="${badge.category}">
      <div class="badge-info">
        <span class="category">${badge.category}</span>
        <h3>${badge.name}</h3>
        <p>${badge.unlock}</p>
        <div class="meta-row">
          <span class="pill">+${badge.xp} XP</span>
          <span class="pill">${badge.status}</span>
          <span class="pill">Rarity soon</span>
        </div>
      </div>
      ${directions.map(direction => badgeTile(badge, direction)).join('')}
    </article>
  `).join('');
}

function badgeTile(badge, direction) {
  return `
    <button class="badge-tile ${badge.locked ? 'locked' : ''}" type="button" title="${badge.copy}">
      <div class="tile-heading">
        <span class="option-name">${direction.name}</span>
        <span class="xp-chip">+${badge.xp}</span>
      </div>
      <div class="badge-stage">
        ${svgBadge(badge, direction.id)}
      </div>
      <div class="badge-copy">
        <strong>${badge.name}</strong>
        <span>${badge.copy}</span>
        <div class="progress-track" aria-label="${badge.status}">
          <div class="progress-fill" style="width:${badge.progress}%"></div>
        </div>
      </div>
    </button>
  `;
}

function renderPhonePreview() {
  const featured = badges[2];
  featuredBadge.innerHTML = `
    <div class="tile-heading">
      <span class="option-name">Next up</span>
      <span class="xp-chip">+${featured.xp}</span>
    </div>
    <div class="badge-stage">${svgBadge(featured, 'stickers', 150)}</div>
    <div class="badge-copy">
      <strong>${featured.name}</strong>
      <span>${featured.status} - ${featured.copy}</span>
      <div class="progress-track">
        <div class="progress-fill" style="width:${featured.progress}%"></div>
      </div>
    </div>
  `;

  miniGrid.innerHTML = badges.slice(0, 6).map((badge, index) => `
    <div class="mini-tile">
      ${svgBadge(badge, index % 2 === 0 ? 'stickers' : 'pins', 80)}
    </div>
  `).join('');
}

function renderShareCards() {
  const cards = [
    {
      direction: directions[0],
      badge: badges[0],
      bg: 'linear-gradient(145deg, #f2ffd6, #fff8df)',
      line: 'I started the Just20 streak. Day 1 is now real.',
    },
    {
      direction: directions[1],
      badge: badges[6],
      bg: 'linear-gradient(145deg, #ffeaa7, #fff7df 48%, #dff4ff)',
      line: '90 days of showing up. Tiny legend behavior.',
    },
    {
      direction: directions[2],
      badge: badges[8],
      bg: 'linear-gradient(145deg, #dff4ff, #fff7df 55%, #ffe1d2)',
      line: 'Three buddies joined the floor. The tiny movement begins.',
    },
  ];

  shareCards.innerHTML = cards.map(card => `
    <article class="share-card" style="--share-bg:${card.bg}">
      <div class="share-content">
        <div>
          <span class="share-kicker">${card.direction.name}</span>
          <h3 class="share-title">${card.badge.name}</h3>
        </div>
        ${svgBadge(card.badge, card.direction.id, 190)}
        <div>
          <p class="share-line">${card.line}</p>
          <span class="share-code">JUST-UA7EBL</span>
        </div>
      </div>
    </article>
  `).join('');
}

filters.forEach(filter => {
  filter.addEventListener('click', () => {
    filters.forEach(item => item.classList.remove('active'));
    filter.classList.add('active');
    renderMatrix(filter.dataset.filter);
  });
});

unlockFilters.forEach(filter => {
  filter.addEventListener('click', () => {
    unlockFilters.forEach(item => item.classList.remove('active'));
    filter.classList.add('active');
    renderUnlockDemos(filter.dataset.unlockFilter);
  });
});

replayAllUnlocks?.addEventListener('click', () => {
  unlockDemos.querySelectorAll('.unlock-demo').forEach(demo => {
    demo.classList.remove('playing');
    void demo.offsetWidth;
    demo.classList.add('playing');
  });
});

renderDirections();
renderUnlockDemos();
renderMatrix();
renderPhonePreview();
renderShareCards();
