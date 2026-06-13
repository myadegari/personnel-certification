'use client';
import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { VisuallyHidden } from 'radix-ui';
import { Button } from "@/components/ui/button";

// Helper function to generate the cropped image
function getCroppedImg(image, crop, fileName) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      blob.name = fileName;
      resolve(new File([blob], fileName, { type: blob.type }));
    }, 'image/png');
  });
}
// 👇 Helper to convert % crop to pixel crop
function convertToPixelCrop(crop, imageWidth, imageHeight) {
  if (!crop || !imageWidth || !imageHeight) return null;
  if (crop.unit === '%') {
    return {
      x: (crop.x / 100) * imageWidth,
      y: (crop.y / 100) * imageHeight,
      width: (crop.width / 100) * imageWidth,
      height: (crop.height / 100) * imageHeight,
    };
  }
  return crop;
}

export default function ImageCropper({ isOpen, onOpenChange, image, onCropComplete,aspect=1 }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null); // ✅ This is key!

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

 async function handleCrop() {
    if (!imgRef.current || !completedCrop) {
      console.warn('No completed crop available');
      return;
    }
      // ✅ Ensure crop is perfectly 1:1 before cropping
  const { width: imgWidth, height: imgHeight } = imgRef.current;
  const pixelCrop = convertToPixelCrop(crop, imgWidth, imgHeight);

  // Enforce square by using min dimension
  // const size = Math.min(pixelCrop.width, pixelCrop.height);
  const enforcedCrop = {
    x: pixelCrop.x,
    y: pixelCrop.y,
    width: pixelCrop.width,
    height: pixelCrop.height,
  };

    // ✅ Use completedCrop — it's in pixels and validated
    const croppedFile = await getCroppedImg(imgRef.current, enforcedCrop, 'cropped-image.png');
    onCropComplete(croppedFile);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <VisuallyHidden.Root>

          <DialogTitle>تنظیم تصویر پروفایل</DialogTitle>
          </VisuallyHidden.Root>
        </DialogHeader>
        <div className="flex justify-center">
             <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)} // keep % for UI
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)} // ✅ use pixelCrop for actual cropping
            aspect={aspect}
            minWidth={100}
          >
            <img ref={imgRef} src={image} onLoad={onImageLoad} alt="Crop preview" />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>لغو</Button>
          <Button 
            onClick={handleCrop} 
            disabled={!completedCrop} // ✅ Only enable when crop is ready
          >
            تایید برش
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}