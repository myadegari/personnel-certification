"use client";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // <-- Import hooks
// import axios from "@/lib/axios"; // <-- Import custom axios instance
// import { Card, CardContent, Label, Input, Button } from "@/components/ui";
import { Card, CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ImageCropper from "./ImageCropper";
import { useUploadFile, useUpdateProfile } from "@/hooks/useProfileMutations";
import { useFileUrl } from "@/hooks/useFileUrl"; // ✅ Import new hook
import { toast } from 'react-toastify';

export default function UserSignature({ user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [signatureImageFile, setSignatureImageFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState("");
 const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [message, setMessage] = useState("");

  const signatureInputRef = useRef(null);

  const uploadFileMutation = useUploadFile();
  const updateProfileMutation = useUpdateProfile();
  const signatureFileQuery = useFileUrl(user?.signatureImage);
  const isFirstLoadSignature = useRef(true);
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
      if (name === "signatureImage") {
        setImageToCrop(URL.createObjectURL(file));
        setIsCropperOpen(true);
      }
    }
  };

  const handleCropComplete = (croppedFile) => {
    setSignatureImageFile(croppedFile);
    setSignaturePreview(URL.createObjectURL(croppedFile));
    setIsCropperOpen(false); // Close the modal
    setImageToCrop(null); // Clear the source image
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      let signatureImageUrl = user.signatureImage?._id || null;

      
      if (signatureImageFile) {
        signatureImageUrl = await uploadFileMutation.mutateAsync({
          file: signatureImageFile,
          fileType: "signature",
        });
      }

      const finalData = {
        ...formData,
        signatureImage: signatureImageUrl,
      };

      await updateProfileMutation.mutateAsync(finalData);
      await queryClient.refetchQueries({ queryKey: ["user"] });
      toast.success("امضای دیجیتال در سامانه قرار گرفت",{autoClose:5000});
      // setMessage("پروفایل با موفقیت به‌روز شد!");
      // setTimeout(() => {
      //    window.location.reload()
      // }, 5*1000);
    } catch (error) {
      toast.error(`خطا در آپلود فایل: ${error.message}`,{autoClose:5000});
      // setMessage(`خطا در آپلود فایل: ${error.message}`);
    }
  };


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
              aspect={2}
            />
          )}
      <Card className="gap-0">
        <CardHeader>
          
          <CardTitle>امضای دیجیتال</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
  

  {signatureFileQuery.isLoading && !signatureImageFile ? (
    <div className="flex justify-center p-2">
      <SignatureImageSkeleton />
    </div>
  ) : signatureFileQuery.isError ? (
    <div className="text-xs text-red-500 text-center">
      خطا در بارگذاری امضا
    </div>
  ) : signaturePreview ? (
    <div className="p-2 border rounded-xl bg-gray-50 flex justify-center">
      <img
        src={signaturePreview}
        alt="Signature Preview"
        width={150}
        style={{ objectFit: "contain" }}
        onError={() => setSignaturePreview("")}
      />
    </div>
  ) : null}
  <div className="flex justify-between">
    {/* <Label>تصویر امضا</Label> */}
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
    className="w-full"
      type="button"
      variant="outline"
      onClick={() => signatureInputRef.current?.click()}
    >
      {signaturePreview || signatureFileQuery.data
        ? "تغییر تصویر"
        : "بارگذاری تصویر"}
    </Button>
  </div>
</div>
            <Button type="submit" className="cursor-pointer" disabled={uploadFileMutation.isPending}>
              {" "}
              {uploadFileMutation.isPending
                ? "در حال ذخیره..."
                : "ثبت تغییرات"}
            </Button>
            {message && <p className="text-sm mt-2">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </>
  );
}
