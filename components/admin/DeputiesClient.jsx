"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/ui/PageHeader";
import DataTableShell from "@/components/admin/ui/DataTableShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { gooeyToast } from "goey-toast";

export default function DeputiesClient() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeputy, setEditingDeputy] = useState(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(null);

  const { data: deputies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["adminDeputies"],
    queryFn: async () => (await internalAxios.get("/admin/deputies")).data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminDeputies"] });

  const createMutation = useMutation({
    mutationFn: (body) => internalAxios.post("/admin/deputies", body),
    onSuccess: () => { gooeyToast.success("معاونت ایجاد شد."); invalidate(); },
    onError: (err) => gooeyToast.error(err.response?.data?.error || "خطا در ایجاد معاونت"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => internalAxios.put(`/admin/deputies/${id}`, body),
    onSuccess: () => { gooeyToast.success("معاونت ویرایش شد."); invalidate(); },
    onError: (err) => gooeyToast.error(err.response?.data?.error || "خطا در ویرایش معاونت"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => internalAxios.delete(`/admin/deputies/${id}`),
    onSuccess: () => { gooeyToast.success("معاونت حذف شد."); invalidate(); },
    onError: (err) => gooeyToast.error(err.response?.data?.error || "خطا در حذف معاونت"),
  });

  const openDialog = (deputy = null) => {
    setEditingDeputy(deputy);
    setName(deputy?.name || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingDeputy) {
      await updateMutation.mutateAsync({ id: editingDeputy._id, body: { name: trimmed } });
    } else {
      await createMutation.mutateAsync({ name: trimmed });
    }
    setDialogOpen(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <PageHeader title="مدیریت معاونت‌ها" description="ایجاد، ویرایش و حذف معاونت‌ها" />

      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        isEmpty={!deputies.length}
        onRetry={refetch}
        emptyTitle="معاونتی ثبت نشده است"
        emptyDescription="اولین معاونت را ایجاد کنید."
        toolbar={
          <div className="flex items-center justify-between">
            <div />
            <Button className="cursor-pointer" onClick={() => openDialog()}>
              <Plus className="h-4 w-4" /> ایجاد معاونت جدید
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">شماره</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500">نام</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {deputies.map((d) => (
                <tr key={d._id} className="border-b transition-colors hover:bg-emerald-50/40">
                  <td className="px-4 py-3 text-sm font-mono" dir="ltr">{String(d.number).padStart(2, "0")}</td>
                  <td className="px-4 py-3 text-sm font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => openDialog(d)}
                        aria-label={`ویرایش ${d.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-red-600"
                        onClick={() => setConfirm({ type: "delete", deputy: d })}
                        aria-label={`حذف ${d.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDeputy ? "ویرایش معاونت" : "ایجاد معاونت جدید"}</DialogTitle>
            <DialogDescription>
              {editingDeputy ? "نام معاونت را ویرایش کنید." : "نام معاونت جدید را وارد کنید."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="deputyName">نام معاونت</Label>
              <Input
                id="deputyName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: معاونت آموزشی"
                dir="rtl"
              />
            </div>
            {editingDeputy && (
              <p className="text-xs text-muted-foreground">
                شماره معاونت ({String(editingDeputy.number).padStart(2, "0")}) غیرقابل تغییر است.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" className="cursor-pointer" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button className="cursor-pointer" onClick={handleSave} disabled={isPending || !name.trim()}>
              {editingDeputy ? "ذخیره" : "ایجاد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="حذف معاونت"
        description={confirm ? `آیا از حذف «${confirm.deputy.name}» اطمینان دارید؟ این عمل در صورت وجود ارجاع در دوره‌ها یا کاربران ممکن نیست.` : ""}
        confirmText="حذف"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (confirm?.type === "delete") {
            deleteMutation.mutate(confirm.deputy._id);
            setConfirm(null);
          }
        }}
      />
    </div>
  );
}