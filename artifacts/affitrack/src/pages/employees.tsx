import { useState } from "react";
import { Layout } from "@/components/layout";
import { formatIDR } from "@/lib/format";
import { 
  useListEmployees, 
  useCreateEmployee, 
  useUpdateEmployee, 
  useDeleteEmployee,
  getListEmployeesQueryKey,
  Employee,
  EmployeeSalaryType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  phone: z.string().optional().nullable(),
  salaryType: z.enum(["daily", "monthly"] as const),
  salaryAmount: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

export default function Employees() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data, isLoading } = useListEmployees(
    { limit: 100 },
    { query: { queryKey: getListEmployeesQueryKey({ limit: 100 }) } }
  );

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "",
      phone: "",
      salaryType: "monthly",
      salaryAmount: 0,
      isActive: true,
    },
  });

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    form.reset({
      name: emp.name,
      role: emp.role,
      phone: emp.phone,
      salaryType: emp.salaryType as any,
      salaryAmount: emp.salaryAmount,
      isActive: emp.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEmployee(null);
    form.reset({
      name: "",
      role: "",
      phone: "",
      salaryType: "monthly",
      salaryAmount: 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingEmployee) {
      updateMutation.mutate(
        { id: editingEmployee.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Employee updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Employee created" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this employee?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            toast({ title: "Employee deleted" });
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
            <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">Manage your team and salary bases.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="salaryType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="salaryAmount" render={({ field }) => (
                      <FormItem><FormLabel>Base Salary</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="isActive" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingEmployee ? "Update" : "Save"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees found</TableCell>
                </TableRow>
              ) : (
                data?.data.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell>{emp.phone || "-"}</TableCell>
                    <TableCell className="capitalize">{emp.salaryType}</TableCell>
                    <TableCell className="text-right">{formatIDR(emp.salaryAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={emp.isActive ? "default" : "secondary"}>
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
