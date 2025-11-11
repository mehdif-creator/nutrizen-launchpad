import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Mobile-optimized Select component that falls back to native <select> on mobile devices
 * to avoid freeze/scroll lock issues common with custom dropdowns on iOS/Android.
 * 
 * On desktop, uses a custom dropdown with better UX.
 * On mobile (<768px), uses native select for reliability.
 */
export function MobileSelect({
  value,
  onValueChange,
  placeholder = "Sélectionne...",
  options,
  disabled = false,
  className,
  id,
}: MobileSelectProps) {
  const isMobile = useIsMobile();

  // Native select for mobile
  if (isMobile) {
    return (
      <select
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input",
          "bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>option]:bg-background [&>option]:text-foreground",
          className
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Custom select for desktop
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input",
          "bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn(!selectedOption && "text-muted-foreground")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <>
          {/* Backdrop - tap to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            onTouchMove={(e) => {
              // Allow scrolling on backdrop
              e.stopPropagation();
            }}
          />
          
          {/* Dropdown menu */}
          <div
            role="listbox"
            className={cn(
              "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md",
              "border border-border bg-popover text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onValueChange(option.value);
                      setOpen(false);
                    }
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm",
                    "outline-none hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                  tabIndex={0}
                >
                  <span className="flex-1">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4" />}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
