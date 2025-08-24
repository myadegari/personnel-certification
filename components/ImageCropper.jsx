'use client';
import { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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


export default function ImageCropper({ isOpen, onOpenChange, image, onCropComplete }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  async function handleCrop() {
    if (imgRef.current && crop?.width && crop?.height) {
      const croppedFile = await getCroppedImg(imgRef.current, crop, 'cropped-image.png');
      onCropComplete(croppedFile);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crop Your Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            aspect={1} // Enforce 1:1 square aspect ratio
            minWidth={100}
          >
            <img ref={imgRef} src={image} onLoad={onImageLoad} alt="Crop preview" />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCrop}>Confirm Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}