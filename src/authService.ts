// ponytail: Service otentikasi
// Catatan: Hashing ini terjadi di sisi klien dan hanya sebagai pengamanan dasar.
export const hashPassword = async (password: string): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const validateLogin = async (
  inputUser: string,
  inputPass: string,
  superUser: string,
  superPass: string,
  usersList: any[]
): Promise<{ success: boolean; isSuperadmin: boolean; matchedUser: any | null }> => {
  const hashedInputPass = await hashPassword(inputPass.trim());

  // Check Superadmin
  const isSuperadmin =
    inputUser === superUser.trim().toLowerCase() && hashedInputPass === superPass.trim();

  // Check Team Members
  const matchedUser = usersList.find(
    (u) =>
      u.email && u.email.trim().toLowerCase() === inputUser &&
      u.pin && u.pin.trim() === hashedInputPass
  );

  if (isSuperadmin || matchedUser) {
    return {
      success: true,
      isSuperadmin,
      matchedUser: matchedUser || null,
    };
  } else {
    return {
      success: false,
      isSuperadmin: false,
      matchedUser: null,
    };
  }
};
