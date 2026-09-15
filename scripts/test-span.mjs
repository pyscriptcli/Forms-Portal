import fs from 'fs';
import sharp from 'sharp';

const bebasBuf = fs.readFileSync('public/fonts/BebasNeue-Regular.ttf');
const montserratBuf = fs.readFileSync('public/fonts/Montserrat-Variable.ttf');

const bebasBase64 = bebasBuf.toString('base64');
const montserratBase64 = montserratBuf.toString('base64');

const svg = `
<svg width="700" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Bebas Neue';
        src: url(data:font/truetype;charset=utf-8;base64,${bebasBase64}) format('truetype');
      }
      @font-face {
        font-family: 'Montserrat';
        src: url(data:font/truetype;charset=utf-8;base64,${montserratBase64}) format('truetype');
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#fff"/>
  <line x1="0" y1="20" x2="620" y2="20" stroke="#CBD5E1" stroke-width="2"/>
  
  <text x="0" y="52" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#5A6B7C">CONTACT NUMBER</text>
  <text x="0" y="128" font-family="'Bebas Neue', Arial Narrow, sans-serif" font-size="88" letter-spacing="7" fill="#003366">0920 970 1465</text>
  
  <text x="0" y="175" font-family="'Montserrat', sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#5A6B7C">EMAIL</text>
  <text x="0" y="214" font-family="'Montserrat', sans-serif" font-size="26.5" font-weight="700" letter-spacing="0.5" fill="#003366">kristina.balajadia@primephilippines.com</text>
</svg>
`;

sharp(Buffer.from(svg)).png().toFile('scripts/test-span.png').then(() => {
  console.log('Saved test-span.png');
});
