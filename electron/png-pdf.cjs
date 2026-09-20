const zlib = require("zlib");

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const paethPredictor = (left, above, upperLeft) => {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
    ? left
    : aboveDistance <= upperLeftDistance
      ? above
      : upperLeft;
};

function decodePng(data) {
  if (!Buffer.isBuffer(data) || data.length < PNG_SIGNATURE.length || !data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Export data is not a PNG image");
  }

  let offset = PNG_SIGNATURE.length;
  let width;
  let height;
  let bitDepth;
  let colorType;
  let interlace;
  const compressed = [];
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > data.length) throw new Error("PNG export is truncated");
    if (type === "IHDR") {
      width = data.readUInt32BE(start);
      height = data.readUInt32BE(start + 4);
      bitDepth = data[start + 8];
      colorType = data[start + 9];
      interlace = data[start + 12];
    } else if (type === "IDAT") {
      compressed.push(data.subarray(start, end));
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }

  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![0, 2, 6].includes(colorType)) {
    throw new Error("Unsupported PNG format for PDF export");
  }
  const sourceComponents = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const sourceStride = width * sourceComponents;
  const inflated = zlib.inflateSync(Buffer.concat(compressed));
  if (inflated.length < height * (sourceStride + 1)) throw new Error("PNG export has incomplete pixel data");

  const pixels = Buffer.alloc(width * height * sourceComponents);
  const previousRow = Buffer.alloc(sourceStride);
  let inputOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[inputOffset++];
    const rowStart = row * sourceStride;
    for (let column = 0; column < sourceStride; column += 1) {
      const value = inflated[inputOffset++];
      const left = column >= sourceComponents ? pixels[rowStart + column - sourceComponents] : 0;
      const above = previousRow[column];
      const upperLeft = column >= sourceComponents ? previousRow[column - sourceComponents] : 0;
      let decoded;
      if (filter === 0) decoded = value;
      else if (filter === 1) decoded = (value + left) & 0xff;
      else if (filter === 2) decoded = (value + above) & 0xff;
      else if (filter === 3) decoded = (value + Math.floor((left + above) / 2)) & 0xff;
      else if (filter === 4) decoded = (value + paethPredictor(left, above, upperLeft)) & 0xff;
      else throw new Error("PNG export uses an unsupported filter");
      pixels[rowStart + column] = decoded;
    }
    pixels.copy(previousRow, 0, rowStart, rowStart + sourceStride);
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const source = pixel * sourceComponents;
    const target = pixel * 3;
    if (colorType === 0) {
      rgb[target] = pixels[source];
      rgb[target + 1] = pixels[source];
      rgb[target + 2] = pixels[source];
      alpha[pixel] = 0xff;
    } else {
      rgb[target] = pixels[source];
      rgb[target + 1] = pixels[source + 1];
      rgb[target + 2] = pixels[source + 2];
      alpha[pixel] = colorType === 6 ? pixels[source + 3] : 0xff;
    }
  }
  return { width, height, rgb, alpha };
}

function pdfStream(dictionary, data) {
  return Buffer.concat([
    Buffer.from(`${dictionary} /Length ${data.length} >>\nstream\n`),
    data,
    Buffer.from("\nendstream"),
  ]);
}

function renderPngAsPdf(pngData) {
  const { width, height, rgb, alpha } = decodePng(pngData);
  const widthInPoints = (width * 72) / 96;
  const heightInPoints = (height * 72) / 96;
  const rgbData = zlib.deflateSync(rgb);
  const alphaData = zlib.deflateSync(alpha);
  const content = Buffer.from(`q\n${widthInPoints} 0 0 ${heightInPoints} 0 0 cm\n/Im0 Do\nQ`);
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${widthInPoints} ${heightInPoints}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    pdfStream(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /SMask 6 0 R`, rgbData),
    pdfStream("<<", content),
    pdfStream(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, alphaData),
  ];

  const chunks = [Buffer.from("%PDF-1.4\n%\xff\xff\xff\xff\n")];
  const offsets = [0];
  let position = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const prefix = Buffer.from(`${index + 1} 0 obj\n`);
    const suffix = Buffer.from("\nendobj\n");
    chunks.push(prefix, object, suffix);
    position += prefix.length + object.length + suffix.length;
  });
  const xrefPosition = position;
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`));
  offsets.slice(1).forEach((entry) => chunks.push(Buffer.from(`${entry.toString().padStart(10, "0")} 00000 n \n`)));
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

module.exports = { renderPngAsPdf };
