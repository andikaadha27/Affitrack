import { useState } from "react";
import { Layout } from "@/components/layout";
import { formatIDR } from "@/lib/format";
import { 
  useListRevenues, 
  useCreateRevenue, 
  useUpdateRevenue, 
  useDeleteRevenue,
  getListRevenuesQueryKey,
  Revenue
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  date: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
  actualAmount: z.coerce.number().optional().nullable(),
  product: z.string().min(1, "Required"),
  units: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default function Revenues() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);

  const { data, isLoading } = useListRevenues(
    { startDate: dateFilter || undefined, limit: 100 },
    { query: { queryKey: getListRevenuesQueryKey({ startDate: dateFilter || undefined, limit: 100 }) } }
  );

  const createMutation = useCreateRevenue();
  const updateMutation = useUpdateRevenue();
  const deleteMutation = useDeleteRevenue();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      actualAmount: null,
      product: "",
      units: null,
      notes: "",
    },
  });

  const openEdit = (rev: Revenue) => {
    setEditingRevenue(rev);
    form.reset({
      date: rev.date.split("T")[0],
      amount: rev.amount,
      actualAmount: rev.actualAmount,
      product: rev.product,
      units: rev.units,
      notes: rev.notes,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingRevenue(null);
    form.reset({
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      actualAmount: null,
      product: "",
      units: null,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingRevenue) {
      updateMutation.mutate(
        { id: editingRevenue.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Revenue updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Revenue created" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this record?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRevenuesQueryKey() });
            toast({ title: "Revenue deleted" });
          },
        }
      );
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenues</h1>
            <p className="text-muted-foreground">Manage your daily sales and actual transfers.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Revenue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRevenue ? "Edit Revenue" : "Add Revenue"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="product" render={({ field }) => (
                      <FormItem><FormLabel>Product/Campaign</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>System Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="actualAmount" render={({ field }) => (
                      <FormItem><FormLabel>Actual Transfer</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="units" render={({ field }) => (
                      <FormItem><FormLabel>Units Sold</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingRevenue ? "Update" : "Save"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 items-center">
          <div className="w-64">
            <Input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date" 
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter("")}>Clear Filter</Button>
          )}
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">System Amount</TableHead>
                <TableHead className="text-right">Actual Transfer</TableHead>
                <TableHead className="text-right">Diff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No revenues found</TableCell>
                </TableRow>
              ) : (
                data?.data.map((rev) => {
                  const diff = rev.actualAmount != null ? rev.actualAmount - rev.amount : null;
                  return (
                    <TableRow key={rev.id}>
                      <TableCell>{new Date(rev.date).toLocaleDateString()}</TableCell>
                      <TableCell>{rev.product}</TableCell>
                      <TableCell className="text-right font-medium">{formatIDR(rev.amount)}</TableCell>
                      <TableCell className="text-right">
                        {rev.actualAmount != null ? formatIDR(rev.actualAmount) : "-"}
                      </TableCell>
                      <TableCell className={`text-right ${diff && diff < 0 ? "text-destructive" : diff && diff > 0 ? "text-primary" : ""}`}>
                        {diff != null ? formatIDR(diff) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(rev)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rev.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
