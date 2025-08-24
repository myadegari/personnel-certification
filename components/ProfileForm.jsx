'use client';
import { useState } from 'react';
// import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageCropper from './ImageCropper'; // Import the new component

// --- UPDATE THE HELPER FUNCTION ---
// It now accepts a 'fileType' argument
async function uploadFile(file, fileType) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType); // Send the type to the API

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('File upload failed');
  }

  const data = await res.json();
  return data.url;
}

export default function ProfileForm({ user }) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    position: user.position || '', // مقدار اولیه برای فیلد سمت
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [signatureImageFile, setSignatureImageFile] = useState(null);
  
  const [profilePreview, setProfilePreview] = useState(user.profileImage || null);
  const [signaturePreview, setSignaturePreview] = useState(user.signatureImage || null);
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

    // --- NEW STATE FOR CROPPER ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const handleTextChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      if (name === 'profileImage') {
        setImageToCrop(URL.createObjectURL(file));
        setIsCropperOpen(true);
      } else if (name === 'signatureImage') {
        setSignatureImageFile(file);
        setSignaturePreview(previewUrl);
      }
    }
  };
   // --- NEW HANDLER FOR WHEN CROP IS COMPLETE ---
  const handleCropComplete = (croppedFile) => {
    setProfileImageFile(croppedFile);
    setProfilePreview(URL.createObjectURL(croppedFile));
    setIsCropperOpen(false); // Close the modal
    setImageToCrop(null); // Clear the source image
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      let profileImageUrl = user.profileImage;
      let signatureImageUrl = user.signatureImage;

      // --- UPDATE THE UPLOAD CALLS ---
      // Pass the file type ('profile' or 'signature') to the helper
      if (profileImageFile) {
        profileImageUrl = await uploadFile(profileImageFile, 'profile');
      }
      if (signatureImageFile) {
        signatureImageUrl = await uploadFile(signatureImageFile, 'signature');
      }

      const finalData = {
        ...formData,
        profileImage: profileImageUrl,
        signatureImage: signatureImageUrl,
      };
      
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isCropperOpen && (
        <ImageCropper
          isOpen={isCropperOpen}
          onOpenChange={setIsCropperOpen}
          image={imageToCrop}
          onCropComplete={handleCropComplete}
        />
      )}
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Image Section */}
          <div className="flex items-center gap-4">
            {profilePreview && (
              <img src={profilePreview} alt="Profile Preview" width={80} height={80} className="rounded-full object-cover" />
            )}
            <div className="w-full">
              <Label htmlFor="profileImage">تصویر پروفایل</Label>
              <Input id="profileImage" name="profileImage" type="file" accept="image/*" onChange={handleFileChange} onClick={(e)=>{e.target.value = null}} />
            </div>
          </div>
          
          {/* Text Inputs */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">نام</Label>
              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleTextChange} />
            </div>
            <div>
              <Label htmlFor="lastName">نام خانوادگی</Label>
              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleTextChange} />
            </div>
            <div>
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleTextChange} />
            </div>
             <div>
                <Label htmlFor="position">سمت</Label>
                <Input id="position" name="position" value={formData.position} onChange={handleTextChange} />
              </div>
          </div>

          {/* Signature Image Section */}
          <div>
            <Label htmlFor="signatureImage">تصویر امضا</Label>
            <Input id="signatureImage" name="signatureImage" type="file" accept="image/*" onChange={handleFileChange} />
            {signaturePreview && (
              <div className="mt-4 p-2 border rounded-md bg-gray-50">
                <img src={signaturePreview} alt="Signature Preview" width={200} height={80} style={{ objectFit: 'contain' }} />
              </div>
            )}
          </div>
          
          <Button type="submit" disabled={isLoading}>{isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</Button>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </CardContent>
    </Card>
    </>
  );
}