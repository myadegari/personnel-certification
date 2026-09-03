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
import { useQuery } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { ASSIGNABLE_ROLES, ROLES, ROLE_LABELS_FA, canAssignRole, isSuperAdmin } from "@/lib/roles";
import MediaPickerDialog from "./MediaPickerDialog";

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
  isProfessor: false,
  deputy: '',
  headedDeputy: '',
};

export default function UserFormModal({ isOpen, onClose, userData, onSave }) {
  const { data: session } = useSession();
  const { data: deputies = [] } = useQuery({
    queryKey: ["adminDeputies"],
    queryFn: async () => (await internalAxios.get("/admin/deputies")).data,
    enabled: isOpen,
  });
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureFileId, setSignatureFileId] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
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
        deputy: userData.deputy?._id || userData.deputy || '',
        headedDeputy: userData.headedDeputy?._id || userData.headedDeputy || '',
        password: '',
      });
    } else {
      setFormData(emptyForm);
    }
    setSignatureFile(null);
    setSignatureFileId(null);
    setSignaturePreview('');
    setError('');
  }, [userData, isOpen, isEditing]);

  useEffect(() => {
    if (!signatureFile && !signatureFileId && userData?.signatureImage && signatureFileQuery.data) {
      setSignaturePreview(signatureFileQuery.data);
    }
  }, [signatureFile, signatureFileId, userData?.signatureImage, signatureFileQuery.data]);

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
    setSignatureFileId(null);
    setSignaturePreview(URL.createObjectURL(file));
  };

  const handlePickSignature = (item) => {
    if (!item) return;
    setSignatureFileId(item.id);
    setSignatureFile(null);
    setSignaturePreview(item.url || '');
    setPickerOpen(false);
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
      payload.append('deputy', formData.deputy || '');
      payload.append('headedDeputy', formData.headedDeputy || '');

      if (!isEditing) {
        payload.append('password', formData.password);
      }

      if (signatureFile) {
        payload.append('signatureFile', signatureFile);
      } else if (signatureFileId) {
        payload.append('signatureFileId', signatureFileId);
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
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'اطلاعات کاربر را در اینجا ویرایش کنید.' : 'اطلاعات کاربر جدید را وارد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 py-2">
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold text-emerald-800">اطلاعات فردی</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">نام</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nationalId">کد ملی</Label>
                  <Input dir="ltr" id="nationalId" name="nationalId" value={formData.nationalId} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="personnelNumber">شماره پرسنلی</Label>
                  <Input dir="ltr" id="personnelNumber" name="personnelNumber" value={formData.personnelNumber} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>جنسیت</Label>
                <RadioGroup
                  name="gender"
                  value={formData.gender}
                  onValueChange={(v) => setFormData((p) => ({ ...p, gender: v }))}
                  className="flex gap-6"
                  required
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Male" id="Male" />
                    <Label htmlFor="Male" className="font-normal">آقا</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="Female" id="Female" />
                    <Label htmlFor="Female" className="font-normal">خانم</Label>
                  </div>
                </RadioGroup>
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold text-emerald-800">اطلاعات تماس و سازمانی</legend>
              <div className="space-y-1.5">
                <Label htmlFor="email">ایمیل</Label>
                <Input dir="ltr" id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="position">سمت</Label>
                  <Input id="position" name="position" value={formData.position} onChange={handleChange} />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="isProfessor"
                    checked={formData.isProfessor}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isProfessor: checked }))}
                  />
                  <Label htmlFor="isProfessor" className="font-normal">عضو هیات علمی</Label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deputy">معاونت</Label>
                <Select
                  value={formData.deputy || "none"}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, deputy: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="deputy">
                    <SelectValue placeholder="انتخاب معاونت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون معاونت</SelectItem>
                    {deputies.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold text-emerald-800">دسترسی و احراز هویت</legend>
              <div className="space-y-1.5">
                <Label htmlFor="role">نقش</Label>
                <Select onValueChange={handleRoleChange} value={formData.role} disabled={!canChangeRole}>
                  <SelectTrigger id="role">
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
                {!canChangeRole && (
                  <p className="text-xs text-muted-foreground">امکان تغییر نقش این کاربر را ندارید.</p>
                )}
              </div>
              {!isEditing && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} />
                  <p className="text-xs text-muted-foreground">حداقل ۸ کاراکتر.</p>
                </div>
              )}
              {formData.role === "DEPUTY_HEAD" && (
                <div className="space-y-1.5">
                  <Label htmlFor="headedDeputy">معاونت تحت سرپرستی</Label>
                  <Select
                    value={formData.headedDeputy || "none"}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, headedDeputy: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger id="headedDeputy">
                      <SelectValue placeholder="انتخاب معاونت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون معاونت</SelectItem>
                      {deputies.map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.number} — {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-semibold text-emerald-800">امضای کاربر</legend>
              {signaturePreview ? (
                <div className="flex justify-center rounded-md border bg-gray-50 p-2">
                  <img src={signaturePreview} alt="Signature preview" width={150} className="object-contain" />
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setPickerOpen(true)}
                >
                  انتخاب از کتابخانه
                </Button>
                <Input
                  ref={signatureInputRef}
                  id="signatureFile"
                  name="signatureFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSignatureChange}
                  onClick={(e) => (e.target.value = null)}
                  className="flex-1"
                />
              </div>
            </fieldset>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={isLoading} className="cursor-pointer">
              {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <MediaPickerDialog
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      onSelect={handlePickSignature}
    />
    </>
  );
}
