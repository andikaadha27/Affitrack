import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useListAttendance, 
  useMarkAttendance, 
  useBulkMarkAttendance,
  useListEmployees,
  getListAttendanceQueryKey,
  AttendanceStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Attendance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);

  const { data: employees, isLoading: loadingEmployees } = useListEmployees({ active: true, limit: 100 });
  
  const { data: attendance, isLoading: loadingAttendance } = useListAttendance(
    { startDate: dateFilter, endDate: dateFilter, limit: 100 },
    { query: { queryKey: getListAttendanceQueryKey({ startDate: dateFilter, endDate: dateFilter, limit: 100 }) } }
  );

  const markMutation = useMarkAttendance();
  const bulkMarkMutation = useBulkMarkAttendance();

  const getAttendanceForEmployee = (empId: number) => {
    return attendance?.data.find(a => a.employeeId === empId);
  };

  const handleMark = (employeeId: number, status: AttendanceStatus) => {
    markMutation.mutate(
      { data: { employeeId, date: dateFilter, status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
          toast({ title: `Marked as ${status}` });
        }
      }
    );
  };

  const handleBulkMark = () => {
    if (!employees?.data.length) return;
    
    const unrecordedIds = employees.data
      .filter(emp => !getAttendanceForEmployee(emp.id))
      .map(emp => emp.id);
      
    if (unrecordedIds.length === 0) {
      toast({ title: "All employees already recorded" });
      return;
    }

    bulkMarkMutation.mutate(
      { data: { date: dateFilter, employeeIds: unrecordedIds, status: "present" } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
          toast({ title: `Marked ${res.count} employees as present` });
        }
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return <Badge className="bg-primary/20 text-primary border-primary/30"><CheckCircle2 className="mr-1 h-3 w-3" /> Present</Badge>;
      case "absent": return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Absent</Badge>;
      case "leave": return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> Leave</Badge>;
      default: return null;
    }
  };

  const isLoading = loadingEmployees || loadingAttendance;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground">Record daily employee attendance.</p>
          </div>
          <Button onClick={handleBulkMark} disabled={bulkMarkMutation.isPending || isLoading}>
            Mark All Unrecorded as Present
          </Button>
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : employees?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No active employees found.</TableCell>
                </TableRow>
              ) : (
                employees?.data.map((emp) => {
                  const record = getAttendanceForEmployee(emp.id);
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.role}</TableCell>
                      <TableCell>
                        {record ? getStatusBadge(record.status) : <span className="text-muted-foreground text-sm italic">Not recorded</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={record?.status || ""} 
                          onValueChange={(v: any) => handleMark(emp.id, v)}
                        >
                          <SelectTrigger className="w-[140px] ml-auto">
                            <SelectValue placeholder="Mark as..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="leave">Leave</SelectItem>
                          </SelectContent>
                        </Select>
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
