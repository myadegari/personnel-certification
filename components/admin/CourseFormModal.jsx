'use client';

import { useState, useEffect,useRef } from 'react';
import axios from '@/lib/axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Image from 'next/image';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CertificatePatternCombobox from './CertificatePatternCombobox'; // <-- کامپوننت جدید را import کنید
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from "uuid";
import { useFileUrl } from '@/hooks/useFileUrl'; // ✅ Import new hook
import { useUploadFile,useCourseMutation } from '@/hooks/useCourseMutation'; // ✅ Import upload hook
// --- کامپوننت جستجوی کاربر ---



const fetchCertificateSequences = async () => {
  const { data } = await axios.get('/admin/certificate-sequences');
  return data;
};

function UserSearchCombobox({ selectedUser, onSelectUser }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }
      const res = await fetch(`/api/admin/users/search?q=${searchQuery}`);
      const data = await res.json();
      setUsers(data);
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "انتخاب کاربر..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[375px] p-0">
        <Command>
          <CommandInput placeholder="جستجوی نام کاربر..." onValueChange={setSearchQuery} />
          <CommandList>
            <CommandEmpty>کاربری یافت نشد.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user._id}
                  value={`${user.firstName} ${user.lastName}`}
                  onSelect={() => {
                    onSelectUser(user);
                    setOpen(false);
                  }}
                >
                  {user.firstName} {user.lastName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


// --- کامپوننت اصلی مودال ---
export default function CourseFormModal({ isOpen, onClose, courseData }) {
  const queryClient = useQueryClient();
  const uploadFileMutation = useUploadFile();
  const courseMutation = useCourseMutation(onClose,courseData)
  const [formData, setFormData] = useState({
    name: '', date: null, duration: '', organizingUnit: '',
    signatory: null, position1: '',
    signatory2: null, position2: '',
    certificateNumberPattern: '', courseCode: uuidv4(),
  });
  const refStampFile1 = useRef(null);
  const [selectedManager1, setSelectedManager1] = useState(null);
  const [selectedManager2, setSelectedManager2] = useState(null);
  const [stampFile1, setStampFile1] = useState(null);
  const [stampFile2, setStampFile2] = useState(null);
  const [stampPreview1, setStampPreview1] = useState('');
  const [stampPreview2, setStampPreview2] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!courseData;
  const { data: sequences = [] } = useQuery({
    queryKey: ['certificateSequences'],
    queryFn: fetchCertificateSequences,
    enabled: isOpen, // فقط زمانی که مودال باز است، داده‌ها را بگیر
  });
  const unitStampFileQuery = useFileUrl(courseData?.unitStamp);
  const isFirstLoadunitStamp = useRef(true);
  const currentPattern = formData.certificateNumberPattern;
  const currentSequence = sequences.find(s => s.pattern === currentPattern);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          courseCode: courseData.courseCode || uuidv4(),
          name: courseData.name || '',
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          duration: courseData.duration || '',
          organizingUnit: courseData.organizingUnit || '',
          signatory: courseData.signatory?._id || null,
          position1: courseData.position1 || '',
          signatory2: courseData.signatory2?._id || null,
          position2: courseData.position2 || '',
          certificateNumberPattern: courseData.certificateNumberPattern || '',
        });
        setSelectedManager1(courseData.signatory || null);
        setSelectedManager2(courseData.signatory2 || null);
        if (isFirstLoadunitStamp.current && courseData?.unitStamp) {
          if (!unitStampFileQuery.isLoading && unitStampFileQuery.data) {
            setStampPreview1(unitStampFileQuery.data);
            isFirstLoadunitStamp.current = false;
          }
        }
        // setStampPreview1(courseData.unitStamp || '');
        // setStampPreview2(courseData.unitStamp2 || '');
      } else {
        // Reset form for creation
        setFormData({ name: '', date: null, duration: '', organizingUnit: '', signatory: null, position1: '', signatory2: null, position2: '', certificateNumberPattern: '' });
        setSelectedManager1(null);
        setSelectedManager2(null);
        setStampPreview1('');
        setStampFile1(null);
        setStampPreview2('');
        setStampFile2(null);
      }
      setError('');
    }
  }, [courseData, isOpen]);

   
    
  const handleFile1Change = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStampFile1(file);
      setStampPreview1(URL.createObjectURL(file));
    }
  };
  const handleFile2Change = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStampFile2(file);
      setStampPreview2(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.signatory) {
      setError('لطفاً یک امضاکننده انتخاب کنید.');
      return;
    }
    // setIsLoading(true);
    setError('');

    try {
      let stampUrl 
      let stampUrl2 
      if (courseData){
        stampUrl = courseData?.unitStamp?._id || null;
        stampUrl2 = courseData?.unitStamp2?._id || null;
      }
    
      const courseCode = formData?.courseCode || uuidv4();
      if (stampFile1) {
        stampUrl = await uploadFileMutation.mutateAsync({
          file: stampFile1,
          fileType: 'stamp',
          courseCode: courseCode
        });
      }
      if (stampFile2) {
        stampUrl2 = await uploadFileMutation.mutateAsync({
          file: stampFile2,
          fileType: 'stamp',
          courseCode: courseCode
        });
      }

      // Convert date object to Unix timestamp (seconds) for storage
      const finalData = { 
        ...formData, 
        date: formData.date ? Math.floor(new Date(formData.date).getTime() / 1000) : null,
        unitStamp: stampUrl,
        unitStamp2: stampUrl2,
        courseCode: courseCode,
      };
      if (courseData){
        courseMutation.mutateAsync({id:courseData._id,...finalData})
      }else{
        courseMutation.mutateAsync(finalData)
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{courseData ? 'ویرایش دوره' : 'ایجاد دوره جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 grid grid-cols-2 gap-4">
        <div className="col-span-1 p-4 border rounded-md space-y-2">
        <h4 className="font-semibold mb-2">اطلاعات دوره</h4>
          <Input name="name" placeholder="نام دوره" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={formData.date}
              onChange={(dateObject) => {
                setFormData({ ...formData, date: dateObject?.toDate?.() || null });
              }}
              placeholder='تاریخ برگزاری'
              inputClass="w-full px-3 py-2 border rounded-md h-10" // Style to match other inputs
              containerClassName="w-full"
            />
          </div>
          <Input name="duration" type="number" placeholder="مدت زمان (ساعت)" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} required />
          {/* <Input name="organizingUnit" placeholder="واحد برگزار کننده" value={formData.organizingUnit} onChange={e => setFormData({...formData, organizingUnit: e.target.value})} required />
          
          <div>
            <Label>امضاکننده گواهی</Label>
            <UserSearchCombobox 
              selectedUser={selectedManager}
              onSelectUser={(user) => {
                setSelectedManager(user);
                setFormData({...formData, signatory: user._id });
              }}
            />
          </div>
          
          <div>
            <Label htmlFor="stamp">مهر واحد</Label>
            <Input id="stamp" type="file" accept="image/*" onChange={handleFileChange} />
            {stampPreview && (
              <div className="mt-2 border rounded-md p-2 flex justify-center">
                <img src={stampPreview} alt="Stamp Preview" width={100} height={100} style={{ objectFit: 'contain' }} />
              </div>
            )}
          </div> */}
          <Input name="organizingUnit" placeholder="واحد برگزار کننده" className="col-span-2" value={formData.organizingUnit} onChange={e => setFormData({...formData, organizingUnit: e.target.value})} required  />
          {/* <Input name="certificateNumberPattern" placeholder="الگوی شماره گواهی (مثلا: 404/الف)" className="col-span-2" required /> */}
          <CertificatePatternCombobox
              value={formData.certificateNumberPattern}
              onChange={(newValue) => {
                setFormData(prev => ({ ...prev, certificateNumberPattern: newValue }));
              }}
            />
  </div>
     {/* امضاکننده اول */}
     <div className="col-span-1 p-4 border rounded-md">
            <h4 className="font-semibold mb-2">امضاکننده اول</h4>
            <div className="space-y-4">
              <UserSearchCombobox selectedUser={selectedManager1} onSelectUser={(user) => { setSelectedManager1(user); setFormData({...formData, signatory: user._id}); }} />
              <div className="w-full space-y-2 flex justify-between">
                <Label>تصویر مهر</Label>
                <Input
                  ref={refStampFile1}
                  id="stamp1"
                  name="stamp1"
                  type="file"
                  accept="image/*"
                  onChange={handleFile1Change}
                  onClick={(e) => (e.target.value = null)}
                  className="hidden" // --- ورودی فایل را مخفی کنید ---
                  />
                <Button type="button" variant="outline" onClick={() => refStampFile1.current?.click()}>
                  {stampPreview1 ? 'تغییر تصویر' : 'بارگذاری تصویر'}
                </Button>
              </div>
                  {stampPreview1 && <div className="p-2 border rounded-md bg-gray-50 flex justify-center"><img src={stampPreview1} alt="مهر ۱" width={80} height={80} /></div>}
            </div>
          </div>
 
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={courseMutation.isLoading}>{courseMutation.isLoading ? 'در حال ذخیره...' : 'ذخیره'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

`
      

          {/* امضاکننده دوم */}
          <div className="col-span-1 p-4 border rounded-md">
            <h4 className="font-semibold mb-2">امضاکننده دوم (اختیاری)</h4>
            <div className="space-y-4">
              <UserSearchCombobox selectedUser={selectedManager2} onSelectUser={(user) => { setSelectedManager2(user); setFormData({...formData, signatory2: user._id}); }} />
              <Input name="position2" placeholder="سمت امضاکننده دوم" />
              <Input type="file" name="stamp2" onChange={handleFile2Change} />
              {stampPreview2 && <Image src={stampPreview2} alt="مهر ۲" width={80} height={80} />}
            </div>
          </div>
          
`