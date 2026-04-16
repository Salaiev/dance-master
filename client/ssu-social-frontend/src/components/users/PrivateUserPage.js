import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { getUserInfoAsync } from "../../utilities/decodeJwtAsync";

const DEFAULT_PROFILE_IMAGE =
  "https://ssusocial.s3.amazonaws.com/profilepictures/ProfileIcon.png";

const PrivateUserPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [biography, setBiography] = useState("");
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const BACKEND = process.env.REACT_APP_BACKEND_SERVER_URI;

  const loadUser = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const storedToken =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt") ||
        "";

      setToken(storedToken);

      const userInfo = await getUserInfoAsync();

      if (!userInfo) {
        navigate("/");
        return;
      }

      setUser(userInfo);

      const userId =
        userInfo.id ||
        userInfo.user_id ||
        userInfo._id ||
        userInfo.sub;

      if (!userId) {
        setError("Unable to find logged-in user id.");
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${BACKEND}/user/getUserById/${userId}`
      );

      const data = response.data;

      setUsername(data.username || "");
      setEmail(data.email || "");
      setBiography(data.biography || "");
      setProfileImage(data.profileImage || DEFAULT_PROFILE_IMAGE);
    } catch (err) {
      console.error("Failed to load user:", err);
      setError("Failed to load user information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePassword = () => {
    if (!password && !confirmPassword) return true;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must include at least one letter and one number.");
      return false;
    }

    return true;
  };

  const onFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];

    if (!validImageTypes.includes(file.type)) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const removeSelectedImage = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadProfileImageToS3 = async () => {
    if (!selectedFile || !user) return null;

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const userId =
        user.id || user.user_id || user._id || user.sub;

      if (!userId) {
        throw new Error("Missing user id for upload.");
      }

      const presignResponse = await axios.post(
        `${BACKEND}/uploads/presign`,
        {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          folder: "profiles",
          userId,
        }
      );

      const { uploadUrl, fileUrl } = presignResponse.data;

      if (!uploadUrl || !fileUrl) {
        throw new Error("Upload URL was not returned.");
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image to S3. Status: ${uploadResponse.status}`);
      }

      setProfileImage(fileUrl);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("Profile image uploaded successfully.");
      return fileUrl;
    } catch (err) {
      console.error("Image upload failed:", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to upload profile image."
      );
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!validatePassword()) {
        setSaving(false);
        return;
      }

      if (!token) {
        setError("Missing login token.");
        setSaving(false);
        return;
      }

      let finalProfileImage = profileImage;

      if (selectedFile) {
        const uploadedUrl = await uploadProfileImageToS3();
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        finalProfileImage = uploadedUrl;
      }

      const requestBody = {
        username: username.trim(),
        email: email.trim(),
        biography: biography.trim(),
        profileImage: finalProfileImage,
      };

      if (password.trim()) {
        requestBody.password = password.trim();
      }

      const response = await axios.put(
        `${BACKEND}/user/editUser`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setMessage("Profile updated successfully.");
        setPassword("");
        setConfirmPassword("");
        await loadUser();
      } else {
        setError(response.data?.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to save profile changes."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <h3>Loading profile...</h3>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <p>
          Please <Link to="/">log in</Link> to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: "760px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="m-0">My Profile</h2>
        <Button
          variant="outline-danger"
          onClick={() => setShowLogoutConfirmation(true)}
        >
          Log Out
        </Button>
      </div>

      {message && (
        <div className="alert alert-success" role="alert">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <img
              src={selectedFile ? URL.createObjectURL(selectedFile) : profileImage}
              alt="Profile"
              className="rounded-circle"
              style={{
                width: "140px",
                height: "140px",
                objectFit: "cover",
                border: "1px solid #ddd",
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_PROFILE_IMAGE;
              }}
            />
            <div className="mt-3 d-flex justify-content-center gap-2 flex-wrap">
              <Button variant="dark" onClick={() => setShowUploadModal(true)}>
                Change Picture
              </Button>
              {selectedFile && (
                <Button
                  variant="outline-secondary"
                  onClick={removeSelectedImage}
                >
                  Remove Selection
                </Button>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Biography</label>
            <textarea
              className="form-control"
              rows="4"
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Tell something about yourself"
            />
          </div>

          <hr className="my-4" />

          <h5 className="mb-3">Change Password</h5>

          <div className="mb-3">
            <label className="form-label fw-semibold">New Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank if you do not want to change it"
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">Confirm New Password</label>
            <input
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>

          <div className="d-grid">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Upload Profile Picture</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onFileChange}
            className="form-control"
          />

          {selectedFile && (
            <div className="text-center mt-4">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                style={{
                  width: "130px",
                  height: "130px",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowUploadModal(false)}
          >
            Close
          </Button>
          <Button
            variant="dark"
            onClick={async () => {
              const uploadedUrl = await uploadProfileImageToS3();
              if (uploadedUrl) {
                setShowUploadModal(false);
              }
            }}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showLogoutConfirmation}
        onHide={() => setShowLogoutConfirmation(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Log Out</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to log out?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowLogoutConfirmation(false)}
          >
            No
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PrivateUserPage;