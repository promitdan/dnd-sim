import { useState, useEffect } from 'react';

// urls must be a stable reference (module-level constant or useMemo) —
// the effect runs once on mount and does not react to url changes.
export const usePreloadImages = (urls: readonly string[]) => {
    const [loadedCount, setLoadedCount] = useState(0);
    const total = urls.length;

    useEffect(() => {
        if (total === 0) return;
        urls.forEach(url => {
            const img = new Image();
            img.onload = img.onerror = () => setLoadedCount(c => c + 1);
            img.src = url;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        progress: total === 0 ? 1 : Math.min(loadedCount / total, 1),
        loaded: total === 0 || loadedCount >= total,
    };
};
