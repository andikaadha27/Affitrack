import { useState } from "react";
import { Layout } from "@/components/layout";
import { formatIDR } from "@/lib/format";
import { 
  useListAds, 
  useCreateAd, 
  useUpdateAd, 
  useDeleteAd,
  getListAdsQueryKey,
  Ad,
  AdPlatform,
  AdInputPlatform
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

const formSchema = z.object({
  date: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
  platform: z.enum(["Shopee", "TikTok", "Meta", "Google", "Other"] as const),
  campaign: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export default function Ads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  const { data, isLoading } = useListAds(
    { startDate: dateFilter || undefined, limit: 100 },
    { query: { queryKey: getListAdsQueryKey({ startDate: dateFilter || undefined, limit: 100 }) } }
  );

  const createMutation = useCreateAd();
  const updateMutation = useUpdateAd();
  const deleteMutation = useDeleteAd();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      platform: "Shopee",
      campaign: "",
      notes: "",
    },
  });

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    form.reset({
      date: ad.date.split("T")[0],
      amount: ad.amount,
      platform: ad.platform as any,
      campaign: ad.campaign,
      notes: ad.notes,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setEditingAd(null);
    form.reset({
      date: new Date().toISOString().split("T")[0],
      amount: 0,
      platform: "Shopee",
      campaign: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (editingAd) {
      updateMutation.mutate(
        { id: editingAd.id, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdsQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Ad record updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAdsQueryKey() });
            setIsDialogOpen(false);
            toast({ title: "Ad record created" });
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
            queryClient.invalidateQueries({ queryKey: getListAdsQueryKey() });
            toast({ title: "Ad record deleted" });
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
            <h1 className="text-3xl font-bold tracking-tight">Ad Spends</h1>
            <p className="text-muted-foreground">Track advertising expenses across platforms.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Ad Spend</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAd ? "Edit Ad Spend" : "Add Ad Spend"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="platform" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.values(AdPlatform).map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Spend Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="campaign" render={({ field }) => (
                      <FormItem><FormLabel>Campaign</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <span className="text-muted-foreground block mb-1">Preview (Includes 11% fee)</span>
                    <span className="font-medium">{formatIDR(form.watch("amount") * 1.11)}</span>
                  </div>

                  <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingAd ? "Update" : "Save"}
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
                <TableHead>Platform</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Base Spend</TableHead>
                <TableHead className="text-right">Total (w/ 11% fee)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No ad records found</TableCell>
                </TableRow>
              ) : (
                data?.data.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>{new Date(ad.date).toLocaleDateString()}</TableCell>
                    <TableCell>{ad.platform}</TableCell>
                    <TableCell>{ad.campaign || "-"}</TableCell>
                    <TableCell className="text-right">{formatIDR(ad.amount)}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">{formatIDR(ad.totalWithFee)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
