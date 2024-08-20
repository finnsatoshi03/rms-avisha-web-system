import { UserAttributes } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function signup({
  fullname,
  email,
  password,
  role,
}: {
  fullname: string;
  email: string;
  password: string;
  role: string;
}) {
  // Save the current session before signing up a new user
  const { data: savedSessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error saving current session:", sessionError);
    throw new Error("Unable to save current session.");
  }

  // Perform the sign-up operation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        fullname,
        role,
        avatar: "",
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // If there was a previously authenticated user, restore their session
  if (savedSessionData && savedSessionData.session) {
    const { error: restoreError } = await supabase.auth.setSession(
      savedSessionData.session
    );
    if (restoreError) {
      console.error("Error restoring previous session:", restoreError);
      throw new Error("Unable to restore previous session.");
    }
  }

  return data;
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCurrentUser() {
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session) return null;

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  const user = data?.user;
  return user;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function updateUser({
  password,
  fullname,
  avatar,
}: {
  password: string;
  fullname: string;
  avatar: string;
}) {
  let updateData: UserAttributes = {};
  if (password) updateData = { password };
  if (fullname)
    updateData = {
      data: { fullname },
    };

  const { data, error } = await supabase.auth.updateUser(updateData);

  if (error) throw new Error(error.message);
  if (!avatar) return data;

  const filename = `avatar-${data?.user.id}-${Math.random()}`;

  const { error: storageError } = await supabase.storage
    .from("avatars")
    .upload(filename, avatar);

  if (storageError) throw new Error(storageError.message);

  const { data: updatedUser, error: urlError } = await supabase.auth.updateUser(
    {
      data: {
        avatar: `${
          import.meta.env.VITE_SUPABASE_URL
        }/storage/v1/object/public/avatars/${filename}`,
      },
    }
  );

  if (urlError) throw new Error(urlError.message);
  return updatedUser;
}
