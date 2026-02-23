import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';

export default defineContentScript({
    matches: ['*://*.xiaohongshu.com/user/profile/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {
        const ui = await createShadowRootUi(ctx, {
            name: 'rednote-downloader-ui',
            position: 'inline',
            anchor: 'body',
            append: 'last',
            onMount: (container) => {
                const root = ReactDOM.createRoot(container);
                root.render(<App />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });
        ui.mount();
    },
});
