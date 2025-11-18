export const isEmpty = (field) => {
  if (typeof field === "string") {
    if (field?.trim() === "") return true;
    else return false;
  } 
  else if (!field) return true;
  else return false;
};

export const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isPasswordValid = (password) => password.length >= 6;

export const isUsernameValid = (username) => !(username.includes(" "))

