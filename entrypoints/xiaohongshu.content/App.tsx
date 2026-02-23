import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrapedImage {
    url: string;
    title: string;
}

const App: React.FC = () => {
    const [images, setImages] = useState<ScrapedImage[]>([]);
    const [userName, setUserName] = useState<string>('REDnote_User');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

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
            <AnimatePresence>
                {isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="scraper-panel"
                    >
                        <div className="scraper-header">
                            <div className="scraper-title-group">
                                <div className="scraper-icon-wrapper">
                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="18" height="18">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                </div>
                                <h3 className="scraper-title">REDnote Scraper</h3>
                            </div>
                            <button className="scraper-close-btn" onClick={() => setIsOpen(false)}>
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="scraper-content">
                            <div className="scraper-stat-card">
                                <div className="stat-label">TARGET USER</div>
                                <div className="stat-value user-name">{userName}</div>
                            </div>
                            
                            <div className="scraper-stat-card">
                                <div className="stat-label">COVERS FOUND</div>
                                <div className="stat-value count">
                                    <motion.span
                                        key={images.length}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="count-number"
                                    >
                                        {images.length}
                                    </motion.span>
                                    <span className="count-label">images</span>
                                </div>
                            </div>
                        </div>

                        <motion.button
                            className="scraper-button"
                            onClick={handleDownload}
                            disabled={isDownloading || images.length === 0}
                            whileHover={!isDownloading && images.length > 0 ? { scale: 1.02 } : {}}
                            whileTap={!isDownloading && images.length > 0 ? { scale: 0.98 } : {}}
                        >
                            {isDownloading ? (
                                <div className="btn-content">
                                    <svg className="animate-spin" viewBox="0 0 24 24" width="18" height="18" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>DOWNLOADING...</span>
                                </div>
                            ) : (
                                <div className="btn-content">
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span>DOWNLOAD ALL</span>
                                </div>
                            )}
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="scraper-fab"
                        onClick={() => setIsOpen(true)}
                    >
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" width="24" height="24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        {images.length > 0 && (
                            <span className="fab-badge">{images.length}</span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default App;
