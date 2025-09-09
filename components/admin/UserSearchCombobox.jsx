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

function UserSearchCombobox({ selectedUser, onSelectUser }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }
      const data = await internalAxios.get(
        `/admin/users/search?q=${searchQuery}`
      );
      setUsers(data.data);
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
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
      <PopoverContent className="w-[375px] p-0">
        <Command>
          <CommandInput
            placeholder="جستجوی نام کاربر..."
            onValueChange={setSearchQuery}
          />
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

export default UserSearchCombobox;
