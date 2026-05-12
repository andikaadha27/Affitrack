import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Wallet, 
  Megaphone, 
  Receipt, 
  Users, 
  CalendarDays, 
  Clock, 
  Banknote,
  LogOut,
  Menu,
  Moon,
  Sun
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "next-themes";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Revenues", href: "/revenues", icon: Wallet },
  { name: "Ads", href: "/ads", icon: Megaphone },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Schedules", href: "/schedules", icon: CalendarDays },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Salaries", href: "/salaries", icon: Banknote },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <span
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-background">
      {/* Mobile header */}
      <div className="flex h-16 items-center justify-between border-b px-4 lg:hidden sticky top-0 bg-background z-10">
        <span className="text-xl font-bold text-primary">AffiTrack</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <span className="text-xl font-bold text-primary">AffiTrack</span>
              </div>
              <ScrollArea className="flex-1 py-4">
                <nav className="space-y-1 px-4">
                  <NavLinks />
                </nav>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-col border-r bg-card fixed h-screen">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold text-primary">AffiTrack</span>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-4">
            <NavLinks />
          </nav>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
