import sharp from 'sharp';

export interface GridOptions {
  /** Minor grid line spacing in pixels (default: 100) */
  gridSpacing?: number;
  /** Coordinate label spacing in pixels (default: 200) */
  labelSpacing?: number;
}

/**
 * Add a coordinate grid overlay to a JPEG image buffer.
 * Returns a new JPEG buffer with grid lines and coordinate labels.
 */
export async function addCoordinateGrid(
  imageBuffer: Buffer,
  width: number,
  height: number,
  options: GridOptions = {},
): Promise<Buffer> {
  const gridSpacing = options.gridSpacing ?? 100;
  const labelSpacing = options.labelSpacing ?? 200;
  const majorSpacing = gridSpacing * 5; // 500px

  const svgParts: string[] = [];

  // --- Grid lines ---
  for (let x = gridSpacing; x < width; x += gridSpacing) {
    const isMajor = x % majorSpacing === 0;
    const opacity = isMajor ? 0.35 : 0.15;
    const sw = isMajor ? 1.5 : 0.5;
    svgParts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(255,50,50,${opacity})" stroke-width="${sw}"/>`,
    );
  }
  for (let y = gridSpacing; y < height; y += gridSpacing) {
    const isMajor = y % majorSpacing === 0;
    const opacity = isMajor ? 0.35 : 0.15;
    const sw = isMajor ? 1.5 : 0.5;
    svgParts.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(255,50,50,${opacity})" stroke-width="${sw}"/>`,
    );
  }

  // --- Coordinate labels along top edge ---
  for (let x = labelSpacing; x < width; x += labelSpacing) {
    const text = String(x);
    const tw = text.length * 7.5 + 6;
    svgParts.push(
      `<rect x="${x - tw / 2}" y="2" width="${tw}" height="16" fill="rgba(0,0,0,0.65)" rx="3"/>`,
      `<text x="${x}" y="14" text-anchor="middle" fill="#ff6666" font-size="11" font-family="Consolas,monospace" font-weight="bold">${text}</text>`,
    );
  }

  // --- Coordinate labels along left edge ---
  for (let y = labelSpacing; y < height; y += labelSpacing) {
    const text = String(y);
    const tw = text.length * 7.5 + 6;
    svgParts.push(
      `<rect x="2" y="${y - 8}" width="${tw}" height="16" fill="rgba(0,0,0,0.65)" rx="3"/>`,
      `<text x="5" y="${y + 4}" fill="#ff6666" font-size="11" font-family="Consolas,monospace" font-weight="bold">${text}</text>`,
    );
  }

  // --- Origin label ---
  svgParts.push(
    `<rect x="2" y="2" width="22" height="16" fill="rgba(0,0,0,0.65)" rx="3"/>`,
    `<text x="5" y="14" fill="#ff6666" font-size="11" font-family="Consolas,monospace" font-weight="bold">0,0</text>`,
  );

  // --- Dimension label at bottom-right ---
  const dimText = `${width}x${height}`;
  const dimTw = dimText.length * 7.5 + 6;
  svgParts.push(
    `<rect x="${width - dimTw - 2}" y="${height - 18}" width="${dimTw}" height="16" fill="rgba(0,0,0,0.65)" rx="3"/>`,
    `<text x="${width - dimTw / 2 - 2}" y="${height - 6}" text-anchor="middle" fill="#ff6666" font-size="11" font-family="Consolas,monospace" font-weight="bold">${dimText}</text>`,
  );

  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgParts.join('')}</svg>`,
  );

  return sharp(imageBuffer)
    .composite([{ input: svg, top: 0, left: 0 }])
    .jpeg({ quality: 70 })
    .toBuffer();
}
