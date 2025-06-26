console.log('Generating icons from SVG...');
const sharp = require('sharp');
const path = require('path');

const sizes = [16, 48, 128];
const inputFile = path.join(__dirname, 'public', 'icons', 'claire-logo.svg');

async function generateIcons() {
    try {
        for (const size of sizes) {
            const outputFile = path.join(__dirname, 'public', 'icons', `icon${size}.png`);
            await sharp(inputFile)
                .resize(size, size)
                .png()
                .toFile(outputFile);
            console.log(`Generated ${size}x${size} icon`);
        }
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
