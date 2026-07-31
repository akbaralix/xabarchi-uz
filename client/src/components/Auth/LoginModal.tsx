import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithPopup } from "firebase/auth";
import {
  Send,
  Phone,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Bot,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { api } from "../../lib/api";
import { auth, googleProvider } from "../../firebase";
import logoImg from "../../assets/xabarchi.png";
import "../../styles/LoginModal.css";

export const LoginModal: React.FC = () => {
  const { login } = useStore();
  const [authMethod, setAuthMethod] = useState<
    "main" | "telegram_bot" | "phone"
  >("main");
  const [step, setStep] = useState<"phone" | "otp" | "2fa">("phone");

  const [botAuthCode, setBotAuthCode] = useState<string | null>(null);
  const [botAuthUrl, setBotAuthUrl] = useState<string>(
    "https://t.me/XabarchiAuthBot",
  );
  const [isWaitingBot, setIsWaitingBot] = useState(false);

  const [countryCode, setCountryCode] = useState("+998");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", ""]);
  const [password2FA, setPassword2FA] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhoneNumber = `${countryCode} ${phoneNumber}`.trim();

  const startTelegramBotAuth = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/telegram/init");
      if (res.data.success) {
        setBotAuthCode(res.data.code);
        setBotAuthUrl(res.data.botUrl);
        setIsWaitingBot(true);
        setAuthMethod("telegram_bot");
        window.open(res.data.botUrl, "_blank");
      } else {
        setError(
          res.data.message || "Telegram bot ulanishda xatolik yuz berdi",
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Server bilan ulanishda xatolik. Qayta urinib ko'ring.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isWaitingBot && botAuthCode) {
      intervalId = setInterval(async () => {
        try {
          const res = await api.get(`/api/auth/telegram/check/${botAuthCode}`);
          if (res.data?.status === "authenticated" && res.data?.user) {
            if (res.data.token) {
              localStorage.setItem("xabarchi_token", res.data.token);
            }
            if (intervalId) clearInterval(intervalId);
            setIsWaitingBot(false);
            login(res.data.user);
          }
        } catch (err) {
          console.warn("[Telegram Polling Warning]:", err);
        }
      }, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isWaitingBot, botAuthCode, login]);

  // Real Firebase Authentication Google Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const res = await api.post("/api/auth/google", {
        googleId: googleUser.uid,
        email: googleUser.email,
        name: googleUser.displayName || googleUser.email?.split('@')[0] || "Google Foydalanuvchisi",
        picture: googleUser.photoURL
      });

      if (res.data.success && res.data.user) {
        if (res.data.token) {
          localStorage.setItem("xabarchi_token", res.data.token);
        }
        login(res.data.user);
      } else {
        setError(res.data.message || "Google tizimiga kirishda xatolik");
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Google oyna yopildi");
      } else {
        setError(err.message || "Google Authentication xatoligi yuz berdi");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 7) {
      setError("Iltimos, to'g'ri telefon raqamini kiriting");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await api.post("/api/auth/send-code", { phoneNumber: fullPhoneNumber });
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Telefon raqamga kod yuborilmadi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const next = [...otpCode];
    next[index] = value;
    setOtpCode(next);

    if (value && index < 4) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.join("");
    if (code.length < 4) {
      setError("Tasdiqlash kodini to'liq kiriting");
      return;
    }
    setError("");
    setStep("2fa");
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/verify-code", {
        phoneNumber: fullPhoneNumber,
        code: otpCode.join(""),
      });

      if (res.data.success && res.data.user) {
        if (res.data.token) {
          localStorage.setItem("xabarchi_token", res.data.token);
        }
        login(res.data.user);
      } else {
        setError(res.data.message || "Kirishda xatolik");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Telefon orqali kirishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="login-modal-card"
      >
        <div className="login-header">
          <div className="login-logo-wrapper">
            <img
              src={logoImg}
              alt="Xabarchi"
              className="login-logo-img"
            />
          </div>
          <h2 className="login-title">
            Xabarchi Web
          </h2>
          <p className="login-subtitle">
            Tizimga kirish usulini tanlang
          </p>
        </div>

        {error && (
          <div className="login-error-banner">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {authMethod === "main" && (
            <motion.div
              key="main-buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="login-actions-container"
            >
              <button
                onClick={startTelegramBotAuth}
                disabled={isLoading}
                className="btn-login-telegram"
              >
                {isLoading ? (
                  <div className="login-btn-spinner animate-spin" />
                ) : (
                  <>
                    <div className="telegram-icon-circle">
                      <Send
                        size={14}
                        className="telegram-icon-send"
                      />
                    </div>
                    <span>Telegram Bot orqali kirish</span>
                  </>
                )}
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="btn-login-google"
              >
                {isLoading ? "Yuklanmoqda..." : "Google Firebase Auth orqali kirish"}
              </button>

              <div className="login-divider">
                <div className="login-divider-line-container">
                  <div className="login-divider-line" />
                </div>
                <span className="login-divider-text">
                  yoki
                </span>
              </div>

              <button
                onClick={() => setAuthMethod("phone")}
                className="btn-login-phone"
              >
                Telefon raqam orqali kirish
              </button>
            </motion.div>
          )}

          {authMethod === "telegram_bot" && (
            <motion.div
              key="telegram-bot-polling"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="login-telegram-poll"
            >
              <div className="telegram-poll-card">
                <Bot size={40} className="telegram-bot-icon animate-bounce" />
                <h4 className="telegram-poll-title">
                  Telegram Botga Ulanyapti
                </h4>
                <p className="telegram-poll-desc">
                  Telegram bot ochilgandan so'ng botdagi <b>/start</b> tugmasini
                  bosing!
                </p>
                <div className="telegram-poll-code">
                  Kod: {botAuthCode}
                </div>
              </div>

              <div className="telegram-poll-btn-group">
                <a
                  href={botAuthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-open-telegram-bot"
                >
                  Telegram Botni Ochish <ExternalLink size={14} />
                </a>

                <div className="telegram-waiting-label">
                  <RefreshCw
                    size={13}
                    className="animate-spin text-[#229ED9]"
                  />{" "}
                  Kutilmoqda...
                </div>

                <button
                  onClick={() => {
                    setIsWaitingBot(false);
                    setAuthMethod("main");
                  }}
                  className="btn-change-auth-method"
                >
                  Boshqa usul bilan kirish
                </button>
              </div>
            </motion.div>
          )}

          {authMethod === "phone" && (
            <motion.div
              key="phone-auth-wrapper"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {step === "phone" && (
                <form onSubmit={handlePhoneSubmit} className="phone-auth-form">
                  <div>
                    <label className="form-field-label">
                      Davlat va Telefon
                    </label>
                    <div className="phone-inputs-row">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="select-country-code"
                      >
                        <option value="+998">+998</option>
                        <option value="+1">+1</option>
                        <option value="+7">+7</option>
                      </select>
                      <div className="phone-input-relative">
                        <Phone
                          className="phone-field-icon"
                          size={16}
                        />
                        <input
                          type="tel"
                          placeholder="90 123 45 67"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="input-phone-number"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-submit-phone"
                  >
                    {isLoading ? (
                      "Yuborilmoqda..."
                    ) : (
                      <>
                        SMS Kod Olish <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthMethod("main")}
                    className="btn-change-auth-method"
                  >
                    Boshqa usullar
                  </button>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={handleOtpSubmit} className="phone-auth-form">
                  <div className="otp-inputs-row">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="input-otp-digit"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="btn-submit-phone"
                  >
                    Tasdiqlash <CheckCircle2 size={14} />
                  </button>
                </form>
              )}

              {step === "2fa" && (
                <form onSubmit={handle2FASubmit} className="phone-auth-form">
                  <input
                    type="password"
                    placeholder="2FA parolingiz (ixtiyoriy)"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    className="input-2fa-password"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-submit-phone"
                  >
                    Kirish <ShieldCheck size={14} />
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
