import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, CheckCircle2 } from 'lucide-react';
import { Supplier, SupplierCategory } from '@/types/requisition';

const SUPPLIER_CATEGORIES: SupplierCategory[] = [
  'Advertising and Promo',
  'Building, electricians etc',
  'Car hire & Air travel',
  'Catering, Study and Graduation',
  'Fumigators, Cleaners',
  'Furniture & Repairs',
  'HR & Legal',
  'Hotels, Travel and Events',
  'Insurance',
  'Office Consumables',
  'Stationery & Printing',
  'Tech Services',
  'Telecomms',
  'Uniforms',
];

interface SupplierPickerProps {
  suppliers: Supplier[];
  selectedSupplierId: string;
  onSelectSupplier: (supplierId: string) => void;
  disabled?: boolean;
}

const SupplierPicker = ({ 
  suppliers, 
  selectedSupplierId, 
  onSelectSupplier,
  disabled = false 
}: SupplierPickerProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(s => s.status === 'active')
      .filter(s => {
        if (categoryFilter !== 'all') {
          return s.category === categoryFilter;
        }
        return true;
      })
      .filter(s => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.icazNumber?.toLowerCase().includes(query) ||
          s.contactInfo?.toLowerCase().includes(query) ||
          s.category?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, searchQuery, categoryFilter]);

  const handleSelectSupplier = (supplier: Supplier) => {
    onSelectSupplier(supplier.id);
    setOpen(false);
    setSearchQuery('');
    setCategoryFilter('all');
  };

  const suppliersByCategory = useMemo(() => {
    const grouped: Record<string, Supplier[]> = {};
    filteredSuppliers.forEach(supplier => {
      const cat = supplier.category || 'Other';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(supplier);
    });
    return grouped;
  }, [filteredSuppliers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start h-auto min-h-10 py-2 bg-background"
          disabled={disabled}
        >
          {selectedSupplier ? (
            <div className="flex flex-col items-start gap-1">
              <span className="font-medium">{selectedSupplier.name}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {selectedSupplier.category}
                </Badge>
                <span>{selectedSupplier.icazNumber}</span>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Click to search and select supplier</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Supplier
          </DialogTitle>
        </DialogHeader>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3 py-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ICAZ number, or contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="w-full sm:w-56">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-[100]">
                <SelectItem value="all">All Categories</SelectItem>
                {SUPPLIER_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground py-2">
          {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} found
          {categoryFilter !== 'all' && ` in ${categoryFilter}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Supplier List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No suppliers found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {Object.entries(suppliersByCategory).map(([cat, catSuppliers]) => (
                <div key={cat}>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    {cat} ({catSuppliers.length})
                  </Label>
                  <div className="space-y-1">
                    {catSuppliers.map(supplier => (
                      <button
                        key={supplier.id}
                        onClick={() => handleSelectSupplier(supplier)}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-accent hover:border-primary/50 ${
                          supplier.id === selectedSupplierId 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-background border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{supplier.name}</span>
                              {supplier.id === selectedSupplierId && (
                                <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              ICAZ: {supplier.icazNumber || 'N/A'}
                            </div>
                            {supplier.contactInfo && (
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {supplier.contactInfo}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierPicker;