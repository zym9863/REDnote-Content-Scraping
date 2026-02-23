import React, { useState, useEffect } from 'react';

interface ScrapedImage {
    url: string;
    title: string;
}

const App: React.FC = () => {
    const [images, setImages] = useState<ScrapedImage[]>([]);
    const [userName, setUserName] = useState<string>('REDnote_User');
    const [isDownloading, setIsDownloading] = useState(false);

    // XPath helper
    const getElementByXPath = (xpath: string, contextNode: Node = document): HTMLElement | null => {
        try {
            const result = document.evaluate(
                xpath,
                contextNode,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            return result.singleNodeValue as HTMLElement | null;
        } catch (e) {
            return null;
        }
    };

    const getElementsByXPath = (xpath: string, contextNode: Node = document): HTMLElement[] => {
        try {
            const result = document.evaluate(
                xpath,
                contextNode,
                null,
                XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                null
            );
            let node = result.iterateNext();
            const nodes: HTMLElement[] = [];
            while (node) {
                nodes.push(node as HTMLElement);
                node = result.iterateNext();
            }
            return nodes;
        } catch (e) {
            return [];
        }
    };

    const scanImages = () => {
        // Exact XPath for username provided by user: 
        // /html/body/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[2]/div[1]/div[1]/div[2]/div[1]/div
        const userNameElement = getElementByXPath('/html/body/div[2]/div[1]/div[2]/div[2]/div/div[1]/div/div[2]/div[1]/div[1]/div[2]/div[1]/div');
        if (userNameElement && userNameElement.textContent) {
            // Remove any unsafe characters for folder names
            const cleanName = userNameElement.textContent.trim().replace(/[\\/:*?"<>|]/g, '_');
            if (cleanName) {
                setUserName(cleanName);
            }
        }

        // We generalize it to all sections
        const sectionsXPath = '/html/body/div[2]/div[1]/div[2]/div[2]/div/div[3]/div/div[1]/div[1]/section';
        const sectionNodes = getElementsByXPath(sectionsXPath);

        let foundImages: ScrapedImage[] = [];

        if (sectionNodes.length > 0) {
            sectionNodes.forEach((section, index) => {
                // Image XPath relative to section: ./div/a[2]/img or similar
                const imgNode = getElementByXPath('.//img', section) as HTMLImageElement;
                // Title XPath relative to section: ./div/div/a/span
                const titleNode = getElementByXPath('./div/div/a/span', section);
                
                if (imgNode && imgNode.src) {
                    const src = imgNode.src;
                    let title = titleNode ? titleNode.textContent?.trim() || '' : '';
                    // Clean title for filename and truncate
                    title = title.replace(/[\r\n]+/g, ' ').replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
                    if (!title) {
                        title = `cover_${Date.now()}_${index}`;
                    }
                    foundImages.push({ url: src, title });
                }
            });
        }

        // Fallback if the XPath completely fails (e.g. DOM updates)
        if (foundImages.length === 0) {
            const fallbacks = document.querySelectorAll('section.note-item');
            fallbacks.forEach((section, index) => {
                const img = section.querySelector('img');
                const titleNode = section.querySelector('.title span') || section.querySelector('.title') || section.querySelector('div > div > a > span');
                if (img && (img as HTMLImageElement).src) {
                    let title = titleNode ? titleNode.textContent?.trim() || '' : '';
                    title = title.replace(/[\r\n]+/g, ' ').replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
                    if (!title) {
                        title = `cover_${Date.now()}_${index}`;
                    }
                    foundImages.push({ url: (img as HTMLImageElement).src, title });
                }
            });
        }

        // filter duplicates
        const uniqueImages: ScrapedImage[] = [];
        const seenUrls = new Set<string>();
        for (const img of foundImages) {
            if (!seenUrls.has(img.url)) {
                seenUrls.add(img.url);
                uniqueImages.push(img);
            }
        }
        setImages(uniqueImages);
    };

    useEffect(() => {
        // Initial scan
        scanImages();

        // Setup an interval to continually scan as user scrolls
        const interval = setInterval(() => {
            scanImages();
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleDownload = () => {
        if (images.length === 0) return;
        setIsDownloading(true);

        // Send to background script
        browser.runtime.sendMessage({
            action: 'download_images',
            payload: {
                images,
                userName
            }
        }).then(() => {
            setTimeout(() => {
                setIsDownloading(false);
            }, 2000); // reset button after 2s
        }).catch((err) => {
            console.error(err);
            setIsDownloading(false);
        });
    };

    return (
        <div id="rednote-scraper-container">
            <h3 className="scraper-title">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                小红书作品采集
            </h3>
            <div className="scraper-stats">
                <span>用户: <strong style={{ color: '#ff2442' }}>{userName}</strong></span> <br />
                <span style={{ marginTop: '4px', display: 'inline-block' }}>已扫描到 <strong>{images.length}</strong> 张封面</span>
            </div>
            <button
                className="scraper-button"
                onClick={handleDownload}
                disabled={isDownloading || images.length === 0}
            >
                {isDownloading ? (
                    <>
                        <svg className="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        开始下载...
                    </>
                ) : '批量下载本页封面'}
            </button>
        </div>
    );
};

export default App;
