export default function HeaderText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
      {children}
    </h1>
  );
}
