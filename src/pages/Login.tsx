import LoginForm from "../components/auth/login-form";

export default function Login() {
  return (
    <div className="relative w-screen h-screen flex justify-center items-center overflow-hidden bg-background">
      {/* Soft brand backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-primaryRed/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -left-32 h-[26rem] w-[26rem] rounded-full bg-primaryRed/5 blur-3xl"
      />

      <div className="relative w-[470px] max-w-[92vw] p-8 bg-card border border-border rounded-2xl shadow-card-hover animate-fade-up">
        <img src="./RMS-Logo.png" className="w-32 mb-6" alt="RMS Avisha logo" />
        <h2 className="font-display xl:text-2xl text-xl font-bold tracking-tight">
          Welcome back to RMS Avisha Enterprises!
        </h2>
        <p className="text-sm text-muted-foreground w-3/4 mb-6">
          Your One-Stop Tech Repair Shop. Where Price does not compromise
          Quality
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
