import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { getUserInfoAsync } from "../../utilities/decodeJwtAsync";

const DEFAULT_PROFILE_IMAGE =
  "https://ssusocial.s3.amazonaws.com/profilepictures/ProfileIcon.png";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8f8fb",
    padding: "32px 24px 56px",
  },
  shell: {
    maxWidth: 900,
    margin: "0 auto",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: "#111111",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  logoutBtn: {
    border: "1px solid #ef4444",
    color: "#ef4444",
    background: "#ffffff",
    borderRadius: 12,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  alertSuccess: {
    background: "#e8f7ee",
    color: "#166534",
    border: "1px solid #b7e4c7",
    padding: "14px 16px",
    borderRadius: 10,
    marginBottom: 18,
    fontSize: 14,
  },
  alertError: {
    background: "#fdecec",
    color: "#b42318",
    border: "1px solid #f5c2c7",
    padding: "14px 16px",
    borderRadius: 10,
    marginBottom: 18,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#161616",
    margin: "0 0 14px 0",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #eeeeee",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
    marginBottom: 22,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardHeading: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#202124",
  },
  cardSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: "#6b7280",
  },
  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  },
  photoActionWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  changePhotoBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #d9d9df",
    background: "#ffffff",
    color: "#374151",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  helperText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#2d2d2d",
  },
  input: {
    width: "100%",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    resize: "vertical",
    minHeight: 120,
    boxSizing: "border-box",
  },
  saveBtn: {
    border: "none",
    background: "#8b5cf6",
    color: "#ffffff",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  saveBtnDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  prefRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "12px 0",
  },
  prefTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 4,
  },
  prefText: {
    fontSize: 12,
    color: "#6b7280",
  },
  divider: {
    height: 1,
    background: "#f0f0f0",
    margin: "0",
    border: "none",
  },
  fakeToggleOn: {
    width: 38,
    height: 22,
    borderRadius: 999,
    background: "#8b5cf6",
    position: "relative",
    flexShrink: 0,
  },
  fakeToggleOff: {
    width: 38,
    height: 22,
    borderRadius: 999,
    background: "#d1d5db",
    position: "relative",
    flexShrink: 0,
  },
  toggleKnobRight: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#ffffff",
  },
  toggleKnobLeft: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#ffffff",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    background: "#ffffff",
    borderRadius: 16,
    boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    color: "#6b7280",
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: "16px 20px 20px",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryBtn: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  darkBtn: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dangerBtn: {
    border: "none",
    background: "#ef4444",
    color: "#ffffff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  previewWrap: {
    marginTop: 18,
    textAlign: "center",
  },
  previewImg: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #e5e7eb",
  },
};

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
        throw new Error(
          `Failed to upload image to S3. Status: ${uploadResponse.status}`
        );
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

  const handleSave = async (e) => {
    if (e) e.preventDefault();

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
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <h3>Loading profile...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <p>
              Please <Link to="/">log in</Link> to view your profile.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <h1 style={styles.title}>Settings</h1>
          <button
            type="button"
            style={styles.logoutBtn}
            onClick={() => setShowLogoutConfirmation(true)}
          >
            Log Out
          </button>
        </div>

        {message && <div style={styles.alertSuccess}>{message}</div>}
        {error && <div style={styles.alertError}>{error}</div>}

        <form onSubmit={handleSave}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardHeading}>Profile Information</h2>
              <div style={styles.cardSubtext}>
                Manage your personal details and profile picture.
              </div>
            </div>

            <div style={styles.profileTop}>
              <img
                src={selectedFile ? URL.createObjectURL(selectedFile) : profileImage}
                alt="Profile"
                style={styles.avatar}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = DEFAULT_PROFILE_IMAGE;
                }}
              />

              <div style={styles.photoActionWrap}>
                <button
                  type="button"
                  style={styles.changePhotoBtn}
                  onClick={() => setShowUploadModal(true)}
                >
                  ⬆ Change Photo
                </button>
                <span style={styles.helperText}>JPG, PNG up to 5 MB</span>
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                style={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Biography</label>
              <textarea
                style={styles.textarea}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Tell something about yourself"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank if you do not want to change it"
              />
            </div>

            <div style={{ ...styles.fieldGroup, marginBottom: 20 }}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                style={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.saveBtn,
                ...(saving || uploading ? styles.saveBtnDisabled : {}),
              }}
              disabled={saving || uploading}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardHeading}>Application Preferences</h2>
            <div style={styles.cardSubtext}>
              Customize your app experience.
            </div>
          </div>

          <div style={styles.prefRow}>
            <div>
              <div style={styles.prefTitle}>Email Notifications</div>
              <div style={styles.prefText}>
                Receive email updates about new lessons, challenges, and account activity.
              </div>
            </div>
            <div style={styles.fakeToggleOn}>
              <div style={styles.toggleKnobRight} />
            </div>
          </div>

          <hr style={styles.divider} />

          <div style={styles.prefRow}>
            <div>
              <div style={styles.prefTitle}>Dark Mode</div>
              <div style={styles.prefText}>
                Switch the app theme to a darker aesthetic.
              </div>
            </div>
            <div style={styles.fakeToggleOff}>
              <div style={styles.toggleKnobLeft} />
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Upload Profile Picture</h3>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={onFileChange}
                style={styles.input}
              />

              {selectedFile && (
                <div style={styles.previewWrap}>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    style={styles.previewImg}
                  />
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              {selectedFile && (
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={removeSelectedImage}
                >
                  Remove Selection
                </button>
              )}
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setShowUploadModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                style={styles.darkBtn}
                onClick={async () => {
                  const uploadedUrl = await uploadProfileImageToS3();
                  if (uploadedUrl) {
                    setShowUploadModal(false);
                  }
                }}
                disabled={!selectedFile || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirmation && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: 420 }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Log Out</h3>
              <button
                type="button"
                style={styles.closeBtn}
                onClick={() => setShowLogoutConfirmation(false)}
              >
                ×
              </button>
            </div>

            <div style={styles.modalBody}>
              Are you sure you want to log out?
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setShowLogoutConfirmation(false)}
              >
                No
              </button>
              <button
                type="button"
                style={styles.dangerBtn}
                onClick={handleLogout}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivateUserPage;