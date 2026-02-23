import React, { useState, useEffect } from 'react';

const App: React.FC = () => {
    const [images, setImages] = useState<string[]>([]);
    const [userName, setUserName] = useState<string>('REDnote_User');
    const [isDownloading, setIsDownloading] = useState(false);

    // XPath helper
    const getElementByXPath = (xpath: string): HTMLElement | null => {
        try {
            const result = document.evaluate(
                xpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            return result.singleNodeValue as HTMLElement | null;
        } catch (e) {
            return null;
        }
    };

    const getElementsByXPath = (xpath: string): HTMLElement[] => {
        try {
            const result = document.evaluate(
                xpath,
                document,
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

        // Exact XPath for image provided by user:
        // /html/body/div[2]/div[1]/div[2]/div[2]/div/div[3]/div/div[1]/div[1]/section[1]/div/a[2]/img
        // We generalize it to all sections
        const imagesXPath = '/html/body/div[2]/div[1]/div[2]/div[2]/div/div[3]/div/div[1]/div[1]/section/div/a[2]/img';

        let foundImages: string[] = [];

        const imageNodes = getElementsByXPath(imagesXPath);
        if (imageNodes.length > 0) {
            foundImages = imageNodes.map(img => {
                const src = (img as HTMLImageElement).src;
                // 小红书的封面图可能有不带 protocol 的相对路径或者是不同的分辨率参数, 获取最高清的或者直接用 src
                // 如果有 style background-image，我们也可以尝试获取但这需要特定的 class
                return src;
            }).filter(Boolean);
        }

        // Fallback if the XPath completely fails (e.g. DOM updates)
        if (foundImages.length === 0) {
            const fallbacks = document.querySelectorAll('section.note-item img');
            fallbacks.forEach(img => {
                if ((img as HTMLImageElement).src) {
                    foundImages.push((img as HTMLImageElement).src);
                }
            });
        }

        // filter duplicates
        foundImages = Array.from(new Set(foundImages));
        setImages(foundImages);
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
