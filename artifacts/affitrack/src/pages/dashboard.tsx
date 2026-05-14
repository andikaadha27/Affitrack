import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useGetDashboardSummary, 
  useGetDashboardTrends, 
  useListActivity,
  getGetDashboardSummaryQueryKey,
  getGetDashboardTrendsQueryKey,
  getListActivityQueryKey
} from "@workspace/api-client-react";
import { formatIDR, formatPercent } from "@/lib/format";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

function toLocalDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateStr: string) {
  const today = toLocalDateString(new Date());
  const yesterday = toLocalDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return "Hari Ini";
  if (dateStr === yesterday) return "Kemarin";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const today = toLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState<"7d" | "30d" | "month">("7d");
  
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary(
    { date: selectedDate },
    { query: { queryKey: getGetDashboardSummaryQueryKey({ date: selectedDate }) } }
  );
  
  const { data: trends, isLoading: loadingTrends } = useGetDashboardTrends(
    { period },
    { query: { queryKey: getGetDashboardTrendsQueryKey({ period }) } }
  );

  const { data: activities, isLoading: loadingActivity } = useListActivity(
    { limit: 10 },
    { query: { queryKey: getListActivityQueryKey({ limit: 10 }) } }
  );

  function prevDay() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalDateString(d));
  }

  function nextDay() {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    const next = toLocalDateString(d);
    if (next <= today) setSelectedDate(next);
  }

  const isToday = selectedDate === today;
  const dateLabel = formatDateLabel(selectedDate);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview performa bisnis affiliate kamu.</p>
        </div>

        {/* Daily date navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5 px-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold min-w-[90px] text-center">{dateLabel}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextDay} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="text-sm border rounded-md px-2 py-1 bg-background text-foreground h-9"
          />
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>
              Kembali ke Hari Ini
            </Button>
          )}
        </div>

        {/* Daily summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <SummaryCard 
            title={`Profit ${dateLabel}`}
            value={formatIDR(summary?.todayProfit)} 
            description="Actual Transfer - Iklan - Gaji"
            loading={loadingSummary}
            className="border-primary/50 bg-primary/5"
          />
          <SummaryCard 
            title="Revenue (Actual Transfer)"
            value={formatIDR(summary?.todayActualRevenue)} 
            description={`Revenue: ${formatIDR(summary?.todayRevenue)}`}
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Iklan"
            value={formatIDR(summary?.todayAdsWithFee)} 
            description={`Base: ${formatIDR(summary?.todayAds)} + 11%`}
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Gaji Karyawan"
            value={formatIDR(summary?.todaySalary)} 
            description="Karyawan hadir"
            loading={loadingSummary}
          />
          <SummaryCard 
            title="Profit Margin Bulan Ini" 
            value={formatPercent(summary?.profitMargin)} 
            description={`${formatPercent(summary?.growthRate)} vs bulan lalu`}
            loading={loadingSummary} 
          />
        </div>

        {/* Monthly summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            title="Profit Bulan Ini" 
            value={formatIDR(summary?.monthProfit)} 
            loading={loadingSummary}
            className="border-primary/50"
          />
          <SummaryCard 
            title="Revenue Bulan Ini" 
            value={formatIDR(summary?.monthRevenue)} 
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Gaji Bulan Ini" 
            value={formatIDR(summary?.monthSalary)} 
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Pengeluaran Bulan Ini" 
            value={formatIDR(summary?.monthExpenses)} 
            loading={loadingSummary} 
          />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Tren Performa</CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-[200px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="7d">7H</TabsTrigger>
                  <TabsTrigger value="30d">30H</TabsTrigger>
                  <TabsTrigger value="month">Bulan</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {loadingTrends ? (
                <Skeleton className="w-full h-[300px]" />
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `Rp ${value / 1000000}M`}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatIDR(value)}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="ads" name="Iklan" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {activities?.map((item) => (
                    <div key={item.id} className="flex flex-col gap-1 border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">{item.description}</span>
                        {item.amount != null && (
                          <span className={`text-sm font-bold ${
                            item.type === 'revenue' ? 'text-primary' : 
                            ['ad', 'expense', 'salary'].includes(item.type) ? 'text-destructive' : ''
                          }`}>
                            {['ad', 'expense', 'salary'].includes(item.type) ? '-' : '+'}{formatIDR(item.amount)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span className="capitalize">{item.type}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada aktivitas</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function SummaryCard({ title, value, description, loading, className = "" }: { 
  title: string; 
  value: string; 
  description?: string;
  loading: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading ? (
          <>
            <Skeleton className="h-7 w-28 mb-1" />
            {description && <Skeleton className="h-4 w-32" />}
          </>
        ) : (
          <>
            <p className="text-sm font-bold font-mono whitespace-nowrap leading-tight">
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
