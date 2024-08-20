import UpdateUserDataForm from "../components/auth/update-user-data-form";
import UpdateUserPassForm from "../components/auth/update-user-pass-form";
import HeaderText from "../components/ui/headerText";

export default function Account() {
  return (
    <div>
      <HeaderText>Update your Account</HeaderText>
      <div className="p-8 rounded-xl mt-2 bg-white shadow-md mb-8">
        <UpdateUserDataForm />
      </div>
      <HeaderText>Update your Password</HeaderText>
      <div className="p-8 rounded-xl mt-2 bg-white shadow-md">
        <UpdateUserPassForm />
      </div>
    </div>
  );
}
