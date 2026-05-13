import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useListSchedules, 
  useCreateSchedule, 
  useUpdateSchedule, 
  useDeleteSchedule,
  useListEmployees,
  getListSchedulesQueryKey,
  Schedule,
  ScheduleShift
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  employeeId: z.coerce.number().min(1, "Required"),
  date: z.string().min(1, "Required"),
  shift: z.enum(["morning", "afternoon", "evening", "full"] as const),
});

export default function Schedules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const { data: employees } = useListEmployees({ active: true, limit: 100 });
  const { data, isLoading } = useListSchedules(
    { startDate: dateFilter, endDate: dateFilter, limit: 100 },
    { query: { queryKey: getListSchedulesQueryKey({ startDate: dateFilter, endDate: dateFilter, limit: 100 }) } }
  );

  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  const deleteMutation = useDeleteSchedule();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: 0,
      date: dateFilter,
      shift: "morning",
    },
  });

  const openEdit = (sch: Schedule) => {
    setEditingSchedule(sch);
    form.reset({
      employeeId: sch.employeeId,
      date: sch.date.split("T")[0],
      shift: sch.shift as any,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingSchedule(null);
    form.reset({
      employeeId: employees?.data?.[0]?.id || 0,
      date: dateFilter,
      shift: "morning",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingSchedule) {
      updateMutation.mutate(
        { id: editingSchedule.id, data: { shift: values.shift } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Schedule updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Schedule created" });
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this schedule?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
            toast({ title: "Schedule deleted" });
          },
        }
      );
    }
  };

  const getShiftBadge = (shift: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      morning: "default",
      afternoon: "secondary",
      evening: "destructive",
      full: "outline"
    };
    return <Badge variant={variants[shift] || "default"} className="capitalize">{shift}</Badge>;
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shift Schedules</h1>
            <p className="text-muted-foreground">Manage daily work schedules for your team.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Schedule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Edit Schedule" : "Add Schedule"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="employeeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? field.value.toString() : ""} disabled={!!editingSchedule}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {employees?.data.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} ({emp.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} disabled={!!editingSchedule} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="shift" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.values(ScheduleShift).map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSchedule ? "Update" : "Save"}
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
            />
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No schedules set for this date.</TableCell>
                </TableRow>
              ) : (
                data?.map((sch) => (
                  <TableRow key={sch.id}>
                    <TableCell className="font-medium">{sch.employee?.name}</TableCell>
                    <TableCell>{sch.employee?.role}</TableCell>
                    <TableCell>{getShiftBadge(sch.shift)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(sch)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(sch.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
