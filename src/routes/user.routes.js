import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
); // /api/v1/users/register
router.route("/login").post(upload.none(), loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
// Hamne verifyjwt middleware use nhi kiya kyuki hamne verifyjwt ka kaam refreshAT ma bhi kiya hai.

export default router;

// App.post ma jo bich ma likha hai upload.single jsi chij wo middleware hai.


// why post request to /logout and not get ?
// GET requests are intended to be "safe" operations, meaning they should only retrieve data and not change anything on the server. Clicking a link or visiting a URL is a GET request.
// POST requests are used to change the state on the server.

