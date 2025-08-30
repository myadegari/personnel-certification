'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // <-- Import hooks
import axios from '@/lib/axios'; // <-- Import custom axios instance
// import { Card, CardContent, Label, Input, Button } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageCropper from './ImageCropper';

// API function for uploading a file
const uploadFile = async ({ file, fileType }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);

  const { data } = await axios.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
};

const updateProfile = async (profileData) => {
  const { data } = await axios.put('/dashboard/profile', profileData);
  return data;
};

export default function ProfileForm({ user }) {
  const queryClient = useQueryClient();
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
  // const [isLoading, setIsLoading] = useState(false);

    // --- NEW STATE FOR CROPPER ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const profileInputRef = useRef(null);
  const signatureInputRef = useRef(null);


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
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      setMessage('پروفایل با موفقیت به‌روز شد!');
      // When the mutation is successful, invalidate the session query
      // to force a refetch of the user's data (e.g., for the header).
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (error) => {
      setMessage(`خطا: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setIsLoading(true);
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
      
      // const res = await fetch('/api/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(finalData),
      // });

      // if (!res.ok) throw new Error('Failed to update profile');

      // setMessage('Profile updated successfully!');
      mutation.mutate(finalData);
    } catch (error) {
      setMessage(`خطا در آپلود فایل: ${error.message}`);
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
          
          
          
          {/* Text Inputs */}
          <div className="space-y-4 grid grid-cols-2 gap-x-2 border-b-1 [&>div>Label]:mb-2 ">
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
          {/* Profile Image Section */}
          <div className="flex items-center gap-4">
            {profilePreview && (
              <img src={profilePreview} alt="Profile Preview" width={80} height={80} className="rounded-full object-cover" />
            )}
             <div className="w-full space-y-2 flex justify-between">
                <Label>تصویر پروفایل</Label>
                <Input
                  ref={profileInputRef}
                  id="profileImage"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  onClick={(e) => (e.target.value = null)}
                  className="hidden" // --- ورودی فایل را مخفی کنید ---
                />
                <Button type="button" variant="outline" onClick={() => profileInputRef.current?.click()}>
                  {profilePreview ? 'تغییر تصویر' : 'بارگذاری تصویر'}
                </Button>
              </div>
          </div>

          {/* Signature Image Section */}
          <div className="space-y-2">
             
              <div className='flex justify-between'>

              <Label>تصویر امضا</Label>
              <Input
                ref={signatureInputRef}
                id="signatureImage"
                name="signatureImage"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden" // --- ورودی فایل را مخفی کنید ---
              />
              <Button type="button" variant="outline" onClick={() => signatureInputRef.current?.click()}>
                {signaturePreview ? 'تغییر تصویر ' : 'بارگذاری تصویر '}
              </Button>
              </div>
              {signaturePreview && (
                <div className="p-2 border rounded-md bg-gray-50 flex justify-center">
                  <img src={signaturePreview} alt="Signature Preview" width={200} height={80} style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>
          
          <Button type="submit" disabled={mutation.isPending}>  {mutation.isPending ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</Button>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </CardContent>
    </Card>
    </>
  );
}