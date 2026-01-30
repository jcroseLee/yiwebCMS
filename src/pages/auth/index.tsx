import { AuthPage } from "@refinedev/antd";
import type { ReactNode } from "react";
import logo from "../../assets/react.svg";

const renderAuthContent = (content: ReactNode) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <img src={logo} alt="易知 CMS" style={{ width: 64, height: 64 }} />
      </div>
      {content}
    </div>
  );
};

export const LoginPage = () => {
  return (
    <AuthPage
      type="login"
      title="易知 CMS"
      renderContent={(content) => renderAuthContent(content)}
    />
  );
};

export const RegisterPage = () => {
  return (
    <AuthPage
      type="register"
      title="易知 CMS"
      renderContent={(content) => renderAuthContent(content)}
    />
  );
};

export const ForgotPasswordPage = () => {
  return (
    <AuthPage
      type="forgotPassword"
      title="易知 CMS"
      renderContent={(content) => renderAuthContent(content)}
    />
  );
};

export const UpdatePasswordPage = () => {
  return (
    <AuthPage
      type="updatePassword"
      title="易知 CMS"
      renderContent={(content) => renderAuthContent(content)}
    />
  );
};
