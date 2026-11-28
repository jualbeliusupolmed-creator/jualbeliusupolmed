async function loadPhoton() {
  if (process.env.IMAGE_PROCESSOR_RUNTIME === "workerd") {
    return import("@cf-wasm/photon/workerd");
  }
  return import("@cf-wasm/photon/node");
}

async function encodeWebp(imageBytes, addWatermark) {
  const { PhotonImage, Rgba, draw_text_with_color } = await loadPhoton();
  const image = PhotonImage.new_from_byteslice(imageBytes);
  try {
    if (addWatermark) {
      const width = image.get_width();
      const height = image.get_height();
      const text = "JUAL BELI USU";
      const fontSize = Math.max(width * 0.05, 20);
      const x = Math.max(0, Math.round((width - text.length * fontSize * 0.58) / 2));
      const y = Math.round(height / 2);
      const shadow = new Rgba(0, 0, 0, 128);
      const foreground = new Rgba(255, 255, 255, 179);
      draw_text_with_color(image, text, x + 2, y + 2, fontSize, shadow);
      draw_text_with_color(image, text, x, y, fontSize, foreground);
    }

    return image.get_bytes_webp();
  } finally {
    image.free();
  }
}

export async function convertImageToWebp(imageBytes) {
  return encodeWebp(imageBytes, false);
}

export async function processImageWithWatermark(imageBytes) {
  return encodeWebp(imageBytes, true);
}
