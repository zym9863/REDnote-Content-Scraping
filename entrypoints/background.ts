export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'download_images') {
      const { images, userName } = message.payload;

      images.forEach((url: string, index: number) => {
        // Handle filename: userName/image_index.ext
        const urlObj = new URL(url);
        let ext = '.jpg';
        if (urlObj.pathname.endsWith('.png')) ext = '.png';
        if (urlObj.pathname.endsWith('.webp')) ext = '.webp';

        // Sometimes RED images have traceId parameter instead of extension
        const timestamp = Date.now();
        const filename = `${userName}/cover_${timestamp}_${index}${ext}`;

        browser.downloads.download({
          url: url,
          filename: filename,
          saveAs: false,
        }).catch((err) => {
          console.error("Download failed:", err);
        });
      });
      sendResponse({ status: 'started' });
    }
  });
});
