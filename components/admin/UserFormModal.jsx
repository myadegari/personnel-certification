'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUrl } from "@/hooks/useFileUrl";
import { useSession } from "next-auth/react";
import { ASSIGNABLE_ROLES, ROLES, ROLE_LABELS_FA, canAssignRole, isSuperAdmin } from "@/lib/roles";

const getBaseUrl = () => {
  // If we are on the server, use the internal Docker URL
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }
  // If on client, use relative path or public URL
  return ''; 
};

const emptyForm = {
  firstName: '',
  lastName: '',
  personnelNumber: '',
  password: '',
  role: 'USER',
  nationalId: "",
  email: "",
  gender: "",
  position: "",
  isProfessor: false
};

export default function UserFormModal({ isOpen, onClose, userData, onSave }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const signatureInputRef = useRef(null);

  const isEditing = !!userData;
  const currentRole = session?.user?.role || ROLES.USER;
  const isSelf = isEditing && userData?._id === session?.user?.id;
  const roleOptions = ASSIGNABLE_ROLES.filter((role) => canAssignRole(currentRole, role));
  const canChangeRole = !isSelf && (isSuperAdmin(currentRole) || !isEditing);
  const signatureFileQuery = useFileUrl(userData?.signatureImage);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        personnelNumber: userData.personnelNumber || '',
        email: userData.email || '',
        role: userData.role || 'USER',
        nationalId: userData.nationalId || "",
        gender: userData.gender || "",
        position: userData.position || "",
        isProfessor: userData.isProfessor || false,
        password: '',
      });
    } else {
      setFormData(emptyForm);
    }
    setSignatureFile(null);
    setSignaturePreview('');
    setError('');
  }, [userData, isOpen, isEditing]);

  useEffect(() => {
    if (!signatureFile && userData?.signatureImage && signatureFileQuery.data) {
      setSignaturePreview(signatureFileQuery.data);
    }
  }, [signatureFile, userData?.signatureImage, signatureFileQuery.data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!isEditing && formData.password.length < 8) {
        throw new Error('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      }

      const payload = new FormData();
      payload.append('firstName', formData.firstName);
      payload.append('lastName', formData.lastName);
      payload.append('personnelNumber', formData.personnelNumber);
      payload.append('nationalId', formData.nationalId);
      payload.append('email', formData.email);
      payload.append('role', formData.role);
      payload.append('gender', formData.gender);
      payload.append('position', formData.position || '');
      payload.append('isProfessor', String(Boolean(formData.isProfessor)));

      if (!isEditing) {
        payload.append('password', formData.password);
      }

      if (signatureFile) {
        payload.append('signatureFile', signatureFile);
      }

      const url = isEditing
        ? `${getBaseUrl()}/api/admin/users/${userData._id}`
        : `${getBaseUrl()}/api/admin/users`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'عملیات با خطا مواجه شد.');
      }

      onSave();
      onClose();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'اطلاعات کاربر را در اینجا ویرایش کنید.' : 'اطلاعات کاربر جدید را وارد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">نام</Label>
              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">نام خانوادگی</Label>
              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="personnelNumber" className="text-right">شماره پرسنلی</Label>
              <Input id="personnelNumber" name="personnelNumber" value={formData.personnelNumber} onChange={handleChange} className="col-span-3" required />
            </div>
            <div>
                <Label htmlFor="nationalId">کد ملی</Label>
                <Input
                  dir="ltr"
                  id="nationalId"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleChange}
                  required
                />
              </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">ایمیل</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">سمت</Label>
              <Input id="position" name="position" value={formData.position} onChange={handleChange} className="col-span-3" />
            </div>
            {!isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">رمز عبور</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="col-span-3" required minLength={8} />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">نقش</Label>
              <Select onValueChange={handleRoleChange} value={formData.role} disabled={!canChangeRole}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="انتخاب نقش" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS_FA[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-around">
                <Label className="mb-0">جنسیت</Label>
                <RadioGroup
                  name="gender"
                  value={formData.gender}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, gender: v }))
                  }
                  className="flex gap-4 mt-2"
                  required
                >
                  <div className="flex space-x-2">
                    <RadioGroupItem value="Male" id="Male" />
                    <Label htmlFor="Male">آقا</Label>
                  </div>
                  <div className="flex  space-x-2">
                    <RadioGroupItem value="Female" id="Female" />
                    <Label htmlFor="Female">خانم</Label>
                  </div>
                </RadioGroup>
              </div>
            <div className="grid grid-cols-3 place-content-center border-r pr-4">
              <Label className="mb-0 col-span-2">عضو هیات علمی</Label>
              <div className="flex mt-2">

                <Checkbox
                  id="isProfessor"
                  checked={formData.isProfessor}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isProfessor: checked }))
                  }
                />
                <Label htmlFor="isProfessor">بله</Label>
              </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>امضای کاربر</Label>
              {signaturePreview ? (
                <div className="flex justify-center rounded-md border bg-gray-50 p-2">
                  <img
                    src={signaturePreview}
                    alt="Signature preview"
                    width={150}
                    className="object-contain"
                  />
                </div>
              ) : null}
              <Input
                ref={signatureInputRef}
                id="signatureFile"
                name="signatureFile"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSignatureChange}
                onClick={(e) => (e.target.value = null)}
              />
            </div>
            {error && <p className="text-red-500 text-sm col-span-4">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
