import { FilterSelect } from "@/components/ui/filter-select";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/report-labels";
import type { ListFilters } from "@/hooks/useFilteredList";
import type { SelectOption } from "@/components/ui/filter-select";

interface ReportFiltersProps {
  filters: ListFilters;
  categories: SelectOption[];
  onChange: (name: keyof ListFilters, value: string) => void;
}

/** Baris filter status, kategori, dan prioritas. */
export function ReportFilters({ filters, categories, onChange }: ReportFiltersProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
      <FilterSelect
        label="Status"
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(v) => onChange("status", v)}
      />
      <FilterSelect
        label="Kategori"
        value={filters.category}
        options={categories}
        onChange={(v) => onChange("category", v)}
      />
      <FilterSelect
        label="Prioritas"
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(v) => onChange("priority", v)}
      />
    </div>
  );
}
