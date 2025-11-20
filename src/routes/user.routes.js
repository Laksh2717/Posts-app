import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  updateUserDetails,
  getUserProfile,
  getUserFriends,
  createPost,
  friendsSuggestion,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  showPendingRequests,
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
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/update-account").post(verifyJWT, updateUserDetails);
router
  .route("/createPost")
  .post(verifyJWT, upload.single("postImage"), createPost);
router.route("/friends-suggestion").get(verifyJWT, friendsSuggestion);
router
  .route("/send-friend-request")
  .post(verifyJWT, upload.none(), sendFriendRequest);
router
  .route("/accept-friend-request")
  .post(verifyJWT, upload.none(), acceptFriendRequest);
router
  .route("/reject-friend-request")
  .post(verifyJWT, upload.none(), rejectFriendRequest);
router.route("/show-pending-requests").get(verifyJWT, showPendingRequests);
router.route("/:username").get(verifyJWT, getUserProfile);
router.route("/:username/friends").get(verifyJWT, getUserFriends);

export default router;
// Hamne verifyjwt middleware use nhi kiya kyuki hamne verifyjwt ka kaam refreshAT ma bhi kiya hai.

// App.post ma jo bich ma likha hai upload.single jsi chij wo middleware hai.

// why post request to /logout and not get ?
// GET requests are intended to be "safe" operations, meaning they should only retrieve data and not change anything on the server. Clicking a link or visiting a URL is a GET request.
// POST requests are used to change the state on the server.
