import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const VIDEOS = [
  { src: '/videos/stand_1.mp4', alt: 'Presentación del primer stand' },
  { src: '/videos/stand_2.mp4', alt: 'Presentación del segundo stand' },
  { src: '/videos/stand_3.mp4', alt: 'Presentación del tercer stand' }
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const VideoShowcase = forwardRef(function VideoShowcase({ activeIndex = 0 }, ref) {
  const videosRef = useRef([]);
  const durationsRef = useRef([0, 0, 0]);
  const timelineRef = useRef(0);
  const lastTimelineRef = useRef(0);
  const rafRef = useRef(0);
  const [readyCount, setReadyCount] = useState(0);

  const getTotalDuration = () => durationsRef.current.reduce((sum, duration) => sum + (duration || 0), 0);

  const getTimelinePosition = (progress) => {
    const durations = durationsRef.current;
    const total = getTotalDuration();
    if (!total) return { index: 0, local: 0 };

    const target = clamp(progress, 0, 1) * total;
    let remaining = target;

    for (let i = 0; i < durations.length; i += 1) {
      const duration = durations[i] || 0;
      if (remaining <= duration || i === durations.length - 1) {
        return {
          index: i,
          local: clamp(remaining, 0, Math.max(0, duration - 0.02))
        };
      }
      remaining -= duration;
    }

    return { index: durations.length - 1, local: 0 };
  };

  const renderTimeline = () => {
    rafRef.current = 0;

    const total = getTotalDuration();
    if (!total) return;

    const { index, local } = getTimelinePosition(timelineRef.current);
    const active = videosRef.current[index];
    if (!active || !Number.isFinite(active.duration) || active.duration <= 0) return;

    videosRef.current.forEach((video, i) => {
      if (!video) return;
      video.classList.toggle('is-active', i === index);
      video.muted = true;
      video.playsInline = true;
      if (i !== index) video.pause();
    });

    const timelineMoved = Math.abs(timelineRef.current - lastTimelineRef.current) > 0.0005;

    // The video is a REAL video: it keeps playing. While the user scrolls,
    // the scroll position gently seeks it to the corresponding point.
    if (timelineMoved && Math.abs(active.currentTime - local) > 0.08) {
      try {
        active.currentTime = local;
      } catch (_) {}
    }

    active.muted = true;
    active.playsInline = true;

    const playPromise = active.play();
    if (playPromise?.catch) playPromise.catch(() => {});

    lastTimelineRef.current = timelineRef.current;
  };

  const setTimeline = (progress) => {
    timelineRef.current = clamp(progress, 0, 1);

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(renderTimeline);
    }
  };

  const playCurrent = () => {
    const { index } = getTimelinePosition(timelineRef.current);
    const video = videosRef.current[index];
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => {});
  };

  useImperativeHandle(ref, () => ({
    setTimeline,
    getTimeline: () => timelineRef.current,
    getActiveIndex: () => getTimelinePosition(timelineRef.current).index,
    getTotalDuration,
    play: playCurrent,
    pause: () => videosRef.current.forEach((video) => video?.pause())
  }));

  useEffect(() => {
    const cleanups = VIDEOS.map((_, index) => {
      const video = videosRef.current[index];
      if (!video) return () => {};

      const updateMetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          durationsRef.current[index] = video.duration;
          setReadyCount((count) => count + 1);
          setTimeline(timelineRef.current);
        }
      };

      const handleEnded = () => {
        // Each stand behaves like a real moving video while it is the active
        // slide. Looping prevents the page from freezing on a final frame.
        video.currentTime = 0;
        const promise = video.play();
        if (promise?.catch) promise.catch(() => {});
      };

      video.addEventListener('loadedmetadata', updateMetadata);
      video.addEventListener('durationchange', updateMetadata);
      video.addEventListener('ended', handleEnded);

      video.muted = true;
      video.playsInline = true;
      video.autoplay = index === 0;
      video.loop = true;
      video.preload = 'metadata';

      return () => {
        video.removeEventListener('loadedmetadata', updateMetadata);
        video.removeEventListener('durationchange', updateMetadata);
        video.removeEventListener('ended', handleEnded);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (readyCount > 0) setTimeline(timelineRef.current);
  }, [readyCount]);

  useEffect(() => {
    // When App changes the visible stand text, immediately activate the
    // corresponding real video and keep it playing.
    const index = clamp(activeIndex, 0, VIDEOS.length - 1);
    const video = videosRef.current[index];
    if (!video) return;

    videosRef.current.forEach((item, i) => {
      if (!item) return;
      item.classList.toggle('is-active', i === index);
      if (i !== index) item.pause();
    });

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    const promise = video.play();
    if (promise?.catch) promise.catch(() => {});
  }, [activeIndex]);

  return (
    <div className="video-showcase" aria-label="Presentación continua de stands">
      <div className="video-showcase-stage">
        {VIDEOS.map((video, index) => (
          <video
            key={video.src}
            ref={(element) => { videosRef.current[index] = element; }}
            className={`showcase-video ${index === 0 ? 'is-active' : ''}`}
            src={video.src}
            muted
            playsInline
            autoPlay={index === 0}
            loop
            preload="metadata"
            aria-label={video.alt}
          />
        ))}
      </div>
    </div>
  );
});

export default VideoShowcase;
