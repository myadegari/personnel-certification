'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import clsx from 'clsx';

// API function to fetch sequences
const fetchCertificateSequences = async () => {
  const { data } = await axios.get('/admin/certificate-sequences');
  return data;
};

export default function CertificatePatternCombobox({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['certificateSequences'],
    queryFn: fetchCertificateSequences,
    enabled: open, // Only fetch when the popover is open
  });

  const currentSequence = sequences.find(s => s.pattern === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {currentSequence ? currentSequence.pattern : (value || "انتخاب یا ایجاد الگو...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="جستجو یا ایجاد الگو..."
            value={value}
            onValueChange={onChange}   
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setOpen(false);
                  onChange(value); // keep whatever the user typed
                }
              }}      />
          <CommandList>
            {isLoading && <CommandEmpty>در حال بارگذاری...</CommandEmpty>}
            {!isLoading && sequences.length === 0 && <CommandEmpty>الگوی موجودی یافت نشد.</CommandEmpty>}
            <CommandGroup>
              {sequences.map((sequence) => (
                <CommandItem
                  key={sequence._id}
                  value={sequence.pattern}
                  onSelect={(currentValue) => {
                    // onChange(currentValue === value ? "" : currentValue);
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  disabled={sequence.status === 'disabled'}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <Check
                      className={clsx(
                        "mr-2 h-4 w-4",
                        value === sequence.pattern ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {sequence.pattern}
                  </div>
                  {sequence.status === 'warning' && (
                    <span className="text-xs text-yellow-600">
                      ({sequence.remaining} مانده)
                    </span>
                  )}
                  {sequence.status === 'disabled' && (
                    <span className="text-xs text-red-600">(پایان یافته)</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
