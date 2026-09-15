import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import QRCode from 'qrcode';

const OUTPUT_DIR = path.resolve('public/cards');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load fonts as base64 to guarantee authentic rendering in SVG
const bebasBuf = fs.readFileSync('public/fonts/BebasNeue-Regular.ttf');
const cormorantItalicBuf = fs.readFileSync('public/fonts/CormorantGaramond-Italic-Variable.ttf');
const montserratBuf = fs.readFileSync('public/fonts/Montserrat-Variable.ttf');

const bebasBase64 = bebasBuf.toString('base64');
const cormorantItalicBase64 = cormorantItalicBuf.toString('base64');
const montserratBase64 = montserratBuf.toString('base64');

const fontStyles = `
  @font-face {
    font-family: 'Bebas Neue';
    src: url(data:font/truetype;charset=utf-8;base64,${bebasBase64}) format('truetype');
  }
  @font-face {
    font-family: 'Cormorant Garamond';
    font-style: italic;
    font-weight: 400;
    src: url(data:font/truetype;charset=utf-8;base64,${cormorantItalicBase64}) format('truetype');
  }
  @font-face {
    font-family: 'Montserrat';
    src: url(data:font/truetype;charset=utf-8;base64,${montserratBase64}) format('truetype');
  }
`;

// Contact details
const CONTACT = {
  name: 'Tina Balajadia',
  email: 'kristina.balajadia@primephilippines.com',
  phone: '0920 970 1465',
  phoneClean: '09209701465',
  company: 'PRIME Philippines',
  tagline: 'We Advise. You Advance.',
  title: 'Commercial Real Estate Advisory',
};

// Standard vCard 3.0 content
const vCardContent = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Balajadia;Tina;;;',
  `FN:${CONTACT.name}`,
  `ORG:${CONTACT.company}`,
  `TITLE:${CONTACT.title}`,
  `TEL;TYPE=CELL,VOICE,PREF:${CONTACT.phoneClean}`,
  `EMAIL;TYPE=WORK,INTERNET:${CONTACT.email}`,
  `NOTE:${CONTACT.tagline} | PRIME Philippines`,
  'END:VCARD'
].join('\r\n');

// Save raw .vcf file
fs.writeFileSync(path.join(OUTPUT_DIR, 'tina-balajadia.vcf'), vCardContent, 'utf-8');

// Generate QR Code as SVG Buffer
async function getQrCodeSvg(size, margin = 2) {
  return await QRCode.toString(vCardContent, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: margin,
    color: {
      dark: '#003366', // PRIME Blue
      light: '#FFFFFF' // Crisp white
    },
    width: size
  });
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

let logoBase64 = '';
const logoPath = path.resolve('public/prime-blue-logo.png');
if (fs.existsSync(logoPath)) {
  const logoBuf = fs.readFileSync(logoPath);
  logoBase64 = `data:image/png;base64,${logoBuf.toString('base64')}`;
}

let whiteLogoBase64 = '';
const whiteLogoPath = path.resolve('public/prime-white-logo.png');
if (fs.existsSync(whiteLogoPath)) {
  const whiteLogoBuf = fs.readFileSync(whiteLogoPath);
  whiteLogoBase64 = `data:image/png;base64,${whiteLogoBuf.toString('base64')}`;
}

/* =========================================================================
   1. WALLET / CLASSIC LANDSCAPE CARD (1200 x 750)
   User Request:
   - Layout: Two-tone split card
   - Left side: WHITE background with large scannable QR code
   - Right side: DEEP BLUE background (#003366) with:
       * PRIME Logo in pure white (like corporate template)
       * Tagline: WE ADVISE. YOU ADVANCE.
       * Name: Tina Balajadia in Italic Cormorant Garamond (not bold)
       * Contact Number: Bebas Neue bold, large (no +63)
       * Email: kristina.balajadia@primephilippines.com underneath
       * Gold accent bar & geometric wireframe lines from corporate card
   ========================================================================= */
