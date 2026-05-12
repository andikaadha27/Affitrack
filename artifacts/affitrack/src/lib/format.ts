export function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
