import asyncHandler from "../utils/asyncHandler.js";
import {
  isEmpty,
  isPasswordValid,
  isEmailValid,
} from "../utils/validations.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import User from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import fs from "fs";
import jwt from "jsonwebtoken";

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

// AT and RT ka bas itna sa kaam hai ki user ko baar baar apna email and password na dena pade. To AT jse hi expire hoga, uske baad aapko phir se email password daal k apna AT refresh krna padega. Baadme organizations ne socha ki ham ek nhi 2 tokens use krenge. Ham ek token ko kahi store nhi krenge, sirf user ko bhej denge, and ham doosra token bhi banayenge jise ham session storage ya RT bolte hai and ham use user ko bhi bhejenge and db ma bhi rkhenge, to ab jab user ka AT expire hoga, wese hi phir authorized pages pe 401 request aayegi, to ab frontend wale log kya kr sakte hai ki jse hi user ko 401 request aaye wese hi user ko ye bolne ki jagah ki wapas login kro, ham code likhenge ki ek endpoint hit kro and apna AT refresh kra lo. Ab ye naya token kse milega, ham us request ma RT access krenge, phir ham us RT ko verify krenge, agar wo same ho to phir ham naye tokens generate krke phir se session start krte hai i.e. new cookies bhejte hai. And generally AT and RT dono hi naye generate krke bhejte hai.

export const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend.
  // data validation
  // check if user already exists.
  // check for images : avatar required.
  // upload them to cloudinary.
  // create user object.
  // now send data to frontend after removing password and RT field.
  // check for user creation
  // return that user

  const { username, fullName, email, password } = req.body;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // we get access to req.files due to multer middleware which we added in our route.

  const errors = [];

  if (isEmpty(username)) errors.push("username is required");
  if (isEmpty(fullName)) errors.push("fullName is required");
  if (isEmpty(password)) errors.push("password is required");
  if (isEmpty(email)) errors.push("email is required");
  if (!isEmailValid(email)) errors.push("Invalid email");
  if (!isPasswordValid(password))
    errors.push("Password should be of atleast 6 characters");
  if (!avatarLocalPath) errors.push("Avatar file is required");

  if (errors.length > 0) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, errors.join(", "));
  }
  // when a user sends empty request, errors are thrown but if he had uploaded image then it will stay in fs, as cloudinary code never run and unlink does not happen.

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath);
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath);
    throw new ApiError(400, "User with email or username already exists");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  // this will return complete resonse object and not url.
  // if coverImageLocalPath is null or undefined, then this method will return null as we wrote in the uploadOnCloudinary function.

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

// note that we are returning data in this post request which is generally meant to save some data. why ??

// When you create a user, your database (e.g., MongoDB) generates a unique _id for that new user. The frontend (your web or mobile app) does not know this ID until the server sends it back. Without this ID, the frontend can't do anything else with that user, such as: Navigate to the new user's profile page (e.g., /profile/60f8...) or Send a request to update this specific user's details or Store the new user's full data in its global state (like in Redux or React Context).

// so if we will not return this data here, we will have to make an extra call to get request after creating the user to get its information.

// in postman, while checking code, Body se ham form data bhi bhej sakte hai, ham x-form-data bhi sakte hai jo ki urlencoded hai, lekin is urlencoded ma ham files nhi bhej sakte, ham yaha raw data bhejenge, and raw ma bhi json. Ab ye raw json ma bhi files nhi bhej sakte, isliye jab files bhejni ho tab form data use kro.

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

// Jab tak aapke paas access token hai, tab tak aap koi bhi feature, jaha pe aapki authentication ki requirement hai, waha pe aap access kr sakte ho us resource ko. Example : har kisi ko file upload to nhi krne diya jaa sakta server pe, to let say ki aap authenticated ho login ho, to to aap kr lo, lekin agar login session 15 mins ma hi expire ho gya, security reasons ki vajah se, to phir se 15 min baad aapko login krna padega, to isi point pe aata hai refresh token, to ye refresh token ha db ma bhi store krte hai and user ko bhi dete hai, user ko ham validate access token se hi krte hai, lekin ab use hr baar password daalne ki jarurat nhi padti, agar aapke paas refresh token hai, to ham us refresh token ko apne db k refresh token se match krenge, agar wo same hue, to ham user ko naya access token de denge.

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  // check if newPassword and confirmPassword are same on frontend, then send newPassword to backend.
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
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
  const user = await User.findById(req.user?._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Current user fetched successfully"));
});

export const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!isEmailValid(email)) throw new ApiError(400, "Enter vaid email");
  if (!fullName) fullName = req.user?.fullName;
  if (!email) email = req.user?.email;

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

// Kahi pr bhi koi file update kr rhe hai na to uske alag controllers rkhna alag endpoints rkhna, ye jyada achcha rhta hai user sirf apni image update krna chahta hai pura user wapas save krte hai to text data bhi baar baar jaata hai to isse kafi congestion kam hota hai network ma.

// Ab file update ma middlewares ka dhyan rkhna padta hai, pehla middleware ham multer use krenge taki user ki uploaded file hame mil paaye, phir hame check krna hoga ki user logged in to hai, to verifyjwt bhi use hoga.