export default function HeaderText({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
      {children}
    </h1>
  );
}
