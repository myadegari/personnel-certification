'use client';

import { useState, useEffect } from 'react';
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

// --- کامپوننت جستجوی کاربر ---
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
export default function CourseFormModal({ isOpen, onClose, courseData, onSave }) {
    const [formData, setFormData] = useState({
    name: '', date: null, duration: '', organizingUnit: '',
    unitManager: null, position1: '',
    unitManager2: null, position2: '',
    certificateNumberPattern: '',
  });
  const [selectedManager1, setSelectedManager1] = useState(null);
  const [selectedManager2, setSelectedManager2] = useState(null);
  const [stampFile1, setStampFile1] = useState(null);
  const [stampFile2, setStampFile2] = useState(null);
  const [stampPreview1, setStampPreview1] = useState('');
  const [stampPreview2, setStampPreview2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!courseData;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        console.log(courseData.date)
        console.log(Date(courseData.date * 1000))
        setFormData({
          name: courseData.name || '',
          // Convert Unix timestamp (seconds) to Date object (milliseconds)
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          duration: courseData.duration || '',
          organizingUnit: courseData.organizingUnit || '',
          unitManager: courseData.unitManager?._id || null,
          position1: courseData.position1 || '',
          unitManager2: courseData.unitManager2?._id || null,
          position2: courseData.position2 || '',
          certificateNumberPattern: courseData.certificateNumberPattern || '',
        });
        setSelectedManager1(courseData.unitManager || null);
        setSelectedManager2(courseData.unitManager2 || null);
        setStampPreview1(courseData.unitStamp || '');
        setStampPreview2(courseData.unitStamp2 || '');
      } else {
        // Reset form for creation
        setFormData({ name: '', date: null, duration: '', organizingUnit: '', unitManager: null, position1: '', unitManager2: null, position2: '', certificateNumberPattern: '' });
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
    if (!formData.unitManager) {
      setError('لطفاً یک امضاکننده انتخاب کنید.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      let stampUrl = courseData?.unitStamp || '';
      let stampUrl2 = courseData?.unitStamp2 || '';
      if (stampFile1) {
        // Upload the new stamp file
        const uploadFormData = new FormData();
        uploadFormData.append('file', stampFile1);
        uploadFormData.append('fileType', 'stamp'); // Differentiate file type
        const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
        const uploadData = await res.json();
        if (!res.ok) throw new Error('Upload failed');
        stampUrl = uploadData.url;
      }
      // Similarly handle stampFile2 if needed
      if (stampFile2) {
        // Upload the new stamp file
        const uploadFormData = new FormData();
        uploadFormData.append('file', stampFile2);
        uploadFormData.append('fileType', 'stamp'); // Differentiate file type
        const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
        const uploadData = await res.json();
        if (!res.ok) throw new Error('Upload failed');
        stampUrl2 = uploadData.url;
      }

      // Convert date object to Unix timestamp (seconds) for storage
      const finalData = { 
        ...formData, 
        date: formData.date ? Math.floor(new Date(formData.date).getTime() / 1000) : null,
        unitStamp: stampUrl,
        unitStamp2: stampUrl2,
      };

      const response = isEditing
        ? await fetch(`/api/admin/courses/${courseData._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
          })
        : await fetch('/api/admin/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
          });

      if (!response.ok) throw new Error('Failed to save course');
      
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'ویرایش دوره' : 'ایجاد دوره جدید'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" placeholder="نام دوره" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <div>
            <Label>تاریخ برگزاری</Label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={formData.date}
              onChange={(dateObject) => {
                setFormData({ ...formData, date: dateObject?.toDate?.() || null });
              }}
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
                setFormData({...formData, unitManager: user._id });
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
          <Input name="organizingUnit" placeholder="واحد برگزار کننده" className="col-span-2" required />
          <Input name="certificateNumberPattern" placeholder="الگوی شماره گواهی (مثلا: 404/الف)" className="col-span-2" required />

          {/* امضاکننده اول */}
          <div className="col-span-1 p-4 border rounded-md">
            <h4 className="font-semibold mb-2">امضاکننده اول</h4>
            <div className="space-y-4">
              <UserSearchCombobox selectedUser={selectedManager1} onSelectUser={(user) => { setSelectedManager1(user); setFormData({...formData, unitManager: user._id}); }} />
              <Input name="position1" placeholder="سمت امضاکننده اول" required />
              <Input type="file" name="stamp1" onChange={handleFile1Change} />
              {stampPreview1 && <Image src={stampPreview1} alt="مهر ۱" width={80} height={80} />}
            </div>
          </div>

          {/* امضاکننده دوم */}
          <div className="col-span-1 p-4 border rounded-md">
            <h4 className="font-semibold mb-2">امضاکننده دوم (اختیاری)</h4>
            <div className="space-y-4">
              <UserSearchCombobox selectedUser={selectedManager2} onSelectUser={(user) => { setSelectedManager2(user); setFormData({...formData, unitManager2: user._id}); }} />
              <Input name="position2" placeholder="سمت امضاکننده دوم" />
              <Input type="file" name="stamp2" onChange={handleFile2Change} />
              {stampPreview2 && <Image src={stampPreview2} alt="مهر ۲" width={80} height={80} />}
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'در حال ذخیره...' : 'ذخیره'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