async function generateWalletCard() {
  const width = 1200;
  const height = 750;
  const splitX = 490; // Left side 490px white, Right side 710px blue
  const qrSize = 430;

  const qrSvg = await getQrCodeSvg(qrSize, 1);
  const qrBase64 = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>${fontStyles}</style>
      <filter id="wShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#003366" flood-opacity="0.10"/>
      </filter>
    </defs>

    <!-- LEFT SIDE: CRISP WHITE BACKGROUND WITH PURE SCANNABLE QR CODE (NO TEXT) -->
    <rect x="0" y="0" width="${splitX}" height="${height}" fill="#FFFFFF"/>

    <!-- Left side subtle architectural borders & gold corners -->
    <rect x="25" y="25" width="${splitX - 50}" height="${height - 50}" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    <path d="M 25,75 L 25,25 L 75,25" fill="none" stroke="#C9A84C" stroke-width="3.5"/>
    <path d="M 25,${height - 75} L 25,${height - 25} L 75,${height - 25}" fill="none" stroke="#C9A84C" stroke-width="3.5"/>

    <!-- QR Code Container Centered (Zero Text) -->
    <g transform="translate(${(splitX - qrSize) / 2}, ${(height - qrSize) / 2})">
      <rect x="-12" y="-12" width="${qrSize + 24}" height="${qrSize + 24}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <image href="${qrBase64}" x="0" y="0" width="${qrSize}" height="${qrSize}"/>
    </g>

    <!-- Vertical Gold Divider between White and Blue -->
    <line x1="${splitX}" y1="0" x2="${splitX}" y2="${height}" stroke="#C9A84C" stroke-width="3"/>

    <!-- RIGHT SIDE: DEEP PRIME BLUE BACKGROUND (#003366) -->
    <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}" fill="#003366"/>

    <!-- Corporate Graphic Accents (from official PRIME card template Image 2) -->
    <!-- 1. Gold Accent Line at bottom left of blue section -->
    <rect x="${splitX + 65}" y="${height - 65}" width="160" height="5" fill="#C9A84C"/>

    <!-- 2. Geometric Wireframe Prism Lines at bottom right corner -->
    <g stroke="rgba(255, 255, 255, 0.16)" stroke-width="1.5" fill="none">
      <path d="M ${width - 120},${height - 260} L ${width - 280},${height}"/>
      <path d="M ${width - 120},${height - 260} L ${width},${height - 140}"/>
      <path d="M ${width - 120},${height - 260} L ${width - 120},${height}" stroke="rgba(255, 255, 255, 0.08)"/>
    </g>

    <!-- Right Side Content Group: Hierarchy: 1. Name (biggest) -> 2. Contact Number -> 3. Email -->
    <g transform="translate(${splitX + 65}, 70)">
      <!-- PRIME Philippines Logo (Pure White corporate logo from Image 2) -->
      ${whiteLogoBase64 ? `<image href="${whiteLogoBase64}" x="0" y="0" width="310" height="98" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <!-- 1. NAME: BIGGEST (font-size: 96px, Italic Cormorant Garamond, not bold) -->
      <text x="0" y="210" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-weight="400" font-size="96" fill="#FFFFFF">
        ${xmlEscape(CONTACT.name)}
      </text>

      <!-- Subtle Accent Divider -->
      <line x1="0" y1="245" x2="${width - splitX - 130}" y2="245" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1"/>

      <!-- 2. CONTACT NUMBER: 2ND BIGGEST (font-size: 78px, Bebas Neue Bold) -->
      <text x="0" y="300" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#C9A84C">
        CONTACT NUMBER
      </text>
      <text x="0" y="385" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="78" letter-spacing="6" fill="#FFFFFF">
        ${xmlEscape(CONTACT.phone)}
      </text>

      <!-- 3. EMAIL: 3RD (font-size: 25px, Montserrat) -->
      <text x="0" y="445" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#C9A84C">
        EMAIL
      </text>
      <text x="0" y="485" font-family="'Montserrat', sans-serif" font-size="25" font-weight="600" letter-spacing="0.3" fill="#FFFFFF">
        ${xmlEscape(CONTACT.email)}
      </text>
    </g>
  </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, 'tina-balajadia-card-wallet.png');
  await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outputPath);
  console.log(`Generated Wallet Landscape Card (1200x750): ${outputPath}`);
}

/* =========================================================================
   2. EXECUTIVE PORTRAIT CARD (1080 x 1440 - 3:4 Aspect Ratio)
   Two-tone executive layout:
   - Top Section: Crisp White with pure scannable QR Code (Zero Text)
   - Bottom Section: Deep Blue (#003366) with Logo, Name (biggest),
     Contact Number (2nd biggest), and Email (3rd)
   ========================================================================= */
async function generatePortraitCard() {
  const width = 1080;
  const height = 1440;
  const splitY = 680; // Top 680px White (QR), Bottom 760px Blue (Info)
  const qrSize = 540;

  const qrSvg = await getQrCodeSvg(qrSize, 1);
  const qrBase64 = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>${fontStyles}</style>
      <filter id="portShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#003366" flood-opacity="0.10"/>
      </filter>
    </defs>

    <!-- TOP SECTION: CRISP WHITE BACKGROUND WITH PURE QR CODE (NO TEXT) -->
    <rect x="0" y="0" width="${width}" height="${splitY}" fill="#FFFFFF"/>

    <!-- Perimeter borders & Gold corner accents on top section -->
    <rect x="30" y="30" width="${width - 60}" height="${splitY - 30}" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    <path d="M 30,80 L 30,30 L 80,30" fill="none" stroke="#C9A84C" stroke-width="3.5"/>
    <path d="M ${width - 80},30 L ${width - 30},30 L ${width - 30},80" fill="none" stroke="#C9A84C" stroke-width="3.5"/>

    <!-- QR Code Embed Centered (Zero Text) -->
    <g transform="translate(${(width - qrSize) / 2}, ${(splitY - qrSize) / 2})">
      <rect x="-14" y="-14" width="${qrSize + 28}" height="${qrSize + 28}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <image href="${qrBase64}" x="0" y="0" width="${qrSize}" height="${qrSize}"/>
    </g>

    <!-- Horizontal Gold Divider Bar -->
    <line x1="0" y1="${splitY}" x2="${width}" y2="${splitY}" stroke="#C9A84C" stroke-width="4"/>

    <!-- BOTTOM SECTION: DEEP PRIME BLUE BACKGROUND (#003366) -->
    <rect x="0" y="${splitY}" width="${width}" height="${height - splitY}" fill="#003366"/>

    <!-- Corporate Graphic Accents (from official PRIME card template) -->
    <!-- Gold Accent Line at bottom left of blue section -->
    <rect x="75" y="${height - 70}" width="180" height="5" fill="#C9A84C"/>

    <!-- Geometric Wireframe Prism Lines at bottom right corner -->
    <g stroke="rgba(255, 255, 255, 0.16)" stroke-width="1.5" fill="none">
      <path d="M ${width - 150},${height - 240} L ${width - 320},${height}"/>
      <path d="M ${width - 150},${height - 240} L ${width},${height - 130}"/>
      <path d="M ${width - 150},${height - 240} L ${width - 150},${height}" stroke="rgba(255, 255, 255, 0.08)"/>
    </g>

    <!-- Content Group on Blue Section: Hierarchy is Name (biggest) -> Contact -> Email -->
    <g transform="translate(75, ${splitY + 60})">
      <!-- PRIME Philippines Logo (Pure White corporate logo) -->
      ${whiteLogoBase64 ? `<image href="${whiteLogoBase64}" x="0" y="0" width="340" height="105" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <!-- 1. NAME: BIGGEST (font-size: 100px, Italic Cormorant Garamond, not bold) -->
      <text x="0" y="225" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-weight="400" font-size="100" fill="#FFFFFF">
        ${xmlEscape(CONTACT.name)}
      </text>

      <!-- Divider -->
      <line x1="0" y1="260" x2="${width - 150}" y2="260" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1"/>

      <!-- 2. CONTACT NUMBER: 2ND BIGGEST (font-size: 80px, Bebas Neue) -->
      <text x="0" y="320" font-family="'Montserrat', sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#C9A84C">
        CONTACT NUMBER
      </text>
      <text x="0" y="415" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="80" letter-spacing="7" fill="#FFFFFF">
        ${xmlEscape(CONTACT.phone)}
      </text>

      <!-- 3. EMAIL: 3RD (font-size: 28px, Montserrat) -->
      <text x="0" y="480" font-family="'Montserrat', sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#C9A84C">
        EMAIL
      </text>
      <text x="0" y="522" font-family="'Montserrat', sans-serif" font-size="28" font-weight="600" letter-spacing="0.5" fill="#FFFFFF">
        ${xmlEscape(CONTACT.email)}
      </text>
    </g>

    <!-- Footer Tagline on Blue Side -->
    <text x="${width / 2}" y="${height - 25}" font-family="'Montserrat', sans-serif" font-size="12.5" font-weight="600" letter-spacing="3" fill="rgba(255, 255, 255, 0.6)" text-anchor="middle">
      PRIME PHILIPPINES • LEADING REAL ESTATE CONSULTANCY
    </text>
  </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, 'tina-balajadia-card-portrait.png');
  await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outputPath);
  console.log(`Generated Portrait Card (1080x1440): ${outputPath}`);
}

