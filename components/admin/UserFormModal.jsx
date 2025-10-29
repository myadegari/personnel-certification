'use client';

import { useState, useEffect } from 'react';
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

export default function UserFormModal({ isOpen, onClose, userData, onSave }) {
  const [formData, setFormData] = useState({
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!userData;

  // Populate form when userData for editing is passed
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
        position:userData.position || "",
        isProfessor: userData.isProfessor || false
      });
    } else {
      // Reset form for creating a new user
      setFormData({
        firstName: '',
        lastName: '',
        personnelNumber: '',
        nationalId:'',
        password: '',
        role: 'USER',
        email: "",
        gender: "",
        position: "",
        isProfessor: false
      });
    }
  }, [userData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let response;
      if (isEditing) {
        // Update user
        response = await fetch(`/api/admin/users/${userData._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        // Create user
        response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'عملیات با خطا مواجه شد.');
      }

      onSave(); // Trigger data refetch in parent
      onClose(); // Close the modal

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
            {!isEditing && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">رمز عبور</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="col-span-3" required />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">نقش</Label>
              <Select onValueChange={handleRoleChange} value={formData.role}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="انتخاب نقش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">کاربر</SelectItem>
                  <SelectItem value="ADMIN">مدیر</SelectItem>
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
