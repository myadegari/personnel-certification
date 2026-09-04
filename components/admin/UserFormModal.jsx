'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserSquare,
  User,
  Building2,
  ShieldCheck,
  Pen,
  Save,
  Loader as Loader2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
} from 'reicon-react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Stepper } from '@/components/ui/stepper';
import {
  Field,
  FormSection,
  DialogIconHeader,
  ImagePickerTile,
  useStagger,
} from '@/components/shared/form-dialog';
import { useFileUrl } from '@/hooks/useFileUrl';
import { internalAxios } from '@/lib/axios';
import { spring, usePrefersReducedMotion } from '@/lib/motion';
import { ASSIGNABLE_ROLES, ROLES, ROLE_LABELS_FA, canAssignRole, isSuperAdmin } from '@/lib/roles';
import MediaPickerDialog from './MediaPickerDialog';

const emptyForm = {
  firstName: '',
  lastName: '',
  personnelNumber: '',
  password: '',
  role: 'USER',
  nationalId: '',
  email: '',
  gender: '',
  position: '',
  isProfessor: false,
  deputy: '',
  headedDeputy: '',
};

const STEPS = ['اطلاعات کاربر', 'دسترسی و امضا'];

export default function UserFormModal({ isOpen, onClose, userData, onSave }) {
  const { data: session } = useSession();
  const { data: deputies = [] } = useQuery({
    queryKey: ['adminDeputies'],
    queryFn: async () => (await internalAxios.get('/admin/deputies')).data,
    enabled: isOpen,
  });
  const reduced = usePrefersReducedMotion();
  const staggerProps = useStagger();

  const [currentStep, setCurrentStep] = useState(1);
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
    if (!isOpen) return;
    setCurrentStep(1);
    if (isEditing) {
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        personnelNumber: userData.personnelNumber || '',
        email: userData.email || '',
        role: userData.role || 'USER',
        nationalId: userData.nationalId || '',
        gender: userData.gender || '',
        position: userData.position || '',
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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role: value }));
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

  const clearSignature = () => {
    setSignatureFile(null);
    setSignatureFileId(null);
    setSignaturePreview('');
    if (signatureInputRef.current) signatureInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep === 1) {
      setError('');
      setCurrentStep(2);
      return;
    }

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

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing) {
        await internalAxios.put(`/admin/users/${userData._id}`, payload, config);
      } else {
        await internalAxios.post('/admin/users', payload, config);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'عملیات با خطا مواجه شد.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogIconHeader
            icon={UserSquare}
            title={isEditing ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}
            description={isEditing ? 'اطلاعات کاربر را در دو مرحله ویرایش کنید.' : 'در دو مرحله کاربر جدید بسازید.'}
          >
            <Stepper
              steps={STEPS}
              current={currentStep - 1}
              onStepClick={(i) => i < currentStep - 1 && setCurrentStep(i + 1)}
              className="mt-4"
            />
          </DialogIconHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div role="alert" className="mb-3 flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0" /> {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-1" style={{ maxHeight: '60vh' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentStep}
                  initial={reduced ? false : { opacity: 0, x: -24 }}
                  animate={reduced ? false : { opacity: 1, x: 0 }}
                  exit={reduced ? false : { opacity: 0, x: 24 }}
                  transition={spring}
                >
                  {currentStep === 1 ? (
                    <motion.div {...staggerProps} className="space-y-4">
                      <FormSection icon={User} title="اطلاعات فردی">
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="نام">
                              <Input name="firstName" value={formData.firstName} onChange={handleChange} required />
                            </Field>
                            <Field label="نام خانوادگی">
                              <Input name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </Field>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="کد ملی">
                              <Input dir="ltr" name="nationalId" value={formData.nationalId} onChange={handleChange} required />
                            </Field>
                            <Field label="شماره پرسنلی">
                              <Input dir="ltr" name="personnelNumber" value={formData.personnelNumber} onChange={handleChange} required />
                            </Field>
                          </div>
                          <Field label="جنسیت">
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
                          </Field>
                        </div>
                      </FormSection>

                      <FormSection icon={Building2} title="تماس و سازمانی">
                        <div className="space-y-3">
                          <Field label="ایمیل">
                            <Input dir="ltr" name="email" type="email" value={formData.email} onChange={handleChange} required />
                          </Field>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="سمت">
                              <Input name="position" value={formData.position} onChange={handleChange} />
                            </Field>
                            <div className="flex items-end gap-2 pb-2">
                              <Checkbox
                                id="isProfessor"
                                checked={formData.isProfessor}
                                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isProfessor: checked }))}
                              />
                              <Label htmlFor="isProfessor" className="font-normal">عضو هیات علمی</Label>
                            </div>
                          </div>
                          <Field label="معاونت">
                            <Select
                              value={formData.deputy || 'none'}
                              onValueChange={(v) => setFormData((prev) => ({ ...prev, deputy: v === 'none' ? '' : v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب معاونت" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">بدون معاونت</SelectItem>
                                {deputies.map((d) => (
                                  <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </FormSection>
                    </motion.div>
                  ) : (
                    <motion.div {...staggerProps} className="space-y-4">
                      <FormSection icon={ShieldCheck} title="دسترسی و احراز هویت">
                        <div className="space-y-3">
                          <Field
                            label="نقش"
                            hint={!canChangeRole ? 'امکان تغییر نقش این کاربر را ندارید.' : undefined}
                          >
                            <Select onValueChange={handleRoleChange} value={formData.role} disabled={!canChangeRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب نقش" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role} value={role}>{ROLE_LABELS_FA[role]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          {!isEditing && (
                            <Field label="رمز عبور" hint="حداقل ۸ کاراکتر.">
                              <Input name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} />
                            </Field>
                          )}
                          {formData.role === 'DEPUTY_HEAD' && (
                            <Field label="معاونت تحت سرپرستی">
                              <Select
                                value={formData.headedDeputy || 'none'}
                                onValueChange={(v) => setFormData((prev) => ({ ...prev, headedDeputy: v === 'none' ? '' : v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="انتخاب معاونت" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">بدون معاونت</SelectItem>
                                  {deputies.map((d) => (
                                    <SelectItem key={d._id} value={d._id}>{d.number} — {d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                          )}
                        </div>
                      </FormSection>

                      <FormSection icon={Pen} title="امضای کاربر">
                        <ImagePickerTile
                          preview={signaturePreview}
                          inputRef={signatureInputRef}
                          onFileChange={handleSignatureChange}
                          onOpenPicker={() => setPickerOpen(true)}
                          onClear={clearSignature}
                          label="امضای کاربر"
                          placeholder="تصویر امضا را انتخاب یا بارگذاری کنید"
                        />
                      </FormSection>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <DialogFooter className="mt-4 sm:justify-between">
              {currentStep === 1 ? (
                <>
                  <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>انصراف</Button>
                  <Button type="submit" className="cursor-pointer" disabled={isLoading}>
                    ادامه
                    <ArrowLeft className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setCurrentStep(1)} disabled={isLoading}>
                    <ArrowRight className="size-4" /> بازگشت
                  </Button>
                  <Button type="submit" className="cursor-pointer" disabled={isLoading}>
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {isEditing ? 'ذخیره تغییرات' : 'ایجاد کاربر'}
                  </Button>
                </>
              )}
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