/* =========================================================================
   3. MOBILE FULL-SCREEN / PHOTO FORMAT (1080 x 1920)
   Two-tone mobile lockscreen / story layout:
   - Top Section (960px): Deep Blue (#003366) with Logo, Name (biggest),
     Contact Number (2nd biggest), Email (3rd), and corporate accents
   - Bottom Section (960px): Crisp White with massive scannable QR Code (Zero Text)
   ========================================================================= */
async function generateMobileCard() {
  const width = 1080;
  const height = 1920;
  const splitY = 960; // Top 960px Blue (Info), Bottom 960px White (QR)
  const qrSize = 740;

  const qrSvg = await getQrCodeSvg(qrSize, 1);
  const qrBase64 = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>${fontStyles}</style>
      <filter id="mShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#003366" flood-opacity="0.10"/>
      </filter>
    </defs>

    <!-- TOP SECTION: DEEP PRIME BLUE BACKGROUND (#003366) -->
    <rect x="0" y="0" width="${width}" height="${splitY}" fill="#003366"/>

    <!-- Corporate Graphic Accents (from official PRIME card template) -->
    <!-- Gold Accent Line at bottom-left of top blue section -->
    <rect x="80" y="${splitY - 70}" width="200" height="6" fill="#C9A84C"/>

    <!-- Geometric Wireframe Prism Lines at bottom-right of top blue section -->
    <g stroke="rgba(255, 255, 255, 0.16)" stroke-width="2" fill="none">
      <path d="M ${width - 180},${splitY - 300} L ${width - 380},${splitY}"/>
      <path d="M ${width - 180},${splitY - 300} L ${width},${splitY - 160}"/>
      <path d="M ${width - 180},${splitY - 300} L ${width - 180},${splitY}" stroke="rgba(255, 255, 255, 0.08)"/>
    </g>

    <!-- Top Blue Content Group: Hierarchy: 1. Name (biggest) -> 2. Contact Number -> 3. Email -->
    <g transform="translate(80, 110)">
      <!-- PRIME Philippines Logo (Pure White corporate logo) -->
      ${whiteLogoBase64 ? `<image href="${whiteLogoBase64}" x="0" y="0" width="380" height="118" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <!-- 1. NAME: BIGGEST (font-size: 112px, Italic Cormorant Garamond, not bold) -->
      <text x="0" y="260" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-weight="400" font-size="112" fill="#FFFFFF">
        ${xmlEscape(CONTACT.name)}
      </text>

      <!-- Divider -->
      <line x1="0" y1="295" x2="${width - 160}" y2="295" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1.5"/>

      <!-- 2. CONTACT NUMBER: 2ND BIGGEST (font-size: 88px, Bebas Neue) -->
      <text x="0" y="370" font-family="'Montserrat', sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#C9A84C">
        CONTACT NUMBER
      </text>
      <text x="0" y="475" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="88" letter-spacing="8" fill="#FFFFFF">
        ${xmlEscape(CONTACT.phone)}
      </text>

      <!-- 3. EMAIL: 3RD (font-size: 31px, Montserrat) -->
      <text x="0" y="550" font-family="'Montserrat', sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#C9A84C">
        EMAIL
      </text>
      <text x="0" y="600" font-family="'Montserrat', sans-serif" font-size="31" font-weight="600" letter-spacing="0.5" fill="#FFFFFF">
        ${xmlEscape(CONTACT.email)}
      </text>
    </g>

    <!-- Subtitle tagline on Blue Section -->
    <text x="${width - 80}" y="${splitY - 55}" font-family="'Montserrat', sans-serif" font-size="13" font-weight="600" letter-spacing="3" fill="rgba(255, 255, 255, 0.6)" text-anchor="end">
      PRIME PHILIPPINES • LEADING REAL ESTATE CONSULTANCY
    </text>

    <!-- Horizontal Gold Divider Bar between Blue and White -->
    <line x1="0" y1="${splitY}" x2="${width}" y2="${splitY}" stroke="#C9A84C" stroke-width="5"/>

    <!-- BOTTOM SECTION: CRISP WHITE BACKGROUND WITH HUGE QR CODE (NO TEXT) -->
    <rect x="0" y="${splitY}" width="${width}" height="${height - splitY}" fill="#FFFFFF"/>

    <!-- Architectural framing & gold corners on bottom section -->
    <rect x="30" y="${splitY + 30}" width="${width - 60}" height="${height - splitY - 60}" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    <path d="M 30,${splitY + 90} L 30,${splitY + 30} L 90,${splitY + 30}" fill="none" stroke="#C9A84C" stroke-width="4"/>
    <path d="M ${width - 90},${splitY + 30} L ${width - 30},${splitY + 30} L ${width - 30},${splitY + 90}" fill="none" stroke="#C9A84C" stroke-width="4"/>
    <path d="M 30,${height - 90} L 30,${height - 30} L 90,${height - 30}" fill="none" stroke="#C9A84C" stroke-width="4"/>
    <path d="M ${width - 90},${height - 30} L ${width - 30},${height - 30} L ${width - 30},${height - 90}" fill="none" stroke="#C9A84C" stroke-width="4"/>

    <!-- Massive QR Code Embed Centered in Bottom White Section (Zero Text) -->
    <g transform="translate(${(width - qrSize) / 2}, ${splitY + (height - splitY - qrSize) / 2})">
      <rect x="-18" y="-18" width="${qrSize + 36}" height="${qrSize + 36}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
      <image href="${qrBase64}" x="0" y="0" width="${qrSize}" height="${qrSize}"/>
    </g>
  </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, 'tina-balajadia-card-mobile.png');
  await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outputPath);
  console.log(`Generated Mobile Card (1080x1920): ${outputPath}`);
}

/* =========================================================================
   4. SOCIAL / CHAT SQUARE FORMAT (1200 x 1200)
   Two-tone split layout:
   - Left Side (540px): Crisp White with pure scannable QR Code (Zero Text)
   - Right Side (660px): Deep Blue (#003366) with Logo, Name (biggest),
     Contact Number (2nd biggest), and Email (3rd)
   ========================================================================= */
async function generateSquareCard() {
  const width = 1200;
  const height = 1200;
  const splitX = 480; // Left side 480px, Right side 720px
  const qrSize = 420;

  const qrSvg = await getQrCodeSvg(qrSize, 1);
  const qrBase64 = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString('base64')}`;

  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>${fontStyles}</style>
      <filter id="sqShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#003366" flood-opacity="0.10"/>
      </filter>
    </defs>

    <!-- LEFT SIDE: WHITE BACKGROUND WITH PURE QR CODE (NO TEXT) -->
    <rect x="0" y="0" width="${splitX}" height="${height}" fill="#FFFFFF"/>

    <!-- Left side subtle architectural borders & gold corners -->
    <rect x="25" y="25" width="${splitX - 50}" height="${height - 50}" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
    <path d="M 25,75 L 25,25 L 75,25" fill="none" stroke="#C9A84C" stroke-width="3.5"/>
    <path d="M 25,${height - 75} L 25,${height - 25} L 75,${height - 25}" fill="none" stroke="#C9A84C" stroke-width="3.5"/>

    <!-- QR Code Embed Centered (Zero Text) -->
    <g transform="translate(${(splitX - qrSize) / 2}, ${(height - qrSize) / 2})">
      <rect x="-14" y="-14" width="${qrSize + 28}" height="${qrSize + 28}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <image href="${qrBase64}" x="0" y="0" width="${qrSize}" height="${qrSize}"/>
    </g>

    <!-- Vertical Gold Divider between White and Blue -->
    <line x1="${splitX}" y1="0" x2="${splitX}" y2="${height}" stroke="#C9A84C" stroke-width="3"/>

    <!-- RIGHT SIDE: DEEP PRIME BLUE BACKGROUND (#003366) -->
    <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}" fill="#003366"/>

    <!-- Corporate Graphic Accents (from official PRIME card template) -->
    <!-- Gold Accent Line at bottom left of blue section -->
    <rect x="${splitX + 65}" y="${height - 95}" width="160" height="5" fill="#C9A84C"/>

    <!-- Geometric Wireframe Prism Lines at bottom right corner -->
    <g stroke="rgba(255, 255, 255, 0.16)" stroke-width="1.5" fill="none">
      <path d="M ${width - 130},${height - 300} L ${width - 320},${height}"/>
      <path d="M ${width - 130},${height - 300} L ${width},${height - 160}"/>
      <path d="M ${width - 130},${height - 300} L ${width - 130},${height}" stroke="rgba(255, 255, 255, 0.08)"/>
    </g>

    <!-- Content Group on Blue Section: Hierarchy: 1. Name (biggest) -> 2. Contact Number -> 3. Email -->
    <g transform="translate(${splitX + 65}, 240)">
      <!-- PRIME Philippines Logo (Pure White corporate logo) -->
      ${whiteLogoBase64 ? `<image href="${whiteLogoBase64}" x="0" y="0" width="330" height="102" preserveAspectRatio="xMidYMid meet"/>` : ''}

      <!-- 1. NAME: BIGGEST (font-size: 86px, Italic Cormorant Garamond, not bold) -->
      <text x="0" y="225" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-weight="400" font-size="86" fill="#FFFFFF">
        ${xmlEscape(CONTACT.name)}
      </text>

      <!-- Divider -->
      <line x1="0" y1="255" x2="${width - splitX - 130}" y2="255" stroke="rgba(255, 255, 255, 0.22)" stroke-width="1"/>

      <!-- 2. CONTACT NUMBER: 2ND BIGGEST (font-size: 74px, Bebas Neue) -->
      <text x="0" y="315" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#C9A84C">
        CONTACT NUMBER
      </text>
      <text x="0" y="400" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="74" letter-spacing="6" fill="#FFFFFF">
        ${xmlEscape(CONTACT.phone)}
      </text>

      <!-- 3. EMAIL: 3RD (font-size: 24px, Montserrat) -->
      <text x="0" y="460" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#C9A84C">
        EMAIL
      </text>
      <text x="0" y="500" font-family="'Montserrat', sans-serif" font-size="24" font-weight="600" letter-spacing="0.3" fill="#FFFFFF">
        ${xmlEscape(CONTACT.email)}
      </text>
    </g>

    <!-- Footer Tagline on Blue Side -->
    <text x="${splitX + (width - splitX) / 2}" y="${height - 40}" font-family="'Montserrat', sans-serif" font-size="12.5" font-weight="600" letter-spacing="3" fill="rgba(255, 255, 255, 0.6)" text-anchor="middle">
      PRIME PHILIPPINES • LEADING REAL ESTATE CONSULTANCY
    </text>
  </svg>
  `;

  const outputPath = path.join(OUTPUT_DIR, 'tina-balajadia-card-square.png');
  await sharp(Buffer.from(svg)).png({ quality: 100 }).toFile(outputPath);
  console.log(`Generated Square Card (1200x1200): ${outputPath}`);
}

async function main() {
  console.log('Generating Digital Business Cards in Two-Tone Split Layout (White left QR, Blue right details)...');
  await generateWalletCard();
  await generatePortraitCard();
  await generateMobileCard();
  await generateSquareCard();
  console.log('All business cards regenerated successfully!');
}

main().catch(err => {
  console.error('Error generating cards:', err);
  process.exit(1);
});
