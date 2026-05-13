import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [period, setPeriod] = useState<"7d" | "30d" | "month">("7d");
  
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  
  const { data: trends, isLoading: loadingTrends } = useGetDashboardTrends(
    { period },
    { query: { queryKey: getGetDashboardTrendsQueryKey({ period }) } }
  );

  const { data: activities, isLoading: loadingActivity } = useListActivity(
    { limit: 10 },
    { query: { queryKey: getListActivityQueryKey({ limit: 10 }) } }
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your affiliate business performance.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            title="Today's Profit" 
            value={formatIDR(summary?.todayProfit)} 
            loading={loadingSummary}
            className="border-primary/50 bg-primary/5"
          />
          <SummaryCard 
            title="Today's Revenue" 
            value={formatIDR(summary?.todayRevenue)} 
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Today's Ads Spend" 
            value={formatIDR(summary?.todayAdsWithFee)} 
            description={`Base: ${formatIDR(summary?.todayAds)} + 11% fee`}
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Month Profit Margin" 
            value={formatPercent(summary?.profitMargin)} 
            description={`${formatPercent(summary?.growthRate)} vs last month`}
            loading={loadingSummary} 
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard 
            title="Month Profit" 
            value={formatIDR(summary?.monthProfit)} 
            loading={loadingSummary}
            className="border-primary/50"
          />
          <SummaryCard 
            title="Month Revenue" 
            value={formatIDR(summary?.monthRevenue)} 
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Month Salary Est." 
            value={formatIDR(summary?.monthSalary)} 
            loading={loadingSummary} 
          />
          <SummaryCard 
            title="Month Expenses" 
            value={formatIDR(summary?.monthExpenses)} 
            loading={loadingSummary} 
          />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Performance Trends</CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-[200px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="7d">7D</TabsTrigger>
                  <TabsTrigger value="30d">30D</TabsTrigger>
                  <TabsTrigger value="month">M</TabsTrigger>
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
                      <Line type="monotone" dataKey="ads" name="Ads" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
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
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {(!activities || activities.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
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
