import { useState } from "react";
import { Layout } from "@/components/layout";
import { formatIDR } from "@/lib/format";
import { 
  useListExpenses, 
  useCreateExpense, 
  useUpdateExpense, 
  useDeleteExpense,
  getListExpensesQueryKey,
  Expense
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
  category: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
  notes: z.string().optional().nullable(),
});

export default function Expenses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { data, isLoading } = useListExpenses(
    { startDate: dateFilter || undefined, limit: 100 },
    { query: { queryKey: getListExpensesQueryKey({ startDate: dateFilter || undefined, limit: 100 }) } }
  );

  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      category: "",
      amount: 0,
      notes: "",
    },
  });

  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    form.reset({
      date: exp.date.split("T")[0],
      category: exp.category,
      amount: exp.amount,
      notes: exp.notes,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingExpense(null);
    form.reset({
      date: new Date().toISOString().split("T")[0],
      category: "",
      amount: 0,
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingExpense) {
      updateMutation.mutate(
        { id: editingExpense.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Expense updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Expense created" });
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
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
            toast({ title: "Expense deleted" });
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
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Manage operational costs and overheads.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} placeholder="e.g. Server, Office" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingExpense ? "Update" : "Save"}
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
                <TableHead>Category</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses found</TableCell>
                </TableRow>
              ) : (
                data?.data.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell>{exp.notes || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{formatIDR(exp.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(exp)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
