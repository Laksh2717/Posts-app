import asyncHandler from "../utils/asyncHandler.js";
import {
  isEmpty,
  isPasswordValid,
  isEmailValid,
  isUsernameValid,
} from "../utils/validations.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import User from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";
import Post from "../models/post.models.js";
import Friend from "../models/friend.models.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  // Ho sakta hai koi mobile app use kr rha hai to wo ho sakta hai ki req.body ma RT bheje.

  if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

  try {
    const decodedTokenData = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedTokenData?._id);

    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user?.refreshToken)
      throw new ApiError(401, "Rsfresh token is expired or used");

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export const registerUser = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  const errors = [];

  if (isEmpty(username)) errors.push("username is required");
  if (isEmpty(fullName)) errors.push("fullName is required");
  if (isEmpty(password)) errors.push("password is required");
  if (isEmpty(email)) errors.push("email is required");
  if (!isUsernameValid(username)) errors.push("Invalid username");
  if (!isEmailValid(email)) errors.push("Invalid email");
  if (!isPasswordValid(password))
    errors.push("Password should be of atleast 6 characters");
  if (!avatarLocalPath) errors.push("Avatar file is required");

  if (errors.length > 0) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, errors.join(", "));
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, "User with email or username already exists");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) throw new ApiError(400, "Failed to upload Avatar");

  const user = await User.create({
    fullName,
    email,
    password,
    username,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "something went wrong while registering the user");

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully"
      )
    );
});

export const loginUser = asyncHandler(async (req, res) => {
  // req.body => data => username or email and password
  // find the user
  // password check
  // AT and RT
  // send cookie

  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail)
    throw new ApiError(400, "username or email is required");

  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });

  if (!user) throw new ApiError(404, "user does not exist");

  const isCorrectPassword = await user.isPasswordCorrect(password);
  // Ispasswordcoorect method User pe nhi hai user pe hai, User model pe mongoose k methods hote hai jse findOne etc, and hamare custom methods instances pe hote hai, jse hamne koi find kiya uske baad jo wo return krega wo ek instance hai.

  if (!isCorrectPassword) throw new ApiError(401, "Invalid user credentials");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  // Jo normal cookies hoti hai use frontend se bhi koi bhi modify kr sakta hai, but jse hi hamne httpOnly and secure true krte hai, wese hi ab ye cookies sirf server se bhi modify kr sakte hai frontend se nhi. Ham unhe frontend pe dekh sakte hai modify nhi kr sakte.

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken, user: loggedInUser },
        "User logged in successfully"
      )
    );
  // Ham apiresponse ma access and refresh token kyu bhej rhe hai jab hamne already cookies set krdi hai, yaha pr ham wo case handle kr rhe hai jaha pr user khud apni taraf se unhe store krna chah rha ho, ho sakta hai wo local storage pe store krna chah rha ho, kyuki ho sakta hai wo mobile app bana rha ho, waha pr cookies set nhi hogi, isiliye ye bhejna ek achchi practice hai halaki depend kta hai ki aap kya krna chahte ho.
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: null } },
    { new: true }
  );
  // Jab verifyjwt successful hoga tabhi ham logoutUser pe pahuchenge, to iska matlab ab req.body ma user add ho chuka hai so we can access req.user in logout.

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  // check if newPassword and confirmPassword are same on frontend, then send newPassword to backend.
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) throw new ApiError(400, "old and new passwords are required")
  if (oldPassword === newPassword) throw new ApiError(400, "Both passwords are same")

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found")

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  // The password will be hashed automatically as we wrote the function using Pre-Hook. if u remember we have used if (!this.isModified(password)), but here we are changing password, so if condition will not run and password will get hashed.

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) throw new ApiError(401, "Unauthorized request");

  const user = await User.findById(userId).select("-password -refreshToken")

  if (!user) throw new ApiError(404, "No user found");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Current user fetched successfully"));
});

