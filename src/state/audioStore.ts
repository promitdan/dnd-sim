import { create } from 'zustand';

interface AudioStore {
    isMuted: boolean;
    hasInteracted: boolean;
    toggleMute: () => void;
    setHasInteracted: () => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
    isMuted: false,
    hasInteracted: false,
    toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
    setHasInteracted: () => set({ hasInteracted: true })
}));