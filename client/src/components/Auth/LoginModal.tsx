import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        setError(res.data.message || "Telegram bot ulanishda xatolik yuz berdi");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Server bilan ulanishda xatolik. Qayta urinib ko'ring.");
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
          if (res.data.status === "authenticated" && res.data.user) {
            if (res.data.token) {
              localStorage.setItem("xabarchi_token", res.data.token);
            }
            clearInterval(intervalId as ReturnType<typeof setInterval>);
            setIsWaitingBot(false);
            login(res.data.user);
          }
        } catch {
          // ignore polling noise
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isWaitingBot, botAuthCode, login]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/google", {
        googleId: "g_" + Date.now(),
        email: "user@gmail.com",
        name: "Google Foydalanuvchisi",
      });

      if (res.data.success && res.data.user) {
        if (res.data.token) {
          localStorage.setItem("xabarchi_token", res.data.token);
        }
        login(res.data.user);
      }
    } catch {
      setError("Google orqali kirish vaqtincha ishlamadi");
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
    } catch {
      setError("Telefon raqamga kod yuborilmadi");
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
    if (code.length < 5) {
      setError("5 xonali tasdiqlash kodini to" + "'" + "liq kiriting");
      return;
    }
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep("2fa");
    }, 500);
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password2FA) {
      setError("2-bosqichli parolni kiriting");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/verify-code", {
        phoneNumber: fullPhoneNumber,
        code: otpCode.join(""),
      });

      if (res.data.success && res.data.user) {
        login(res.data.user);
      }
    } catch {
      setError("Telefon orqali kirish vaqtincha ishlamadi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-[#0B0B0B] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-28 h-28  flex items-center justify-center mb-3 ">
            <img src="/src/assets/xabarchi.png" alt="" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Xabarchi Web
          </h2>
          <p className="text-xs text-white/55 mt-1 text-center">
            Tizimga kirish usulini tanlang
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-xs text-center">
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
              className="space-y-3"
            >
              <button
                onClick={startTelegramBotAuth}
                disabled={isLoading}
                className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-medium text-sm py-3.5 px-4 rounded-2xl transition-subtle flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-[#229ED9]/10 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Send
                        size={14}
                        className="text-white transform -rotate-12"
                      />
                    </div>
                    <span>Telegram orqali kirish</span>
                  </>
                )}
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-[#111111] hover:bg-white/10 text-white font-medium text-sm py-3.5 px-4 rounded-2xl border border-white/10 transition-subtle flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                Google orqali kirish
              </button>

              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <span className="relative px-3 bg-[#0B0B0B] text-[11px] text-white/40 font-medium">
                  yoki
                </span>
              </div>

              <button
                onClick={() => setAuthMethod("phone")}
                className="w-full bg-transparent hover:bg-white/5 text-white/70 hover:text-white text-xs py-2.5 rounded-xl border border-transparent transition-subtle cursor-pointer"
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
              className="space-y-5 text-center"
            >
              <div className="p-4 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/20 flex flex-col items-center">
                <Bot size={40} className="text-[#229ED9] mb-2 animate-bounce" />
                <h4 className="text-sm font-semibold text-white mb-1">
                  Telegram Botga Ulanyapti
                </h4>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  Telegram bot ochilgandan so'ng botdagi <b>/start</b> tugmasini
                  bosing!
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[#229ED9]">
                  Kod: {botAuthCode}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={botAuthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#229ED9] hover:bg-[#229ED9]/90 text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  Telegram Botni Ochish <ExternalLink size={14} />
                </a>

                <div className="flex items-center justify-center gap-2 text-xs text-white/40 pt-2">
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
                  className="text-xs text-white/40 hover:text-white pt-2 cursor-pointer"
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
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/55 mb-2 font-medium">
                      Davlat va Telefon
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-[#111111] border border-white/10 text-white text-xs rounded-xl px-2 py-3 outline-none"
                      >
                        <option value="+998">+998</option>
                        <option value="+1">+1</option>
                        <option value="+7">+7</option>
                      </select>
                      <div className="relative flex-1">
                        <Phone
                          className="absolute left-3 top-3 text-white/40"
                          size={16}
                        />
                        <input
                          type="tel"
                          placeholder="90 123 45 67"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full bg-[#111111] border border-white/10 text-white text-xs rounded-xl pl-9 pr-3 py-3 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#229ED9] text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full text-xs text-white/55 hover:text-white py-1 cursor-pointer"
                  >
                    Boshqa usullar
                  </button>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="flex justify-center gap-2">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        className="w-10 h-12 bg-[#111111] border border-white/10 text-center font-bold text-white rounded-xl text-lg outline-none focus:border-[#229ED9]"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#229ED9] text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Tasdiqlash <CheckCircle2 size={14} />
                  </button>
                </form>
              )}

              {step === "2fa" && (
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <input
                    type="password"
                    placeholder="2FA parolingiz"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    className="w-full bg-[#111111] border border-white/10 text-white text-xs rounded-xl px-3 py-3 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#229ED9] text-white font-medium text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
