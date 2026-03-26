import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

// ✅ Use ONLY your uploaded images in /public (no new folders)
const bgImages = ["/dance1.jpg", "/dance2.jpg", "/dance3.jpg", "/dance4.jpg"];
const sideImages = ["/dance2.jpg", "/dance3.jpg", "/dance4.jpg", "/dance1.jpg"];

const PRIMARY_COLOR = "#622A0F";
const url = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/signup`;

const Register = () => {
  const [data, setData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // keep existing variable so nothing else breaks
  const [bgColor, setBgColor] = useState("#FFFFFF");

  const [fieldErrors, setFieldErrors] = useState({ username: "", email: "", password: "" });

  // ✅ slideshow index
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const getNextImageIndex = () => (currentImageIndex + 1) % bgImages.length;

  const handleChange = ({ currentTarget: input }) => {
    setData({ ...data, [input.name]: input.value });
    setFieldErrors({ ...fieldErrors, [input.name]: "" });
  };

  useEffect(() => {
    setBgColor("#FFFFFF");
  }, []);

  // ✅ slideshow (cleaner)
  useEffect(() => {
    const slideshowInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);

    return () => clearInterval(slideshowInterval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setFieldErrors({ username: "", email: "", password: "" });
    let errors = {};

    if (!data.username) {
      errors.username = "Username is required.";
    } else if (data.username.length < 6) {
      errors.username = "Username must be 6 characters or longer.";
    } else if (data.username.length > 28) {
      errors.username = "Username must be less than 28 characters.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      errors.email = "Email is required.";
    } else if (!emailRegex.test(data.email)) {
      errors.email = "Email address is invalid.";
    }

    if (!data.password) {
      errors.password = "Password is required.";
    } else if (data.password.length < 8) {
      errors.password = "Password must be 8 characters or more.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await axios.post(url, data);
      setLoading(false);
      navigate("/"); // back to login
    } catch (error) {
      setLoading(false);
      if (error.response) {
        setError("The Username, Email, or Password you've entered is invalid. Please try again");
      } else {
        setError("Unable to reach the server. Please try again.");
      }
    }
  };

  // ✅ improved styles
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

  // ✅ new background look: one image + dark overlay
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
          {/* Left: Form */}
          <div className="col-md-8 col-lg-6 col-xl-4 offset-xl-1">
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <img src="/dance-logo.png" alt="Dance Master" style={{ width: 36, height: 36 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Dance Master</div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>Create your account</div>
                </div>
              </div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formBasicUsername">
                  <Form.Label style={labelStyling}>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    onChange={handleChange}
                    placeholder="6-28 characters"
                    isInvalid={!!fieldErrors.username}
                    style={inputBaseStyle}
                    autoComplete="username"
                  />
                  {fieldErrors.username && (
                    <Form.Text className="text-danger">{fieldErrors.username}</Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicEmail">
                  <Form.Label style={labelStyling}>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    onChange={handleChange}
                    placeholder="Enter email"
                    isInvalid={!!fieldErrors.email}
                    style={inputBaseStyle}
                    autoComplete="email"
                  />
                  {fieldErrors.email && (
                    <Form.Text className="text-danger">{fieldErrors.email}</Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="formBasicPassword">
                  <Form.Label style={labelStyling}>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="8 characters or more"
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.password}
                    style={inputBaseStyle}
                    autoComplete="new-password"
                  />
                  {fieldErrors.password && (
                    <Form.Text className="text-danger">{fieldErrors.password}</Form.Text>
                  )}
                </Form.Group>

                {error && <div style={{ color: "#b91c1c", fontWeight: 600 }} className="mb-2">{error}</div>}

                <Button
                  variant="primary"
                  type="submit"
                  style={buttonStyling}
                  className="mt-2"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Create account"}
                </Button>

                <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                  Already have an account?
                  <Link to="/" style={{ marginLeft: 6, color: PRIMARY_COLOR, fontWeight: 700, textDecoration: "none" }}>
                    Log in
                  </Link>
                </div>
              </Form>
            </div>
          </div>

          {/* Right: Image */}
          <div className="col-md-4 d-none d-md-block">
            <div style={sideImageWrap}>
              <img
                src={sideImages[currentImageIndex]}
                alt="Dance visual"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
