export type ResolvedMediaKind = 'image' | 'youtube' | 'video' | 'link';

export interface ResolvedMedia {
  kind: ResolvedMediaKind;
  primaryUrl: string;
  fallbackUrl?: string;
  embedUrl?: string;
  driveFileId?: string;
  youtubeId?: string;
}

export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  // https://drive.google.com/open?id=FILE_ID or /uc?id=FILE_ID or /thumbnail?id=FILE_ID
  const idParamMatch = trimmed.match(
    /(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i
  );
  if (idParamMatch?.[1]) return idParamMatch[1];

  // https://lh3.googleusercontent.com/d/FILE_ID
  const lh3Match = trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);
  if (lh3Match?.[1]) return lh3Match[1];

  return null;
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (watchMatch?.[1] && /youtube\.com/i.test(trimmed)) return watchMatch[1];

  // youtube.com/shorts/VIDEO_ID or /embed/VIDEO_ID or /live/VIDEO_ID
  const pathMatch = trimmed.match(
    /youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{6,})/i
  );
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
}

export function resolveMediaUrl(
  rawUrl: string,
  preferredType: 'auto' | 'image' | 'video' | 'youtube' = 'auto'
): ResolvedMedia {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { kind: 'image', primaryUrl: '' };
  }

  // 1. Check YouTube
  const ytId = extractYouTubeId(trimmed);
  if (ytId || preferredType === 'youtube') {
    const id = ytId || '';
    return {
      kind: 'youtube',
      primaryUrl: trimmed,
      youtubeId: id,
      embedUrl: id ? `https://www.youtube.com/embed/${id}` : trimmed,
    };
  }

  // 2. Check Google Drive link
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    if (preferredType === 'video') {
      return {
        kind: 'youtube', // iframe preview for Drive videos
        primaryUrl: trimmed,
        driveFileId: driveId,
        embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
      };
    }
    // Google Drive image: lh3.googleusercontent.com renders cleanly without CORS blocks,
    // with automatic fallback to drive.google.com/thumbnail?id=...&sz=w1600
    return {
      kind: 'image',
      primaryUrl: `https://lh3.googleusercontent.com/d/${driveId}`,
      fallbackUrl: `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`,
      driveFileId: driveId,
    };
  }

  // 3. Direct video extension
  if (
    preferredType === 'video' ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)
  ) {
    return {
      kind: 'video',
      primaryUrl: trimmed,
    };
  }

  // 4. Direct image / local asset path
  return {
    kind: 'image',
    primaryUrl: trimmed,
  };
}
