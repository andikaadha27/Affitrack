import { useState } from "react";
import { Layout } from "@/components/layout";
import { formatIDR } from "@/lib/format";
import { 
  useListSalaries, 
  useCalculateSalaries,
  getListSalariesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator } from "lucide-react";

export default function Salaries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data, isLoading } = useListSalaries(
    { month, year, limit: 100 },
    { query: { queryKey: getListSalariesQueryKey({ month, year, limit: 100 }) } }
  );

  const calculateMutation = useCalculateSalaries();

  const handleCalculate = () => {
    calculateMutation.mutate(
      { data: { month, year } },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries({ queryKey: getListSalariesQueryKey() });
          toast({ title: `Calculated salaries for ${res.length} employees` });
        }
      }
    );
  };

  const totalCalculated = data?.reduce((sum, sal) => sum + sal.calculatedAmount, 0) || 0;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salaries & Payroll</h1>
            <p className="text-muted-foreground">Calculate monthly salaries based on attendance.</p>
          </div>
          <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
            <Calculator className="mr-2 h-4 w-4" /> 
            {calculateMutation.isPending ? "Calculating..." : "Run Payroll Calculation"}
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }).map((_, i) => (
                <SelectItem key={i+1} value={(i+1).toString()}>
                  {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = currentDate.getFullYear() - 2 + i;
                return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Base Salary/Rate</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-center">Work Days</TableHead>
                <TableHead className="text-right">Final Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No salaries calculated for this period. Click "Run Payroll Calculation" to generate.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data?.map((sal) => (
                    <TableRow key={sal.id}>
                      <TableCell className="font-medium">{sal.employee?.name}</TableCell>
                      <TableCell className="capitalize">{sal.employee?.salaryType}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatIDR(sal.baseSalary)}</TableCell>
                      <TableCell className="text-center">{sal.attendanceCount}</TableCell>
                      <TableCell className="text-center">{sal.workingDays}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatIDR(sal.calculatedAmount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="font-bold text-right">Total Payroll:</TableCell>
                    <TableCell className="text-right font-bold text-lg text-primary">{formatIDR(totalCalculated)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
