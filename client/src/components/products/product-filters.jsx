import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function ProductFilters({ filters, setFilters, categories, onAddClick }) {
  return (
    <div className="grid gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 p-4 shadow-lg shadow-slate-950/5 dark:border-white/10 dark:bg-slate-950/35 md:grid-cols-[2fr_repeat(4,1fr)_auto]">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name, SKU, or barcode"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
        />
      </div>
      <Select
        value={filters.category}
        onChange={(event) =>
          setFilters((current) => ({ ...current, category: event.target.value }))
        }
      >
        <option value="all">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        placeholder="Min price"
        value={filters.minPrice}
        onChange={(event) =>
          setFilters((current) => ({ ...current, minPrice: event.target.value }))
        }
      />
      <Input
        type="number"
        placeholder="Max price"
        value={filters.maxPrice}
        onChange={(event) =>
          setFilters((current) => ({ ...current, maxPrice: event.target.value }))
        }
      />
      <Select
        value={filters.stockStatus}
        onChange={(event) =>
          setFilters((current) => ({
            ...current,
            stockStatus: event.target.value,
          }))
        }
      >
        <option value="all">All stock</option>
        <option value="in">In stock</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </Select>
      <Button type="button" onClick={onAddClick}>
        Add Product
      </Button>
    </div>
  )
}
