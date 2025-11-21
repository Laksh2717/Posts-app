# Remaining issues : 

1. sendFriendRequest controller :

- No duplicate check: User can send multiple friend requests to the same person. Should check if a request already exists (pending/accepted).

- Self-request: User can send a friend request to themselves. Add check: if (sender === receiver).

- Invalid receiver: No validation if the receiver exists in the database.

- Unnecessary double query: You create the request, then immediately query it again with findById. Just return friendRequest directly.


2. acceptFriendRequest/rejectFriendRequest controller :

- No validation: Doesn't check if the friend request actually exists before updating. If no document matches, friendRequest will be null, and findById(null) will cause an error.

- Unnecessary double query: Same as above - findOneAndUpdate with {new: true} already returns the updated document.

- Wrong status check: Should verify the request status is "pending" before accepting. Currently can "accept" an already accepted or rejected request.


3. getUserProfile controller :

- Posts lookup inefficiency: You're fetching ALL posts without pagination. If a user has 1000 posts, all will be loaded. Consider adding $limit or pagination.


4. updateUserDetails controller :

- Partial update logic unclear: If user only wants to update fullName, they still need to send email (or it uses old email)? Consider allowing partial updates properly.


5. updateUserAvatar/updateUserCoverImage controller : 

- No old image cleanup: Should delete the old images from Cloudinary to avoid storage bloat.

- File not cleaned on error: If Cloudinary upload fails, local file remains on server.