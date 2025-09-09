"use client";

import { useState, useEffect, useRef } from "react";
import {internalAxios} from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CertificatePatternCombobox from "./CertificatePatternCombobox"; // <-- کامپوننت جدید را import کنید
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useFileUrl } from "@/hooks/useFileUrl"; // ✅ Import new hook
import { useUploadFile, useCourseMutation } from "@/hooks/useCourseMutation"; // ✅ Import upload hook
import UserSearchCombobox from "./UserSearchCombobox"

const fetchCertificateSequences = async () => {
  const { data } = await internalAxios.get("/admin/certificate-sequences");
  return data;
};

export default function CourseFormModal({ isOpen, onClose, courseData }) {
  const uploadFileMutation = useUploadFile();
  const courseMutation = useCourseMutation(onClose, courseData);
  const [formData, setFormData] = useState({
    name: "",
    date: null,
    duration: "",
    organizingUnit: "",
    signatory: null,
    signatory2: null,
    certificateNumberPattern: "",
    courseCode: uuidv4(),
  });
  const refStampFile1 = useRef(null);
  const [selectedManager1, setSelectedManager1] = useState(null);
  const [selectedManager2, setSelectedManager2] = useState(null);
  const [stampFile1, setStampFile1] = useState(null);
  const [stampFile2, setStampFile2] = useState(null);
  const [stampPreview1, setStampPreview1] = useState("");
  const [stampPreview2, setStampPreview2] = useState("");
  const [error, setError] = useState("");

  const isEditing = !!courseData;
  const { data: sequences = [] } = useQuery({
    queryKey: ["certificateSequences"],
    queryFn: fetchCertificateSequences,
    enabled: isOpen, // فقط زمانی که مودال باز است، داده‌ها را بگیر
  });
  const unitStampFileQuery = useFileUrl(courseData?.unitStamp);
  const isFirstLoadunitStamp = useRef(true);
  const currentPattern = formData.certificateNumberPattern;
  const currentSequence = sequences.find((s) => s.pattern === currentPattern);

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setFormData({
          courseCode: courseData.courseCode || uuidv4(),
          name: courseData.name || "",
          date: courseData.date ? new Date(courseData.date * 1000) : null,
          duration: courseData.duration || "",
          organizingUnit: courseData.organizingUnit || "",
          signatory: courseData.signatory?._id || null,
          signatory2: courseData.signatory2?._id || null,
          certificateNumberPattern: courseData.certificateNumberPattern || "",
        });
        setSelectedManager1(courseData.signatory || null);
        setSelectedManager2(courseData.signatory2 || null);
        if (isFirstLoadunitStamp.current && courseData?.unitStamp) {
          if (!unitStampFileQuery.isLoading && unitStampFileQuery.data) {
            setStampPreview1(unitStampFileQuery.data);
            isFirstLoadunitStamp.current = false;
          }
        }
      } else {
        // Reset form for creation
        setFormData({
          name: "",
          date: null,
          duration: "",
          organizingUnit: "",
          signatory: null,
          signatory2: null,
          certificateNumberPattern: "",
        });
        setSelectedManager1(null);
        setSelectedManager2(null);
        setStampPreview1("");
        setStampFile1(null);
        setStampPreview2("");
        setStampFile2(null);
      }
      setError("");
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
      setError("لطفاً یک امضاکننده انتخاب کنید.");
      return;
    }
    // setIsLoading(true);
    setError("");

    try {
      let stampUrl;
      let stampUrl2;
      if (courseData) {
        stampUrl = courseData?.unitStamp?._id || null;
        stampUrl2 = courseData?.unitStamp2?._id || null;
      }

      const courseCode = formData?.courseCode || uuidv4();
      if (stampFile1) {
        stampUrl = await uploadFileMutation.mutateAsync({
          file: stampFile1,
          fileType: "stamp",
          courseCode: courseCode,
        });
      }
      if (stampFile2) {
        stampUrl2 = await uploadFileMutation.mutateAsync({
          file: stampFile2,
          fileType: "stamp",
          courseCode: courseCode,
        });
      }

      // Convert date object to Unix timestamp (seconds) for storage
      const finalData = {
        ...formData,
        date: formData.date
          ? Math.floor(new Date(formData.date).getTime() / 1000)
          : null,
        unitStamp: stampUrl,
        unitStamp2: stampUrl2,
        courseCode: courseCode,
      };
      if (courseData) {
        courseMutation.mutateAsync({ id: courseData._id, ...finalData });
      } else {
        courseMutation.mutateAsync(finalData);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>
            {courseData ? "ویرایش دوره" : "ایجاد دوره جدید"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 grid grid-cols-2 gap-4"
        >
          <div className="col-span-1 p-4 border rounded-md space-y-2">
            <h4 className="font-semibold mb-2">اطلاعات دوره</h4>
            <Input
              name="name"
              placeholder="نام دوره"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <div>
              <DatePicker
                calendar={persian}
                locale={persian_fa}
                value={formData.date}
                onChange={(dateObject) => {
                  setFormData({
                    ...formData,
                    date: dateObject?.toDate?.() || null,
                  });
                }}
                placeholder="تاریخ برگزاری"
                inputClass="w-full px-3 py-2 border rounded-md h-10" // Style to match other inputs
                containerClassName="w-full"
              />
            </div>
            <Input
              name="duration"
              type="number"
              placeholder="مدت زمان (ساعت)"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              required
            />
            <Input
              name="organizingUnit"
              placeholder="واحد برگزار کننده"
              className="col-span-2"
              value={formData.organizingUnit}
              onChange={(e) =>
                setFormData({ ...formData, organizingUnit: e.target.value })
              }
              required
            />
            <CertificatePatternCombobox
              value={formData.certificateNumberPattern}
              onChange={(newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  certificateNumberPattern: newValue,
                }));
              }}
            />
            {currentSequence && (
              <div className="text-sm text-muted-foreground mt-1">
                <p>الگوی فعلی: {currentSequence.pattern}</p>
                <p>شماره بعدی: {currentSequence.nextNumber}</p>
                {currentSequence.description && (
                  <p>توضیحات: {currentSequence.description}</p>
                )}
              </div>
)}
          </div>
          {/* امضاکننده اول */}
          <div className="col-span-1 p-4 border rounded-md">
            <h4 className="font-semibold mb-2">امضاکننده اول</h4>
            <div className="space-y-4">
              <UserSearchCombobox
                selectedUser={selectedManager1}
                onSelectUser={(user) => {
                  setSelectedManager1(user);
                  setFormData({ ...formData, signatory: user._id });
                }}
              />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refStampFile1.current?.click()}
                >
                  {stampPreview1 ? "تغییر تصویر" : "بارگذاری تصویر"}
                </Button>
              </div>
              {stampPreview1 && (
                <div className="p-2 border rounded-md bg-gray-50 flex justify-center">
                  <img src={stampPreview1} alt="مهر ۱" width={80} height={80} />
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={courseMutation.isLoading}>
              {courseMutation.isLoading ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
