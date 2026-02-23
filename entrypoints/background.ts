export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  async function convertWebpToPngDataUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0);
    }
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    
    const arrayBuffer = await pngBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const CHUNK_SIZE = 0x8000; // 32768
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK_SIZE)));
    }
    const base64 = btoa(binary);
    return `data:image/png;base64,${base64}`;
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'download_images') {
      const { images, userName } = message.payload;

      images.forEach(async (img: { url: string, title: string }, index: number) => {
        try {
          // Convert to PNG
          const dataUrl = await convertWebpToPngDataUrl(img.url);
          
          // Handle filename: userName/title.png
          const filename = `${userName}/${img.title}.png`;

          browser.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: false,
          }).catch((err) => {
            console.error("Download failed:", err);
          });
        } catch (err) {
          console.error("Failed to convert or download image:", err);
        }
      });
      sendResponse({ status: 'started' });
    }
  });
});
