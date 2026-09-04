"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { internalAxios } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Add as Plus, Edit as Pencil, Trash as Trash2, Building2 } from "reicon-react";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import PageHeader from "@/components/admin/ui/PageHeader";
import DataTableShell from "@/components/admin/ui/DataTableShell";
import ChipInput from "@/components/admin/ui/ChipInput";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { gooeyToast } from "goey-toast";
import { toPersianDigits } from "@/lib/persian-date";

const MAX_UNITS = 30;

const deputyNumber = (n) => toPersianDigits(String(n).padStart(2, "0"));

function DeputyCard({ deputy, onEdit, onDelete }) {
  const units = deputy.units || [];
  return (
    <motion.li variants={fadeUp} className="h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm transition-all duration-300  hover:border-emerald-300 hover:shadow-[0_16px_40px_rgb(16,185,129,0.14)]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="mt-3 text-lg font-bold text-balance">{deputy.name}</h3>
          <span className="select-none bg-gradient-to-b from-emerald-500/30 to-emerald-500/5 bg-clip-text text-6xl font-bold leading-[0.9] text-transparent">
            <span className="sr-only">شماره معاونت: </span>
            {deputyNumber(deputy.number)}
          </span>
          {/* <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 transition-transform duration-300 group-hover:scale-110">
            <Building2 className="size-5" aria-hidden />
          </span> */}
        </div>


        {units.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {units.map((unit) => (
              <li
                key={unit}
                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {unit}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">واحدی ثبت نشده</p>
        )}
        <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
          {toPersianDigits(String(units.length))} واحد زیرمجموعه
        </p>

        <div className="mt-auto flex justify-end items-center gap-1 border-t border-border/60 pt-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={onEdit}
            aria-label={`ویرایش ${deputy.name}`}
            title="ویرایش"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer text-destructive"
            onClick={onDelete}
            aria-label={`حذف ${deputy.name}`}
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </article>
    </motion.li>
  );
}

function CardGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-3xl" />
      ))}
    </div>
  );
}

export default function DeputiesClient() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeputy, setEditingDeputy] = useState(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [units, setUnits] = useState([]);
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
    setUnits(deputy?.units || []);
    setNameError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("نام معاونت الزامی است.");
      return;
    }
    setNameError("");
    try {
      if (editingDeputy) {
        await updateMutation.mutateAsync({ id: editingDeputy._id, body: { name: trimmed, units } });
      } else {
        await createMutation.mutateAsync({ name: trimmed, units });
      }
      setDialogOpen(false);
    } catch {
      // mutation onError already surfaced the toast; keep the dialog open
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const totalUnits = deputies.reduce((sum, d) => sum + (d.units?.length || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="مدیریت معاونت‌ها"
        description="ساختار معاونت‌ها و واحدهای زیرمجموعه، پایه شماره‌گذاری گواهی‌ها"
        actions={
          <Button
            className="cursor-pointer bg-gradient-to-l from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-600"
            onClick={() => openDialog()}
          >
            <Plus className="h-4 w-4" /> ایجاد معاونت جدید
          </Button>
        }
      />

      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        isEmpty={!deputies.length}
        onRetry={refetch}
        skeleton={<CardGridSkeleton />}
        emptyTitle="معاونتی ثبت نشده است"
        emptyDescription="برای شروع، اولین معاونت را ایجاد کنید."
        emptyAction={
          <Button
            className="cursor-pointer bg-gradient-to-l from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-700 hover:to-emerald-600"
            onClick={() => openDialog()}
          >
            <Plus className="h-4 w-4" /> ایجاد معاونت جدید
          </Button>
        }
        contentClassName="border-0 bg-transparent p-0 shadow-none backdrop-blur-none"
        toolbar={
          <p className="text-sm text-muted-foreground">
            {toPersianDigits(String(deputies.length))} معاونت ·{" "}
            {toPersianDigits(String(totalUnits))} واحد زیرمجموعه
          </p>
        }
      >
        <motion.ul
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {deputies.map((d) => (
            <DeputyCard
              key={d._id}
              deputy={d}
              onEdit={() => openDialog(d)}
              onDelete={() => setConfirm({ type: "delete", deputy: d })}
            />
          ))}
        </motion.ul>
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {/* <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-500/30">
                <Building2 className="size-6" aria-hidden />
              </span> */}
              <div className="text-right">
                <DialogTitle>
                  {editingDeputy ? "ویرایش معاونت" : "ایجاد معاونت جدید"}
                </DialogTitle>
                <DialogDescription className="mt-3">
                  {editingDeputy
                    ? "نام معاونت و واحدهای زیرمجموعه را به‌روزرسانی کنید."
                    : "نام معاونت را وارد کنید و در صورت نیاز واحدهای زیرمجموعه را بیفزایید."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {nameError && (
              <p role="alert" className="text-sm text-destructive">
                {nameError}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="deputyName">نام معاونت</Label>
              <Input
                id="deputyName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: معاونت آموزشی"
                dir="rtl"
                aria-invalid={!!nameError}
              />
            </div>
            <ChipInput
              id="deputyUnit"
              label="واحدها (اختیاری)"
              value={units}
              onChange={setUnits}
              max={MAX_UNITS}
              placeholder="مثال: واحد پژوهش"
              duplicateMessage="این واحد تکراری است."
              removeLabel={(unit) => `حذف ${unit}`}
              description="واحد یک بخش زیرمجموعه معاونت است؛ هنگام ساخت دوره می‌توان دوره را به نام معاونت یا حداکثر دو واحد ثبت کرد."
            />
            {editingDeputy && (
              <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
                <span className="text-muted-foreground">شماره معاونت</span>
                <span className="rounded-full border border-emerald-600/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-emerald-700">
                  {deputyNumber(editingDeputy.number)}
                </span>
                <span className="text-xs text-muted-foreground">
                  غیرقابل تغییر است (در شماره گواهی‌ها به کار می‌رود)
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="cursor-pointer"
              onClick={() => setDialogOpen(false)}
            >
              انصراف
            </Button>
            <Button className="cursor-pointer" onClick={handleSave} loading={isPending}>
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
