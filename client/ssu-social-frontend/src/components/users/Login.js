import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import getUserInfo from "../../utilities/decodeJwt";

const bgImages = ["/dance1.jpg", "/dance2.jpg", "/dance3.jpg", "/dance4.jpg"];
const sideImages = ["/dance2.jpg", "/dance3.jpg", "/dance4.jpg", "/dance1.jpg"];

const PRIMARY_COLOR = "#622A0F";
const url = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/login`;

const Login = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [light, setLight] = useState(false);
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [bgText, setBgText] = useState("Light Mode");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  const [fieldErrors, setFieldErrors] = useState({ username: "", password: "" });

  const labelStyling = {
    color: "#1f2937",
    fontWeight: 700,
    textDecoration: "none",
    marginBottom: 6,
  };

  const inputBaseStyle = {
    borderRadius: 12,
    padding: "12px 14px",
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.03)",
  };

  const buttonStyling = {
    background: "linear-gradient(135deg, #622A0F, #8B3E18)",
    border: "none",
    color: "white",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 700,
    boxShadow: "0 12px 30px rgba(98, 42, 15, 0.25)",
    width: "100%",
  };

  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
    setFieldErrors({ ...fieldErrors, [input.name]: "" });
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  // ✅ Fix: initialize user from stored accessToken (not from `user`)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const obj = token ? getUserInfo(token) : null; // decodeJwt should accept token
    setUser(obj);

    if (light) {
      setBgColor("white");
      setBgText("Dark mode");
    } else {
      setBgColor("#FFFFFF");
      setBgText("Light mode");
    }
  }, [light]);

  useEffect(() => {
    const slideshowInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);

    return () => clearInterval(slideshowInterval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFieldErrors({ username: "", password: "" });
    setError("");

    let errors = {};
    if (!data.username) errors.username = "Username is required.";
    if (!data.password) errors.password = "Password is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);

      const { data: res } = await axios.post(url, data);

      const { accessToken, refreshToken, user: userFromApi } = res;

      // ✅ store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // ✅ store role for admin UI
      if (userFromApi?.role) localStorage.setItem("userRole", userFromApi.role);

      // ✅ optional: store user basics (useful later)
      if (userFromApi?.id) localStorage.setItem("userId", userFromApi.id);
      if (userFromApi?.username) localStorage.setItem("username", userFromApi.username);
      if (userFromApi?.email) localStorage.setItem("email", userFromApi.email);

      // set local user state so redirect check works immediately
      setUser(userFromApi);

      navigate("/dance-master");
    } catch (error) {
      if (error.response) {
        setFieldErrors({ ...fieldErrors, password: "Invalid username or password." });
      } else {
        setFieldErrors({ ...fieldErrors, password: `${error.message}. Unable to reach the server.` });
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ If already logged in, go straight to Dance Master (use effect to avoid render-loop)
  useEffect(() => {
    if (user) navigate("/dance-master");
  }, [user, navigate]);

  const pageStyle = {
    minHeight: "100vh",
    backgroundImage: `url(${bgImages[currentImageIndex]})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    cursor: loading ? "wait" : "auto",
  };

  const overlayStyle = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.62)",
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.93)",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 30px 80px rgba(0,0,0,0.40)",
    border: "1px solid rgba(255,255,255,0.5)",
  };

  const sideImageWrap = {
    height: "100%",
    overflow: "hidden",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  };

  return (
    <section className="vh-100" style={pageStyle}>
      <div style={overlayStyle} />

      <div className="container-fluid h-custom vh-100" style={{ position: "relative", zIndex: 1 }}>
        <div className="row d-flex justify-content-center align-items-center h-100">
          <div className="col-md-8 col-lg-6 col-xl-4 offset-xl-1">
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <img src="/dance-logo.png" alt="Dance Master" style={{ width: 36, height: 36 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Dance Master</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Log in to continue</div>
                </div>
              </div>

              <Form>
                <Form.Group className="mb-3" controlId="formBasicEmail">
                  <Form.Label style={labelStyling}>User Name</Form.Label>
                  <Form.Control
                    type="username"
                    name="username"
                    onChange={handleChange}
                    placeholder="Enter username"
                    isInvalid={!!fieldErrors.username}
                    style={inputBaseStyle}
                    autoComplete="username"
                  />
                  {fieldErrors.username && (
                    <Form.Text className="text-danger">{fieldErrors.username}</Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicPassword">
                  <Form.Label style={labelStyling}>Password</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type={passwordVisible ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.password}
                      style={{ ...inputBaseStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderLeft: "none",
                        background: "rgba(255,255,255,0.95)",
                        padding: "0 14px",
                        borderTopRightRadius: 12,
                        borderBottomRightRadius: 12,
                        cursor: "pointer",
                        color: PRIMARY_COLOR,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <FontAwesomeIcon icon={passwordVisible ? faEyeSlash : faEye} />
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <Form.Text className="text-danger">{fieldErrors.password}</Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicCheckbox">
                  <Form.Text className="text-muted pt-1">
                    Need an account?
                    <span>
                      <Link to="/signup" style={{ ...labelStyling, marginLeft: 6, color: PRIMARY_COLOR }}>
                        Sign up
                      </Link>
                    </span>
                  </Form.Text>
                </Form.Group>

                {error && (
                  <div style={{ color: "#b91c1c", fontWeight: 600 }} className="pt-1">
                    {error}
                  </div>
                )}

                <Button
                  variant="primary"
                  type="submit"
                  onClick={handleSubmit}
                  style={buttonStyling}
                  className="mt-2"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Log in"}
                </Button>
              </Form>
            </div>
          </div>

          <div className="col-md-4 d-none d-md-block">
            <div style={sideImageWrap}>
              <img
                src={sideImages[currentImageIndex]}
                alt="Dance visual"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;