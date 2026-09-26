import { useEffect, useRef, useState } from 'react';
import { Button, Image, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { Camera, RotateCcw } from '@tamagui/lucide-icons';

export type CameraCaptureProps = {
  onCapture: (photo: string) => void;
};

type CameraState =
  | { type: 'requesting' }
  | { type: 'live' }
  | { type: 'preview'; photo: string }
  | { type: 'denied' }
  | { type: 'unsupported' };

const VIEWFINDER_SIZE = 280;
const MAX_CAPTURE_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

const GUIDANCE_TEXT =
  'Foto suasana di sekitar meja Anda agar barista bisa memastikan Anda berada di kafe. Foto hanya dipakai untuk verifikasi dan langsung dihapus setelah dikonfirmasi.';
const DENIED_TEXT = 'Izinkan akses kamera untuk memakai COD, atau pilih QRIS.';
const UNSUPPORTED_TEXT =
  'Browser ini tidak mendukung kamera. Silakan pilih QRIS.';

function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

function stopAllTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function captureFrameAsJpeg(video: HTMLVideoElement): Promise<string> {
  const longEdge = Math.max(video.videoWidth, video.videoHeight);
  const scale = longEdge > 0 ? Math.min(1, MAX_CAPTURE_DIMENSION / longEdge) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to capture photo'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

export const CameraCapture = ({ onCapture }: CameraCaptureProps) => {
  const [state, setState] = useState<CameraState>(() =>
    isCameraSupported() ? { type: 'requesting' } : { type: 'unsupported' }
  );
  const [streamAttempt, setStreamAttempt] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isCameraSupported()) return;

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stopAllTracks(stream);
          return;
        }
        streamRef.current = stream;
        setState({ type: 'live' });
      })
      .catch(() => {
        if (!cancelled) setState({ type: 'denied' });
      });

    return () => {
      cancelled = true;
      stopAllTracks(streamRef.current);
      streamRef.current = null;
    };
  }, [streamAttempt]);

  useEffect(() => {
    if (state.type !== 'live' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    // Some browsers (and jsdom) reject or omit the play() promise; either way there is
    // nothing actionable to do beyond letting the live view stay silent.
    try {
      videoRef.current.play()?.catch(() => undefined);
    } catch {
      // ignore: some browsers throw synchronously instead of rejecting
    }
  }, [state.type]);

  const handleShutterPress = async () => {
    const video = videoRef.current;
    if (!video) return;
    const photo = await captureFrameAsJpeg(video);
    stopAllTracks(streamRef.current);
    streamRef.current = null;
    setState({ type: 'preview', photo });
  };

  const handleRetake = () => {
    setState({ type: 'requesting' });
    setStreamAttempt((attempt) => attempt + 1);
  };

  if (state.type === 'unsupported') {
    return (
      <YStack gap="$3" padding="$4" alignItems="center">
        <Paragraph textAlign="center">{UNSUPPORTED_TEXT}</Paragraph>
      </YStack>
    );
  }

  if (state.type === 'denied') {
    return (
      <YStack gap="$3" padding="$4" alignItems="center">
        <Paragraph textAlign="center">{DENIED_TEXT}</Paragraph>
      </YStack>
    );
  }

  if (state.type === 'preview') {
    return (
      <YStack gap="$3" alignItems="center">
        <Image
          src={`data:image/jpeg;base64,${state.photo}`}
          width={VIEWFINDER_SIZE}
          height={VIEWFINDER_SIZE * 0.75}
          borderRadius="$4"
        />
        <XStack gap="$3">
          <Button icon={RotateCcw} onPress={handleRetake}>
            Ulangi
          </Button>
          <Button theme="active" onPress={() => onCapture(state.photo)}>
            Pakai foto ini
          </Button>
        </XStack>
      </YStack>
    );
  }

  return (
    <YStack gap="$3" alignItems="center">
      <Paragraph textAlign="center">{GUIDANCE_TEXT}</Paragraph>
      <YStack
        width={VIEWFINDER_SIZE}
        height={VIEWFINDER_SIZE * 0.75}
        borderRadius="$4"
        overflow="hidden"
        backgroundColor="$color2"
        alignItems="center"
        justifyContent="center"
      >
        {state.type === 'requesting' ? (
          <Spinner />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </YStack>
      <Button
        icon={Camera}
        theme="active"
        disabled={state.type !== 'live'}
        onPress={handleShutterPress}
      >
        Ambil foto
      </Button>
    </YStack>
  );
};
