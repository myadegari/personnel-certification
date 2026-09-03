import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState, useEffect } from "react";
import {internalAxios} from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function UserSearchCombobox({ selectedUser, onSelectUser }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setUsers([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const data = await internalAxios.get(
          `/admin/users/search?q=${searchQuery}`,
          { signal: controller.signal }
        );
        setUsers(data.data);
      } catch (error) {
        if (!controller.signal.aborted) {
          // Keep the previous results on failure instead of clearing the list.
          console.error("خطا در جستجوی کاربران:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser
            ? `${selectedUser.firstName} ${selectedUser.lastName}`
            : "انتخاب کاربر..."}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(375px,var(--radix-popover-trigger-width))] p-0">
        <Command>
          <CommandInput
            placeholder="جستجوی نام کاربر..."
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {searchQuery.length >= 2 && isSearching && (
              <div className="flex items-center justify-center gap-2 px-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                در حال جستجو…
              </div>
            )}
            {searchQuery.length >= 2 && !isSearching && users.length === 0 && (
              <CommandEmpty>کاربری یافت نشد.</CommandEmpty>
            )}
            <CommandGroup>
              {users.map((user) => {
                const isSelected = selectedUser?._id === user._id;
                return (
                  <CommandItem
                    key={user._id}
                    value={`${user.firstName} ${user.lastName}`}
                    onSelect={() => {
                      onSelectUser(user);
                      setOpen(false);
                    }}
                  >
                    {user.firstName} {user.lastName}
                    <Check
                      className={cn(
                        "ms-auto size-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default UserSearchCombobox;
