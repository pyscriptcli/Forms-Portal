import fs from 'fs';
import sharp from 'sharp';

const bebasBuf = fs.readFileSync('public/fonts/BebasNeue-Regular.ttf');
const cormorantItalicBuf = fs.readFileSync('public/fonts/CormorantGaramond-Italic-Variable.ttf');
const montserratBuf = fs.readFileSync('public/fonts/Montserrat-Variable.ttf');

const bebasBase64 = bebasBuf.toString('base64');
const cormorantItalicBase64 = cormorantItalicBuf.toString('base64');
const montserratBase64 = montserratBuf.toString('base64');

const svg = `
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Bebas Neue';
        src: url(data:font/truetype;charset=utf-8;base64,${bebasBase64}) format('truetype');
      }
      @font-face {
        font-family: 'Cormorant Garamond';
        font-style: italic;
        src: url(data:font/truetype;charset=utf-8;base64,${cormorantItalicBase64}) format('truetype');
      }
      @font-face {
        font-family: 'Montserrat';
        src: url(data:font/truetype;charset=utf-8;base64,${montserratBase64}) format('truetype');
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="50" y="80" font-family="'Cormorant Garamond', Georgia, serif" font-style="italic" font-weight="400" font-size="54" fill="#003366">Tina Balajadia</text>
  <text x="50" y="140" font-family="'Montserrat', sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#5A6B7C">CONTACT NUMBER</text>
  <text x="50" y="200" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="64" letter-spacing="3" fill="#003366">0920 970 1465</text>
  <text x="50" y="240" font-family="'Montserrat', sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="#5A6B7C">EMAIL</text>
  <text x="50" y="270" font-family="'Montserrat', sans-serif" font-size="22" font-weight="600" fill="#003366">kristina.balajadia@primephilippines.com</text>
</svg>
`;

sharp(Buffer.from(svg)).png().toFile('scripts/test-font-output.png').then(() => {
  console.log('Successfully rendered test font output!');
}).catch(console.error);
