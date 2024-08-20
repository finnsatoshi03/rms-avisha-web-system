interface OverviewCardProps {
    label: string;
    value: string | number;
    description?: string;
  }
  
  export default function OverviewCard({ label, value, description }: OverviewCardProps) {
    return (
      <div className="border rounded-lg px-3 py-2.5">
        <h1 className="text-xs opacity-60">{label}</h1>
        <p className="text-xl font-bold">{value}</p>
        {description && <p className="mt-2 text-xs">{description}</p>}
      </div>
    );
  }
  