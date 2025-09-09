"use client";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // <-- Import hooks
// import axios from "@/lib/axios"; // <-- Import custom axios instance
// import { Card, CardContent, Label, Input, Button } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageCropper from "./ImageCropper";
import { useUploadFile, useUpdateProfile } from "@/hooks/useProfileMutations";
import { useFileUrl } from "@/hooks/useFileUrl"; // ✅ Import new hook

export default function ProfileForm({ user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    position: user.position || "", // مقدار اولیه برای فیلد سمت
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [signatureImageFile, setSignatureImageFile] = useState(null);

  const [profilePreview, setProfilePreview] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");

  const [message, setMessage] = useState("");

  // --- NEW STATE FOR CROPPER ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const profileInputRef = useRef(null);
  const signatureInputRef = useRef(null);

  const uploadFileMutation = useUploadFile();
  const updateProfileMutation = useUpdateProfile();
  // ✅ Fetch existing image URLs with TanStack Query
  const profileFileQuery = useFileUrl(user?.profileImage);
  const signatureFileQuery = useFileUrl(user?.signatureImage);
  // ✅ Sync query data → preview state (only on first load or when IDs change)
  // We use this to avoid flicker when switching between new upload and existing
  const isFirstLoadProfile = useRef(true);
  const isFirstLoadSignature = useRef(true);

  if (isFirstLoadProfile.current && !profileImageFile && user?.profileImage) {
    if (!profileFileQuery.isLoading && profileFileQuery.data) {
      setProfilePreview(profileFileQuery.data);
      isFirstLoadProfile.current = false;
    }
  }

  if (
    isFirstLoadSignature.current &&
    !signatureImageFile &&
    user?.signatureImage
  ) {
    if (!signatureFileQuery.isLoading && signatureFileQuery.data) {
      setSignaturePreview(signatureFileQuery.data);
      isFirstLoadSignature.current = false;
    }
  }

  const handleTextChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      if (name === "profileImage") {
        setImageToCrop(URL.createObjectURL(file));
        setIsCropperOpen(true);
      } else if (name === "signatureImage") {
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
    setMessage("");

    try {
      let profileImageUrl = user.profileImage?._id || null;
      let signatureImageUrl = user.signatureImage?._id || null;

      // --- UPDATE THE UPLOAD CALLS ---
      // Pass the file type ('profile' or 'signature') to the helper
      if (profileImageFile) {
        profileImageUrl = await uploadFileMutation.mutateAsync({
          file: profileImageFile,
          fileType: "profile",
        });
        // ✅ INVALIDATE THE FILE URL QUERY FOR THE UPDATED PROFILE IMAGE
        // queryClient.invalidateQueries({
        //   queryKey: ['fileUrl', user.profileImage._id]
        // });
       
      }

      if (signatureImageFile) {
        signatureImageUrl = await uploadFileMutation.mutateAsync({
          file: signatureImageFile,
          fileType: "signature",
        });
      }

      const finalData = {
        ...formData,
        profileImage: profileImageUrl,
        signatureImage: signatureImageUrl,
      };

      await updateProfileMutation.mutateAsync(finalData);
      await queryClient.refetchQueries({ queryKey: ["user"] });
      setMessage("پروفایل با موفقیت به‌روز شد!");
      // setTimeout(() => {
      //    window.location.reload()
      // }, 5*1000);
    } catch (error) {
      setMessage(`خطا در آپلود فایل: ${error.message}`);
    }
  };
  // ✅ Show loading skeleton while fetching existing image
  const ProfileImageSkeleton = () => (
    <div className="h-[80px] w-[120px] rounded-full bg-gray-200 animate-pulse"></div>
  );

  const SignatureImageSkeleton = () => (
    <div className="h-20 w-40 bg-gray-200 animate-pulse rounded"></div>
  );

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
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleTextChange}
                />
              </div>
              <div>
                <Label htmlFor="lastName">نام خانوادگی</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleTextChange}
                />
              </div>
              <div>
                <Label htmlFor="email">ایمیل</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleTextChange}
                />
              </div>
              <div>
                <Label htmlFor="position">سمت</Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleTextChange}
                />
              </div>
            </div>
            {/* Profile Image Section */}
            <div className="flex items-center gap-4">
              {/* Show skeleton, error, or image */}
              {profileFileQuery.isLoading && !profileImageFile ? (
                <ProfileImageSkeleton />
              ) : profileFileQuery.isError ? (
                <div className="text-xs text-red-500">
                  خطا در بارگذاری تصویر
                </div>
              ) : profilePreview ? (
                <img
                  src={profilePreview}
                  alt="Profile Preview"
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-gray-200"
                  onError={() => setProfilePreview("")}
                />
              ) : null}

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
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => profileInputRef.current?.click()}
                >
                  {profilePreview || profileFileQuery.data
                    ? "تغییر تصویر"
                    : "بارگذاری تصویر"}
                </Button>
              </div>
            </div>

            {/* Signature Image Section */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>تصویر امضا</Label>
                <Input
                  ref={signatureInputRef}
                  id="signatureImage"
                  name="signatureImage"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signatureInputRef.current?.click()}
                >
                  {signaturePreview || signatureFileQuery.data
                    ? "تغییر تصویر"
                    : "بارگذاری تصویر"}
                </Button>
              </div>

              {signatureFileQuery.isLoading && !signatureImageFile ? (
                <div className="flex justify-center p-2">
                  <SignatureImageSkeleton />
                </div>
              ) : signatureFileQuery.isError ? (
                <div className="text-xs text-red-500 text-center">
                  خطا در بارگذاری امضا
                </div>
              ) : signaturePreview ? (
                <div className="p-2 border rounded-md bg-gray-50 flex justify-center">
                  <img
                    src={signaturePreview}
                    alt="Signature Preview"
                    width={200}
                    height={80}
                    style={{ objectFit: "contain" }}
                    onError={() => setSignaturePreview("")}
                  />
                </div>
              ) : null}
            </div>
            <Button type="submit" disabled={uploadFileMutation.isPending}>
              {" "}
              {uploadFileMutation.isPending
                ? "در حال ذخیره..."
                : "ذخیره تغییرات"}
            </Button>
            {message && <p className="text-sm mt-2">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
