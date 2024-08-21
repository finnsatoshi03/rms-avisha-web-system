import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Button } from "../ui/button";
import {
  Copy,
  Ellipsis,
  FilePenLine,
  ListCollapse,
  Loader2,
  Trash,
} from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { useUser } from "../auth/useUser";

export function EllipsisDropdown({
  onViewClick,
  onEditClick,
  onDuplicateClick,
  onDeleteClick,
  isDuplicating = false,
  isDeleting = false,
}: {
  onViewClick?: () => void;
  onEditClick?: () => void;
  onDuplicateClick?: () => void;
  onDeleteClick?: () => void;
  isDuplicating?: boolean;
  isDeleting?: boolean;
}) {
  const { isUser } = useUser();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="hover:bg-slate-200 h-fit w-fit p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Ellipsis size={18} strokeWidth={1.5} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="px-1 py-0.5 w-full" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              {onViewClick && (
                <span onClick={(e) => e.stopPropagation()}>
                  <CommandItem
                    onSelect={onViewClick}
                    className="flex items-center gap-2 px-4"
                  >
                    <ListCollapse size={14} strokeWidth={1.5} /> Details
                  </CommandItem>
                </span>
              )}
              {onEditClick && (
                <span onClick={(e) => e.stopPropagation()}>
                  <CommandItem
                    onSelect={onEditClick}
                    className="flex items-center gap-2 px-4"
                  >
                    <FilePenLine size={14} strokeWidth={1.5} /> Edit
                  </CommandItem>
                </span>
              )}
              {onDuplicateClick && !isUser && (
                <span onClick={(e) => e.stopPropagation()}>
                  <CommandItem
                    onSelect={onDuplicateClick}
                    className="flex items-center gap-2 px-4"
                    disabled={isDuplicating}
                  >
                    {isDuplicating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Duplicating
                      </>
                    ) : (
                      <>
                        <Copy size={14} strokeWidth={1.5} /> Duplicate
                      </>
                    )}
                  </CommandItem>
                </span>
              )}
            </CommandGroup>
            {onDeleteClick && !isUser && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <span onClick={(e) => e.stopPropagation()}>
                    <CommandItem
                      onSelect={onDeleteClick}
                      className="flex items-center gap-2 px-4"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting
                        </>
                      ) : (
                        <>
                          <Trash size={14} strokeWidth={1.5} /> Delete
                        </>
                      )}
                    </CommandItem>
                  </span>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
