const fs = require('fs');

function getPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer.toString('ascii', 1, 4) !== 'PNG') {
        throw new Error('Not a PNG file');
    }
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    return { width, height };
}

try {
    const dims = getPngDimensions('src/assets/run.png');
    console.log(JSON.stringify(dims));
} catch (err) {
    console.error(err.message);
}
