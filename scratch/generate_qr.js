import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const url = 'https://mygplay.gamefaktory.com/';

// Target directory for generated QR codes
const outputDir = path.join('d:', 'Oqulix', 'Oqulix Projects', 'MYG Platformer Demo', 'public', 'images', 'qr');

// Create directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateQRCodes() {
  try {
    console.log('Generating QR Codes for:', url);

    // 1. High-resolution Black & White PNG
    const bwPngPath = path.join(outputDir, 'mygplay_qr_bw.png');
    await QRCode.toFile(bwPngPath, url, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 2000, // 2000x2000px high-res
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('Generated BW PNG:', bwPngPath);

    // 2. High-resolution Brand Color (Orange) PNG
    // The brand color from mygtrans.png is approximately orange (#F35C00 or similar, let's use a nice vibrant orange #FF6B00)
    const brandPngPath = path.join(outputDir, 'mygplay_qr_brand.png');
    await QRCode.toFile(brandPngPath, url, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 2000,
      margin: 2,
      color: {
        dark: '#F35C00', // myG Orange
        light: '#FFFFFF'
      }
    });
    console.log('Generated Brand PNG:', brandPngPath);

    // 3. SVG Vector File (Infinitely scalable)
    const svgPath = path.join(outputDir, 'mygplay_qr.svg');
    await QRCode.toFile(svgPath, url, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('Generated SVG:', svgPath);

    // 4. Brand Color SVG
    const brandSvgPath = path.join(outputDir, 'mygplay_qr_brand.svg');
    await QRCode.toFile(brandSvgPath, url, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 2,
      color: {
        dark: '#F35C00',
        light: '#FFFFFF'
      }
    });
    console.log('Generated Brand SVG:', brandSvgPath);

    console.log('All QR Codes generated successfully!');
  } catch (err) {
    console.error('Error generating QR Codes:', err);
  }
}

generateQRCodes();
