export type CameraCaptureProps = {
  onCapture: (photo: string) => void;
};

// apps/pos-mobile never reaches COD checkout, but Metro must still bundle this module.
export const CameraCapture = (_props: CameraCaptureProps) => null;