export const updateUserDetails = asyncHandler(async (req, res) => {
  let { fullName, email } = req.body;
  if (!fullName) fullName = req.user?.fullName;
  if (!email) email = req.user?.email;

  if (!isEmailValid(email)) throw new ApiError(400, "Enter vaid email");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "User details updated successfully"));
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) throw new ApiError(400, "Error while uploading avatar");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Avatar updated successfully"));
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image file is missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading cover image");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Cover image updated successfully"));
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "username is missing");

  const currentUserId = req.user?._id;
  const currentUserObjectId = new mongoose.Types.ObjectId(currentUserId);

  if (!currentUserId) throw new ApiError(401, "Unauthorized request");

  const profile = await User.aggregate([
    {
      $match: { username },
    },
    {
      $addFields: {
        isMyProfile: {
          $cond: {
            if: { $eq: ["$_id", currentUserObjectId] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $lookup: {
        from: "friends",
        let: {
          userId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$sender", "$$userId"] },
                      { $eq: ["$receiver", currentUserObjectId] },
                      {
                        $or: [
                          { $eq: ["$status", "accepted"] },
                          { $eq: ["$status", "pending"] },
                        ],
                      },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$sender", currentUserObjectId] },
                      { $eq: ["$receiver", "$$userId"] },
                      {
                        $or: [
                          { $eq: ["$status", "accepted"] },
                          { $eq: ["$status", "pending"] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "friendship",  // array of objects
      },
    },
    {
      $addFields: {
        friendship: {
          $first: "$friendship",  // friendship = friendship[0]. array -> object
        },
      },
    },
    {
      $addFields: {
        isFriend: {
          $cond: {
            if: { $eq: ["$friendship.status", "accepted"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $addFields: {
        sentPendingRequest: {
          $cond: {
            if: {
              $and: [
                { $eq: ["$friendship.status", "pending"] },
                { $eq: ["$friendship.sender", currentUserObjectId] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $addFields: {
        receivedPendingRequest: {
          $cond: {
            if: {
              $and: [
                { $eq: ["$friendship.status", "pending"] },
                { $eq: ["$friendship.receiver", currentUserObjectId] },
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "owner",
        as: "posts",
      },
    },
    {
      $addFields: {
        posts: {
          $cond: {
            if: {
              $or: [
                { $eq: ["$isMyProfile", true] },
                { $eq: ["$isFriend", true] },
              ],
            },
            then: "$posts",
            else: [],
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        totalPosts: 1,
        totalFriends: 1,
        posts: 1,
        isFriend: 1,
        isMyProfile: 1,
        sentPendingRequest: 1,
        receivedPendingRequest: 1,
      },
    },
  ]);

  if (!profile.length) throw new ApiError(404, "User profile does not exist");

  return res
    .status(200)
    .json(
      new ApiResponse(200, profile[0], "User profile fetched successfully")
    );
});

export const getUserFriends = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) throw new ApiError(400, "username is missing");

  const currentUsername = req.user?.username;

  if (!currentUsername) throw new ApiError(401, "Unauthorized request");

  const currentUserObjectId = new mongoose.Types.ObjectId(req.user._id);

  const friends = await User.aggregate([
    {
      $match: { username },
    },
    {
      $addFields: {
        isMyProfile: {
          $eq: ["$username", currentUsername],
        },
      },
    },
    {
      $lookup: {
        from: "friends",
        let: {
          userId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$sender", "$$userId"] },
                      { $eq: ["$status", "accepted"] },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$receiver", "$$userId"] },
                      { $eq: ["$status", "accepted"] },
                    ],
                  },
                ],
              },
            },
          },
          // Optimization: Project only needed fields to save memory during lookup
          {
            $project: {
              sender: 1,
              receiver: 1,
            },
          },
        ],
        as: "friends",
      },
    },
    {
      $addFields: {
        isFriend: {
          $cond: {
            if: {
              $or: [
                // { $in: ["$_id", "$friends.sender"] },
                // { $in: ["$_id", "$friends.receiver"] },
                { $in: [currentUserObjectId, "$friends.sender"] },
                { $in: [currentUserObjectId, "$friends.receiver"] },

                // this is a silent error, if you will not use objectId, then it will be false as both will be false in or operator, because a string and oobject id can not be compared, so check twice whenever using ids.

                // also it is a lot of confusion that what to use when, _id or current userobjectid.... so always see which document i have, _id is the current document id and currentuserid is logged in user id, so always think which user id do i need...

                // you can see first i used _id, meaning the current document id and then it didnt work as expected, so then i used currentuserid, then it worked properly. it is because of logical error. you can think about that error. 
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $addFields: {
        friends: {
          $map: {
            input: "$friends",
            as: "friend",
            in: {
              $cond: {
                if: { $eq: ["$$friend.sender", "$_id"] },
                then: "$$friend.receiver",
                else: "$$friend.sender",
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        friends: {
          $cond: {
            if: { $or: ["$isFriend", "$isMyProfile"] },
            then: "$friends", // Keep the IDs
            else: [], // Wipe them so that in next pipeline we can save lookup.
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "friends",
        foreignField: "_id",
        as: "friends",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        friends: 1,
        isMyProfile: 1,
        isFriend: 1,
      },
    },
  ]);

  if (!friends.length) throw new ApiError(404, "User not found");

  const userData = friends[0];

  if (!userData.isMyProfile && !userData.isFriend)
    throw new ApiError(
      403,
      "You should be friend of the user to see their friends"
    );

  if (!userData.friends.length)
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          friends: [],
          isMyProfile: userData.isMyProfile,
          isFriend: userData.isFriend,
        },
        "No friends found"
      )
    );

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "User's friends fetched successfully")
    );
});

export const createPost = asyncHandler(async (req, res) => {
  const currentUserId = req.user?._id;
  const { title, content } = req.body;
  const postImageLocalPath = req.file?.path;

  if (!currentUserId) throw new ApiError(401, "Unauthorized request");

  if (!title || !content)
    throw new ApiError(400, "Title and content are required");

  let postImageUrl = "";

  if (postImageLocalPath) {
    try {
      const postImage = await uploadOnCloudinary(postImageLocalPath);

      if (!postImage?.url) {
        throw new ApiError(400, "Error while uploading post image");
      }

      postImageUrl = postImage.url;
    } catch {
      fs.unlinkSync(postImageLocalPath);
    }
  }

  const post = await Post.create({
    title,
    content,
    image: postImageUrl,
    owner: currentUserId,
  });

  if (!post)
    throw new ApiError(500, "Something went wrong while creating post");

  return res
    .status(201)
    .json(new ApiResponse(201, post, "Post created successfully"));
});

export const friendsSuggestion = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user?._id;

  if (!loggedInUserId) throw new ApiError(401, "Unauthorized request");

  const exclusions = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      },
    },
    {
      $lookup: {
        from: "friends",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  {
                    $and: [
                      { $eq: ["$sender", "$$userId"] },
                      {
                        $or: [
                          { $eq: ["$status", "accepted"] },
                          { $eq: ["$status", "pending"] },
                        ],
                      },
                    ],
                  },
                  {
                    $and: [
                      { $eq: ["$receiver", "$$userId"] },
                      {
                        $or: [
                          { $eq: ["$status", "accepted"] },
                          { $eq: ["$status", "pending"] },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "exclusions",
      },
    },
    {
      $addFields: {
        exclusions: {
          $map: {
            input: "$exclusions",
            as: "exclusion",
            in: {
              $cond: {
                if: { $eq: ["$$exclusion.sender", "$_id"] },
                then: "$$exclusion.receiver",
                else: "$$exclusion.sender",
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        allExclusions: {
          $concatArrays: ["$exclusions", ["$_id"]],
        },
      },
    },
    {
      $project: {
        allExclusions: 1,
      },
    },
  ]);

  // If user doesn't exist
  if (!exclusions.length) throw new ApiError(404, "User not found");

  const allExclusions = exclusions[0]?.allExclusions || [];

  const suggestedFriends = await User.aggregate([
    {
      $match: {
        _id: { $nin: allExclusions },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 20,
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
      },
    },
  ]);

  if (!suggestedFriends.length)
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { suggestedFriends: [] },
          "No suggestions available at the moment"
        )
      );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { suggestedFriends },
        "Friend suggestions fetched successfully"
      )
    );
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const sender = req.user?._id;
  const receiver = req.body?.receiverId;

  if (!sender) throw new ApiError(401, "Unauthorized request");
  if (!receiver) throw new ApiError(400, "Receiver id is required");

  const friendRequest = await Friend.create({
    sender,
    receiver,
    status: "pending",
  });

  const sentRequest = await Friend.findById(friendRequest._id);

  if (!sentRequest) throw new ApiError(500, "Failed to send friend request");

  return res
    .status(200)
    .json(
      new ApiResponse(200, sentRequest, "Friend request sent successfully")
    );
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const receiver = req.user?._id;
  const sender = req.body?.senderId;

  if (!receiver) throw new ApiError(401, "Unauthorized request");
  if (!sender) throw new ApiError(400, "senderId is required");

  const friendRequest = await Friend.findOneAndUpdate(
    { receiver, sender },
    { status: "accepted" },
    { new: true }
  );

  const acceptedFriendRequest = await Friend.findById(friendRequest._id);

  if (!acceptedFriendRequest)
    throw new ApiError(500, "Error while accepting friend request");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        acceptedFriendRequest,
        "Friend request accepted successfully"
      )
    );
});

export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const receiver = req.user?._id;
  const sender = req.body?.senderId;

  if (!receiver) throw new ApiError(401, "Unauthorized request");
  if (!sender) throw new ApiError(400, "senderId is required");

  const friendRequest = await Friend.findOneAndUpdate(
    { receiver, sender },
    { status: "rejected" },
    { new: true }
  );

  const rejectedFriendRequest = await Friend.findById(friendRequest._id);

  if (!rejectedFriendRequest)
    throw new ApiError(500, "Error while rejecting friend request");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        rejectedFriendRequest,
        "Friend request rejected successfully"
      )
    );
});

export const showPendingRequests = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user?._id;

  if (!loggedInUserId) throw new ApiError(401, "Unauthorized request");

  const pendingRequests = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(loggedInUserId),
      },
    },
    {
      $lookup: {
        from: "friends",
        let: {
          userId: "$_id",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$receiver", "$$userId"] },
                  { $eq: ["$status", "pending"] },
                ],
              },
            },
          },
        ],
        as: "pendingRequests",
      },
    },
    {
      $addFields: {
        pendingRequests: {
          $map: {
            input: "$pendingRequests",
            as: "pr",
            in: "$$pr.sender",
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "pendingRequests",
        foreignField: "_id",
        as: "pendingRequests",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        pendingRequests: 1,
      },
    },
  ]);

  // If user doesn't exist
  if (!pendingRequests.length) throw new ApiError(404, "User not found");

  const userData = pendingRequests[0];

  // If no pending requests, return empty array with consistent structure
  if (!userData.pendingRequests.length)
    return res
      .status(200)
      .json(
        new ApiResponse(200, { pendingRequests: [] }, "No pending requests")
      );

  return res
    .status(200)
    .json(
      new ApiResponse(200, userData, "Pending requests fetched successfully")
    );
});
