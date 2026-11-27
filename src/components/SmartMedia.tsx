import React, { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../utils/mediaUrl';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackElement?: React.ReactNode;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = '',
  fallbackElement = null,
}) => {
  const resolved = resolveMediaUrl(src, 'image');
  const [currentSrc, setCurrentSrc] = useState(resolved.primaryUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const next = resolveMediaUrl(src, 'image');
    setCurrentSrc(next.primaryUrl);
    setTriedFallback(false);
    setFailed(false);
  }, [src]);

  if (!currentSrc || failed) {
    return <>{fallbackElement}</>;
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!triedFallback && resolved.fallbackUrl && currentSrc !== resolved.fallbackUrl) {
          setTriedFallback(true);
          setCurrentSrc(resolved.fallbackUrl);
        } else {
          setFailed(true);
        }
      }}
      className={className}
    />
  );
};

interface SmartMediaViewerProps {
  url: string;
  title: string;
  mediaType?: 'auto' | 'image' | 'video' | 'youtube';
  className?: string;
}

export const SmartMediaViewer: React.FC<SmartMediaViewerProps> = ({
  url,
  title,
  mediaType = 'auto',
  className = '',
}) => {
  const resolved = resolveMediaUrl(url, mediaType);

  if (resolved.kind === 'youtube' && resolved.embedUrl) {
    return (
      <div className={`aspect-video w-full overflow-hidden rounded-xl border border-[#E6E0D4] bg-black ${className}`}>
        <iframe
          src={resolved.embedUrl}
          title={title || 'فيديو توضيحي'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (resolved.kind === 'video') {
    return (
      <video
        src={resolved.primaryUrl}
        controls
        className={`w-full max-h-80 rounded-xl border border-[#E6E0D4] bg-black object-contain ${className}`}
      />
    );
  }

  return (
    <SmartImage
      src={url}
      alt={title}
      className={`w-full h-56 object-cover rounded-xl border border-[#E6E0D4] bg-[#FBF9F5] ${className}`}
      fallbackElement={
        <div className="w-full h-56 rounded-xl border border-[#E6E0D4] bg-[#FBF9F5] flex flex-col items-center justify-center p-4 text-center text-xs text-[#6B655E]">
          <span>تعذر عرض الصورة من الرابط المرفق</span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-[#14532D] underline mt-1.5"
          >
            فتح الرابط مباشرة
          </a>
        </div>
      }
    />
  );
};
