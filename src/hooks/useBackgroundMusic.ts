import { useEffect, useRef } from 'react';
import { useAudioStore } from '../state/audioStore';

const FADE_DURATION = 1000;
const TARGET_VOLUME = 0.5;
const STEPS = 20;
const STEP_TIME = FADE_DURATION / STEPS;
const VOLUME_STEP = TARGET_VOLUME / STEPS;

const stopFade = (ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>) => {
    if (ref.current) {
        clearInterval(ref.current);
        ref.current = null;
    }
};

export const useBackgroundMusic = (src: string) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isMutedRef = useRef(false);
    const srcRef = useRef(src);
    const { isMuted, hasInteracted, setHasInteracted } = useAudioStore();

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // Create audio element once on mount — must be defined BEFORE the [src] effect
    useEffect(() => {
        const audio = new Audio();
        audio.loop = true;
        audio.volume = 0;
        audioRef.current = audio;

        // Start the initial track now that the element exists
        audio.src = srcRef.current;
        audio.play()
            .then(() => {
                if (!isMutedRef.current) {
                    stopFade(fadeRef);
                    fadeRef.current = setInterval(() => {
                        if (audio.volume < TARGET_VOLUME - VOLUME_STEP) {
                            audio.volume = Math.min(TARGET_VOLUME, audio.volume + VOLUME_STEP);
                        } else {
                            audio.volume = TARGET_VOLUME;
                            stopFade(fadeRef);
                        }
                    }, STEP_TIME);
                }
            })
            .catch(() => {
                // Autoplay blocked — handleInteraction will resume on first user gesture
            });

        const handleInteraction = () => {
            const a = audioRef.current;
            if (!a || isMutedRef.current) return;
            if (!a.paused) return;
            setHasInteracted();
            a.play().catch(console.error);
            stopFade(fadeRef);
            fadeRef.current = setInterval(() => {
                if (a.volume < TARGET_VOLUME - VOLUME_STEP) {
                    a.volume = Math.min(TARGET_VOLUME, a.volume + VOLUME_STEP);
                } else {
                    a.volume = TARGET_VOLUME;
                    stopFade(fadeRef);
                }
            }, STEP_TIME);
        };

        window.addEventListener('click', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('pointerdown', handleInteraction);

        return () => {
            stopFade(fadeRef);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('pointerdown', handleInteraction);
        };
    }, []);

    // Handle src changes — fade out old track, swap src, fade in new track
    useEffect(() => {
        srcRef.current = src;

        const startNewTrack = () => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.src = src;
            audio.loop = true;
            audio.volume = 0;
            audio.play()
                .then(() => {
                    if (!isMutedRef.current) {
                        stopFade(fadeRef);
                        fadeRef.current = setInterval(() => {
                            if (audio.volume < TARGET_VOLUME - VOLUME_STEP) {
                                audio.volume = Math.min(TARGET_VOLUME, audio.volume + VOLUME_STEP);
                            } else {
                                audio.volume = TARGET_VOLUME;
                                stopFade(fadeRef);
                            }
                        }, STEP_TIME);
                    }
                })
                .catch(console.error);
        };

        const audio = audioRef.current;
        if (!audio) return;

        // If already playing, fade out then swap
        if (!audio.paused && audio.volume > 0) {
            stopFade(fadeRef);
            fadeRef.current = setInterval(() => {
                if (audio.volume > VOLUME_STEP) {
                    audio.volume = Math.max(0, audio.volume - VOLUME_STEP);
                } else {
                    audio.volume = 0;
                    audio.pause();
                    stopFade(fadeRef);
                    startNewTrack();
                }
            }, STEP_TIME);
        } else {
            stopFade(fadeRef);
            startNewTrack();
        }
    }, [src]);

    // Handle mute/unmute
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !hasInteracted) return;

        stopFade(fadeRef);

        if (isMuted) {
            fadeRef.current = setInterval(() => {
                if (audio.volume > VOLUME_STEP) {
                    audio.volume = Math.max(0, audio.volume - VOLUME_STEP);
                } else {
                    audio.volume = 0;
                    stopFade(fadeRef);
                }
            }, STEP_TIME);
        } else {
            if (audio.paused) {
                audio.play().catch(console.error);
            }
            fadeRef.current = setInterval(() => {
                if (audio.volume < TARGET_VOLUME - VOLUME_STEP) {
                    audio.volume = Math.min(TARGET_VOLUME, audio.volume + VOLUME_STEP);
                } else {
                    audio.volume = TARGET_VOLUME;
                    stopFade(fadeRef);
                }
            }, STEP_TIME);
        }
    }, [isMuted]);
};