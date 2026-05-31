interface Props {
  label: string;
  value: string;
  subtitle?: string;
  positive?: boolean;
  negative?: boolean;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, subtitle, positive, negative, icon }: Props) {
  const color = positive ? '#22c55e' : negative ? '#ef4444' : '#e2e8ff';
  return (
    <div className="rounded-xl p-4" style={{ background: '#12151f', border: '1px solid #252b40' }}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span style={{ color: '#8892b8' }}>{icon}</span>}
        <span className="text-[11px] font-medium" style={{ color: '#8892b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="text-[22px] font-semibold leading-none" style={{ color }}>{value}</div>
      {subtitle && <div className="text-[11px] mt-1.5" style={{ color: '#4a5270' }}>{subtitle}</div>}
    </div>
  );
}
