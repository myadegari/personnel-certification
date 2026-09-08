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
import { Field, ImagePickerTile, useStagger } from '@/components/shared/form-dialog';
import {
  glassShell,
  GlassPanel,
  GlassHeader,
  GlassScroll,
  GlassSection,
  PRIMARY_BTN,
} from '@/components/shared/glass-dialog';
import { useFileUrl } from '@/hooks/useFileUrl';
import { internalAxios } from '@/lib/axios';
import { spring, usePrefersReducedMotion } from '@/lib/motion';
import { ASSIGNABLE_ROLES, ROLES, ROLE_LABELS_FA, canAssignRole, isSuperAdmin } from '@/lib/roles';
import { NationalIdInput } from '@/components/ui/national-id-input';
import { isValidNationalId, normalizeNationalIdValue } from '@/lib/national-id';
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
  const isDeputyHead = formData.role === ROLES.DEPUTY_HEAD;
  const effectiveDeputyId = isDeputyHead ? formData.headedDeputy : formData.deputy;
  const effectiveDeputyName = deputies.find((d) => String(d._id) === String(effectiveDeputyId))?.name || '';

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(1);
    if (isEditing) {
      const initialRole = userData.role || 'USER';
      const initialDeputyId = userData.deputy?._id || userData.deputy || '';
      const initialHeadedDeputyId = userData.headedDeputy?._id || userData.headedDeputy || '';

      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        personnelNumber: userData.personnelNumber || '',
        email: userData.email || '',
        role: initialRole,
        nationalId: userData.nationalId || '',
        gender: userData.gender || '',
        deputy: initialRole === ROLES.DEPUTY_HEAD
          ? initialHeadedDeputyId
          : initialDeputyId,
        headedDeputy: initialRole === ROLES.DEPUTY_HEAD ? initialHeadedDeputyId : '',
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
    setFormData((prev) => {
      const willBeDeputyHead = value === ROLES.DEPUTY_HEAD;
      return {
        ...prev,
        role: value,
        headedDeputy: willBeDeputyHead ? prev.headedDeputy : '',
        deputy: willBeDeputyHead ? (prev.headedDeputy || '') : prev.deputy,
      };
    });
  };

  const handleHeadedDeputyChange = (value) => {
    const id = value === 'none' ? '' : value;
    setFormData((prev) => ({
      ...prev,
      headedDeputy: id,
      deputy: prev.role === ROLES.DEPUTY_HEAD ? id : prev.deputy,
    }));
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
    const nationalId = normalizeNationalIdValue(formData.nationalId);
    const originalNationalId = isEditing
      ? normalizeNationalIdValue(userData.nationalId || '')
      : '';
    const canKeepExistingInvalid =
      isEditing && !!nationalId && nationalId === originalNationalId;

    if (
      !canKeepExistingInvalid &&
      (nationalId.length !== 10 || !isValidNationalId(nationalId))
    ) {
      setError('کد ملی معتبر نیست.');
      return;
    }

    setError('');
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }

    if (formData.role === ROLES.DEPUTY_HEAD && !formData.headedDeputy) {
      setError('انتخاب معاونت تحت سرپرستی الزامی است.');
      return;
    }

    setIsLoading(true);
    try {
      if (!isEditing && formData.password.length < 8) {
        throw new Error('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      }

      const payload = new FormData();
      const deputyPayload = formData.role === ROLES.DEPUTY_HEAD
        ? formData.headedDeputy
        : formData.deputy;
      const headedDeputyPayload = formData.role === ROLES.DEPUTY_HEAD
        ? formData.headedDeputy
        : '';

      payload.append('firstName', formData.firstName);
      payload.append('lastName', formData.lastName);
      payload.append('personnelNumber', formData.personnelNumber);
      payload.append('nationalId', nationalId);
      payload.append('email', formData.email);
      payload.append('role', formData.role);
      payload.append('gender', formData.gender);
      payload.append('deputy', deputyPayload || '');
      payload.append('headedDeputy', headedDeputyPayload || '');

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
        <DialogContent className={glassShell('xl')}>
          <GlassPanel>
            <GlassHeader
              icon={UserSquare}
              title={isEditing ? 'ویرایش کاربر' : 'ایجاد کاربر جدید'}
              description={isEditing ? 'اطلاعات کاربر را در دو مرحله ویرایش کنید.' : 'در دو مرحله کاربر جدید بسازید.'}
            >
              <Stepper
                steps={STEPS}
                current={currentStep - 1}
                onStepClick={(i) => i < currentStep - 1 && setCurrentStep(i + 1)}
                className="mt-6"
              />
            </GlassHeader>

            <form onSubmit={handleSubmit} className="mt-6 flex min-h-0 flex-1 flex-col">
              <AnimatePresence initial={false}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
                      <AlertTriangle className="size-4 shrink-0" /> {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <GlassScroll>
                <div className="space-y-4">
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
                      <GlassSection icon={User} title="اطلاعات فردی">
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
                            <Field label="کد ملی" required>
                              <NationalIdInput
                                name="nationalId"
                                className="h-9"
                                value={formData.nationalId}
                                onValueChange={(value) => setFormData((p) => ({ ...p, nationalId: value }))}
                                required
                              />
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
                              className="flex gap-6 "
                              required
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="Male" id="Male" className="mb-2" />
                                <Label htmlFor="Male" className="font-normal">آقا</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="Female" id="Female" className="mb-2"/>
                                <Label htmlFor="Female" className="font-normal">خانم</Label>
                              </div>
                            </RadioGroup>
                          </Field>
                        </div>
                      </GlassSection>

                      <GlassSection icon={Building2} title="تماس و سازمانی">
                        <div className="space-y-3">
                          <Field label="ایمیل">
                            <Input dir="ltr" name="email" type="email" value={formData.email} onChange={handleChange} required />
                          </Field>
                            <Field
                              label="معاونت"
                              hint={isDeputyHead ? 'برای معاون رئیس، این مقدار با معاونت تحت سرپرستی یکسان است.' : undefined}
                            >
                              <Select
                                value={effectiveDeputyId || 'none'}
                                disabled={isDeputyHead}
                                onValueChange={(v) => setFormData((prev) => ({ ...prev, deputy: v === 'none' ? '' : v }))}
                              >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب معاونت" />
                              </SelectTrigger>
                              <SelectContent >
                                <SelectItem value="none">بدون معاونت</SelectItem>
                                {deputies.map((d) => (
                                  <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </GlassSection>
                    </motion.div>
                  ) : (
                    <motion.div {...staggerProps} className="space-y-4">
                      <GlassSection icon={ShieldCheck} title="دسترسی و احراز هویت">
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
                          {isDeputyHead && (
                            <Field label="معاونت تحت سرپرستی">
                              <Select
                                value={formData.headedDeputy || 'none'}
                                onValueChange={handleHeadedDeputyChange}
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
                          <Field
                            label="معاونت کاربر"
                            hint={isDeputyHead
                              ? 'این مقدار با معاونت تحت سرپرستی یکسان است. برای تغییر، به مرحله قبل بازگردید.'
                              : 'برای تغییر، به مرحله قبل بازگردید.'}
                          >
                            <Input readOnly value={effectiveDeputyName || 'بدون معاونت'} tabIndex={-1} />
                          </Field>
                        </div>
                      </GlassSection>

                      <GlassSection icon={Pen} title="امضای کاربر">
                        <ImagePickerTile
                          preview={signaturePreview}
                          inputRef={signatureInputRef}
                          onFileChange={handleSignatureChange}
                          onOpenPicker={() => setPickerOpen(true)}
                          onClear={clearSignature}
                          label="امضای کاربر"
                          placeholder="تصویر امضا را انتخاب یا بارگذاری کنید"
                        />
                      </GlassSection>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
                </div>
              </GlassScroll>

              <DialogFooter className="mt-6 sm:justify-between">
                {currentStep === 1 ? (
                  <>
                    <Button type="button" variant="ghost" className="cursor-pointer" onClick={onClose}>انصراف</Button>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      ادامه <ArrowLeft className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setCurrentStep(1)} disabled={isLoading}>
                      <ArrowRight className="size-4" /> بازگشت
                    </Button>
                    <Button type="submit" disabled={isLoading} className={PRIMARY_BTN}>
                      {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {isEditing ? 'ذخیره تغییرات' : 'ایجاد کاربر'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          </GlassPanel>
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
