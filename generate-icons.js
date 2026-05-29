const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'advoai-logo.png');
const outputDir = path.join(__dirname, 'public');

async function generateIcons() {
    try {
        if (!fs.existsSync(inputPath)) {
            console.error('Source icon not found at', inputPath);
            process.exit(1);
        }

        console.log('Generating 192x192 icon...');
        await sharp(inputPath)
            .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toFile(path.join(outputDir, 'icon-192x192.png'));

        console.log('Generating 512x512 icon...');
        await sharp(inputPath)
            .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .toFile(path.join(outputDir, 'icon-512x512.png'));

        console.log('Icons generated successfully.');
    } catch (err) {
        console.error('Error generating icons:', err);
        process.exit(1);
    }
}

generateIcons();
