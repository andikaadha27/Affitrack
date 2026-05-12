import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Revenues from "@/pages/revenues";
import Ads from "@/pages/ads";
import Expenses from "@/pages/expenses";
import Employees from "@/pages/employees";
import Schedules from "@/pages/schedules";
import Attendance from "@/pages/attendance";
import Salaries from "@/pages/salaries";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/revenues">{() => <ProtectedRoute component={Revenues} />}</Route>
      <Route path="/ads">{() => <ProtectedRoute component={Ads} />}</Route>
      <Route path="/expenses">{() => <ProtectedRoute component={Expenses} />}</Route>
      <Route path="/employees">{() => <ProtectedRoute component={Employees} />}</Route>
      <Route path="/schedules">{() => <ProtectedRoute component={Schedules} />}</Route>
      <Route path="/attendance">{() => <ProtectedRoute component={Attendance} />}</Route>
      <Route path="/salaries">{() => <ProtectedRoute component={Salaries} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
