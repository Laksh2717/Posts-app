import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// Kai baar kya hoga ki parameters ma kuch use nhi ho rha hai , jse verifyjwt ma res to use ho hi nhi rha hai to use underscore se replace kr do. Ye production grade thing hai.
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Unauthorized request");

    const decodedTokenData = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    req.user = decodedTokenData;
    next();
  } 
  catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

// Ab ham ek auth ka middleware likhenge, ye middleware kya krega?  hame batayega ki user hai ya nhi hai i.e. user logges in hai ya nhi.

// To ab ham check krenge ki cookies ma AT hai ya nhi, and ha asa bhi ho sakta hai ki ham mobile app use kr rhe ho to waha pr cookies ka concept nhi hota, to agar waha se request aati hai to ham headers ma Authorization name se ek header ma AT bhejte hai wo bhi ek special syntax ma : "Bearer <AT>", to hame sirf AT chaiye isliye ham baki ka part hata denge.

