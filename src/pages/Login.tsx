import LoginForm from "../components/auth/login-form";

export default function Login() {
  return (
    <div className="w-screen h-screen flex justify-center items-center bg-slate-100">
      <div className="w-[470px] p-8 bg-white rounded-xl">
        <img src="./RMS-Logo.png" className="w-32 mb-6" />
        <h2 className="xl:text-xl text-lg font-bold">
          Welcome back to RMS Avisha Enterprices!
        </h2>
        <p className="text-sm opacity-60 w-3/4 mb-6">
          Your One-Stop Tech Repair Shop. Where Price does not compromise
          Quality
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
