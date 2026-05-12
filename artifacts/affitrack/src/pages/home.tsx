import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ArrowRight, BarChart3, Users, Receipt, Calendar } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl font-bold text-primary">AffiTrack</div>
          <div className="flex gap-4">
            {user ? (
              <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocation("/login")}>Login</Button>
                <Button onClick={() => setLocation("/register")}>Mulai Gratis</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-24 px-4 text-center max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6">
            Satu Angka Untuk <br/> <span className="text-primary">Profit Anda Hari Ini</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            AffiTrack adalah instrumen presisi untuk operator bisnis afiliasi. Pantau revenue, biaya iklan, dan tim dalam satu terminal super cepat.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="text-lg px-8" onClick={() => setLocation("/register")}>
              Mulai Gratis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => setLocation("/login")}>
              Login Dashboard
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-muted/50 border-y">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Dirancang Khusus untuk Pemain Afiliasi</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <BarChart3 className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Real-time Profit</h3>
                <p className="text-muted-foreground">Ketahui margin keuntungan bersih Anda setiap hari tanpa perlu rekap Excel manual.</p>
              </div>
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <Receipt className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ad Spend Tracking</h3>
                <p className="text-muted-foreground">Pantau pengeluaran iklan di Shopee, TikTok, Meta & Google dengan kalkulasi fee otomatis.</p>
              </div>
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <Users className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Manajemen Tim</h3>
                <p className="text-muted-foreground">Kelola karyawan harian dan bulanan dengan perhitungan gaji yang transparan.</p>
              </div>
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <Calendar className="h-10 w-10 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Jadwal & Absensi</h3>
                <p className="text-muted-foreground">Sistem shift dan kehadiran terintegrasi langsung dengan kalkulasi payroll.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Berhenti Menebak Margin Anda</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Bergabunglah dengan ratusan affiliate marketer yang sudah beralih ke AffiTrack.
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => setLocation("/register")}>
            Daftar Sekarang
          </Button>
        </section>
      </main>

      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AffiTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
