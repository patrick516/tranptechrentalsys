// Label + shadcn Select in one control, so every dropdown in the portal looks
// and behaves the same. Use it instead of a native <select>.
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder = "Choose…",
  disabled = false,
  required = false,
  className,
}: SelectFieldProps) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="mb-1.5 block">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-label={label || placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
