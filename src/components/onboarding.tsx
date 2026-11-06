"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApplicationField,
  ApplicationCheckbox,
} from "./onboarding/form-controls";
import { OnboardingCardHeading } from "./onboarding/card-heading";
import {
  KycFlow,
  KycHandoff,
  kycRequest,
  uploadKyc,
  type KycSessionRef,
} from "./kyc/flow";
import {
  KYC_STORAGE,
  MAX_KYC_BYTES,
  documentOptions,
  needsBack,
  type KycStatus,
} from "@/lib/kyc";
import { Logo, DemoNotice, Modal, steps } from "./ui";
import {
  empty,
  sample,
  schemaFor,
  readDraft,
  STORAGE,
  questions,
  type Application,
} from "@/lib/demo";
const countries = [
  "United Arab Emirates",
  "United Kingdom",
  "India",
  "Saudi Arabia",
  "Singapore",
  "Other",
];
const ranges = [
  "Under $25,000",
  "$25,000–$75,000",
  "$75,000–$250,000",
  "Over $250,000",
];
const descriptions = [
  "Let’s start with the essentials.",
  "A quick check before we continue.",
  "A little more about you.",
  "Help us understand your financial profile.",
  "Tell us about your market experience.",
  "Choose the account you’d like to explore.",
  "Verify your identity with your phone camera.",
  "One final look before your next step.",
];
export default function Onboarding() {
  const router = useRouter();
  const [kyc, setKyc] = useState<{
    session: KycSessionRef;
    status: KycStatus;
  } | null>(null);
  const [kycError, setKycError] = useState("");
  const [addressBusy, setAddressBusy] = useState(false);
  const [phone, setPhone] = useState(false);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState("");
  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [quiz, setQuiz] = useState(0);
  const [saved, setSaved] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const formPanel = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const {
    register,
    watch,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<Application>({ defaultValues: empty, shouldUnregister: false });
  const data = watch();
  const applyKyc = useCallback(
    (status: KycStatus) => {
      setKyc((old) => (old ? { ...old, status } : old));
      setValue("identity", !!status.captured.front);
      setValue("identityBack", !!status.captured.back);
      setValue("selfie", !!status.captured.selfie);
      setValue("addressProof", !!status.captured.addressProof);
    },
    [setValue],
  );
  useEffect(() => {
    setPhone(matchMedia("(pointer: coarse)").matches);
  }, []);
  useEffect(() => {
    if (!ready || step !== 6) return;
    const body = JSON.stringify({
      documentType: data.documentType,
      country: data.country,
    });
    if (!documentOptions(data.country).includes(data.documentType)) {
      setValue("documentType", documentOptions(data.country)[0]);
      return;
    }
    let cancelled = false;
    (async () => {
      setKycError("");
      try {
        let stored: KycSessionRef | null = null;
        try {
          stored = JSON.parse(sessionStorage.getItem(KYC_STORAGE) || "null");
        } catch {}
        if (stored?.id && stored.secret) {
          try {
            const status = await kycRequest(
              "/api/kyc/session/" + stored.id,
              stored,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "x-kyc-secret": stored.secret,
                },
                body,
              },
            );
            if (cancelled) return;
            setKyc({ session: stored, status });
            applyKyc(status);
            return;
          } catch {
            sessionStorage.removeItem(KYC_STORAGE);
          }
        }
        const created = await kycRequest("/api/kyc/session", null, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (cancelled) return;
        const session = { id: created.id!, secret: created.secret! };
        sessionStorage.setItem(KYC_STORAGE, JSON.stringify(session));
        setKyc({ session, status: created });
        applyKyc(created);
      } catch (e) {
        if (!cancelled) setKycError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, step, data.documentType, data.country, setValue, applyKyc]);
  async function uploadAddress(file: File | undefined) {
    if (!file || !kyc) return;
    if (file.size > MAX_KYC_BYTES) {
      setKycError("Your file is larger than 4 MB. Choose a smaller file.");
      return;
    }
    setAddressBusy(true);
    setKycError("");
    try {
      applyKyc(await uploadKyc(kyc.session, "addressProof", file));
      clearErrors("addressProof");
    } catch (e) {
      setKycError((e as Error).message);
    } finally {
      setAddressBusy(false);
    }
  }
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      reset(draft.data);
      setVerified(draft.verified);
      let allowed = draft.step;
      for (let i = 0; i < draft.step; i++) {
        if (
          !schemaFor(i, draft.data).safeParse(draft.data).success ||
          (i === 1 && draft.verified !== draft.data.email.trim().toLowerCase())
        ) {
          allowed = i;
          break;
        }
      }
      setStep(allowed);
      setNotice("Your demo progress has been restored in this tab.");
    } else {
      const account = new URLSearchParams(location.search).get("account");
      if (account === "Raw") setValue("account", "Raw");
    }
    setReady(true);
  }, [reset, setValue]);
  useEffect(() => {
    if (!ready || submitting.current) return;
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify({ data, step, verified }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data, step, verified, ready]);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
  useEffect(() => {
    if (!ready) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const animation = formPanel.current?.animate(
      [
        { opacity: 0.45, transform: "translateY(12px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 240, easing: "cubic-bezier(.2,.7,.3,1)" },
    );
    const stop = () => animation?.cancel();
    reduced.addEventListener("change", stop);
    return () => {
      stop();
      reduced.removeEventListener("change", stop);
    };
  }, [step, ready]);
  function validate(s: number) {
    const result = schemaFor(s, getValues()).safeParse(getValues());
    if (result.success) return true;
    for (const issue of result.error.issues) {
      const name = String(issue.path[0]) as FieldPath<Application>;
      setError(name, { type: "manual", message: issue.message });
    }
    const first = String(result.error.issues[0]?.path[0]);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[name="' + first + '"]');
      el?.focus();
      el?.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
    return false;
  }
  function next() {
    clearErrors();
    setNotice("");
    if (!validate(step)) return;
    if (step === 0) {
      if (verified !== data.email.trim().toLowerCase()) {
        setVerified("");
        setValue("code", "");
      }
      setCountdown(30);
      setNotice("Demo only: no email sent. Enter 246810 to continue.");
    }
    if (step === 1) setVerified(data.email.trim().toLowerCase());
    setStep(Math.min(7, step + 1));
  }
  function fill() {
    for (const [key, value] of Object.entries(sample))
      setValue(key as keyof Application, value as never);
    clearErrors();
    setNotice(
      "Fictional sample details filled. Please review each step and select the required confirmations yourself.",
    );
  }
  function navigate(target: number) {
    if (target <= step) {
      setStep(target);
      clearErrors();
      setNotice("");
    }
  }
  async function submit() {
    if (submitting.current) return;
    clearErrors();
    if (verified !== getValues("email").trim().toLowerCase()) {
      setStep(1);
      setNotice("Complete simulated verification before continuing.");
      return;
    }
    for (let i = 0; i < 8; i++) {
      if (!validate(i)) {
        setStep(i);
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    try {
      const key = "fc-capital-submission-id";
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
      }
      const response = await fetch("/api/demo-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          data: { ...getValues(), code: "" },
          kyc: kyc?.session,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Submission failed. Please retry.");
      sessionStorage.setItem(
        "fc-capital-receipt",
        JSON.stringify({
          ...result,
          firstName: getValues("firstName").trim(),
          email: getValues("email").trim(),
        }),
      );
      sessionStorage.removeItem(STORAGE);
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(KYC_STORAGE);
      router.push("/application-received");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not save the receipt. Please retry.",
      );
      submitting.current = false;
      setBusy(false);
    }
  }
  const field = (
    name: keyof Application,
    label: string,
    options?: string[],
    type = "text",
    hint?: string,
  ) => (
    <ApplicationField
      key={name}
      name={name}
      label={label}
      options={options}
      type={type}
      hint={hint}
      register={register}
      errors={errors}
    />
  );
  const check = (name: keyof Application, label: React.ReactNode) => (
    <ApplicationCheckbox
      key={name}
      name={name}
      label={label}
      register={register}
      errors={errors}
    />
  );
  return (
    <div className="onboarding-page">
      <DemoNotice />
      <header className="onboarding-header">
        <Logo />
        <button
          className="text-button"
          onClick={() => setModal("Need a hand?")}
        >
          Need help? <span>↗</span>
        </button>
      </header>
      <div className="onboarding-layout">
        <aside className="steps-sidebar">
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>
            Let’s get
            <br />
            you started.
          </h2>
          <p>
            A few steps toward
            <br />a clearer perspective.
          </p>
          <ol>
            {steps.map((name, i) => (
              <li
                key={name}
                className={i === step ? "active" : i < step ? "complete" : ""}
              >
                <button
                  disabled={i > step}
                  onClick={() => navigate(i)}
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="step-number">
                    {i < step ? "✓" : String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {name}
                    <small>
                      {i === step
                        ? "IN PROGRESS"
                        : i < step
                          ? "COMPLETED"
                          : "UP NEXT"}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="sidebar-bottom">
            <span>◈</span>
            <p>
              Your pace. Your perspective.
              <small>Demo progress stays in this browser tab.</small>
            </p>
          </div>
          <Link href="/" className="text-button">
            ← Back to website
          </Link>
        </aside>
        <main className="form-main">
          <div className="form-topline">
            <span>
              APPLICATION / <b>{String(step + 1).padStart(2, "0")}</b>
            </span>
            <button
              className="text-button"
              onClick={() => {
                setSaved(true);
                setModal("Save & exit");
              }}
            >
              Save & exit ↗
            </button>
          </div>
          <div className="onboarding-progress">
            <div className="progress-label">
              <span>YOUR APPLICATION</span>
              <span>
                Step <b>{step + 1}</b> / 8
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Application step"
              aria-valuemin={1}
              aria-valuemax={8}
              aria-valuenow={step + 1}
              aria-valuetext={"Step " + (step + 1) + " of 8: " + steps[step]}
            >
              <i style={{ transform: "scaleX(" + (step + 1) / 8 + ")" }} />
            </div>
            <div className="progress-chapters" aria-hidden="true">
              <span className={step < 2 ? "current" : ""}>01 Contact</span>
              <span className={step >= 2 && step < 5 ? "current" : ""}>
                02 Profile
              </span>
              <span className={step >= 5 ? "current" : ""}>03 Review</span>
            </div>
          </div>
          <div className="form-intro">
            <p className="eyebrow">
              STEP {String(step + 1).padStart(2, "0")} OF 08
            </p>
            <h1 ref={heading} tabIndex={-1}>
              {steps[step]}
            </h1>
            <p>{descriptions[step]}</p>
          </div>
          <div className="demo-toolbar">
            <span>DEMO CONTROLS</span>
            <button onClick={fill}>Fill sample details</button>
            <button onClick={() => setModal("Reset demo?")}>Reset</button>
          </div>
          {notice && (
            <div className="info-note" role="status">
              {notice}
            </div>
          )}
          {storageError && (
            <div className="error-note" role="alert">
              Progress cannot be saved in this browser. Keep this page open;
              submission needs session storage.
            </div>
          )}
          <form
            ref={formPanel}
            className="form-card"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 7) void submit();
              else next();
            }}
          >
            {step === 0 && (
              <>
                <OnboardingCardHeading
                  icon={"◎"}
                  title={"Your contact details"}
                  description={"Use fictional information for this demo."}
                />
                <div className="field-grid">
                  {field("firstName", "First name")}
                  {field("lastName", "Last name")}
                  {field("email", "Email address", undefined, "email")}
                  {field(
                    "phone",
                    "Phone number",
                    undefined,
                    "tel",
                    "Include your country code.",
                  )}
                  {field("country", "Country of residence", countries)}
                  {field("account", "Account preference (optional)", [
                    "Standard",
                    "Raw",
                  ])}
                </div>
                <div className="divider" />
                {check(
                  "contactConsent",
                  <>
                    I acknowledge the{" "}
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => setModal("Demo terms & privacy")}
                    >
                      demo terms and privacy notice
                    </button>
                    .
                  </>,
                )}
                {check(
                  "marketing",
                  "I would like to receive market news and updates (optional).",
                )}
                <div className="quiet-note">
                  No password is needed here. CRM access would be provided
                  separately after review and approval.
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="verification-symbol">✉</div>
                <h2 className="center">Verify your email</h2>
                <p className="center">
                  Demo verification for <strong>{data.email}</strong>
                </p>
                <p className="center muted">
                  No email has been sent. Use the sample code below.
                </p>
                <div className="sample-code">
                  DEMO CODE <strong>246810</strong>
                </div>
                <div className="field code-field">
                  <label htmlFor="code">6-digit verification code</label>
                  <input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    {...register("code")}
                    aria-invalid={!!errors.code}
                  />
                  {errors.code && (
                    <span className="field-error" role="alert">
                      {errors.code.message}
                    </span>
                  )}
                </div>
                <div className="center">
                  <button
                    type="button"
                    className="text-button"
                    disabled={countdown > 0}
                    onClick={() => {
                      setCountdown(30);
                      setValue("code", "");
                      setNotice("Demo code reset. No email sent. Use 246810.");
                    }}
                  >
                    {countdown > 0
                      ? "Resend available in " + countdown + "s"
                      : "Simulate resend"}
                  </button>
                  <button
                    type="button"
                    className="text-button block"
                    onClick={() => setStep(0)}
                  >
                    Change email address
                  </button>
                </div>
                <div className="quiet-note">
                  Production verification, expiry and rate limiting will be
                  connected with the backend.
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <OnboardingCardHeading
                  icon={"◈"}
                  title={"Personal information"}
                  description={
                    "Tell us a little more about the sample applicant."
                  }
                />
                <div className="field-grid">
                  {field("dob", "Date of birth", undefined, "date")}
                  {field("nationality", "Nationality", countries)}
                  {field("birthplace", "Place of birth")}
                  {field("address", "Residential address")}
                  {field("city", "City")}
                  {field("postal", "Postal code (optional)")}
                </div>
                <div className="divider" />
                <h3>Tax residency</h3>
                <div className="field-grid">
                  {field("taxCountry", "Country of tax residence", countries)}
                  {!data.noTin && field("tin", "Tax identification number")}
                </div>
                {check("noTin", "I do not have a tax identification number.")}
                {data.noTin &&
                  field("tinReason", "Reason for not having a TIN")}
                <div className="field-grid">
                  {field("usPerson", "Are you a US person for tax purposes?", [
                    "Yes",
                    "No",
                  ])}
                  {field("pep", "Are you a politically exposed person?", [
                    "Yes",
                    "No",
                  ])}
                </div>
                <p className="quiet-note">
                  These answers are illustrative. Final tax and eligibility
                  requirements depend on the operating entity and jurisdiction.
                </p>
              </>
            )}
            {step === 3 && (
              <>
                <OnboardingCardHeading
                  icon={"▥"}
                  title={"Your financial profile"}
                  description={
                    "Example ranges only; they do not determine eligibility."
                  }
                />
                <div className="field-grid">
                  {field("employment", "Employment status", [
                    "Employed",
                    "Self-employed",
                    "Retired",
                    "Student",
                    "Not currently employed",
                  ])}
                  {["Employed", "Self-employed"].includes(data.employment) &&
                    field("occupation", "Occupation / industry")}
                  {field("income", "Annual income (USD)", ranges)}
                  {field("netWorth", "Estimated net worth (USD)", ranges)}
                  {field("liquidAssets", "Liquid assets (USD)", ranges)}
                  {field("deposit", "Expected initial deposit (USD)", ranges)}
                  {field("source", "Source of funds", [
                    "Employment income",
                    "Business income",
                    "Savings",
                    "Investments",
                    "Inheritance",
                    "Other",
                  ])}
                  {data.source === "Other" &&
                    field("sourceOther", "Describe your source of funds")}
                  {field("purpose", "Purpose of trading", [
                    "Portfolio diversification",
                    "Speculation",
                    "Hedging",
                    "Learning",
                  ])}
                </div>
                <p className="quiet-note">
                  Please use the sample data. These illustrative ranges are not
                  minimum asset or deposit requirements.
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <OnboardingCardHeading
                  icon={"≋"}
                  title={"Your trading experience"}
                  description={
                    "A sample questionnaire, not an eligibility decision."
                  }
                />
                <div className="field-grid">
                  {field("experience", "Trading experience", [
                    "None",
                    "Less than 1 year",
                    "1–3 years",
                    "More than 3 years",
                  ])}
                  {field("frequency", "Trading frequency", [
                    "Never",
                    "Monthly",
                    "Weekly",
                    "Daily",
                  ])}
                  {field("tradeSize", "Typical trade size", [
                    "No prior trades",
                    "Under $1,000",
                    "$1,000–$10,000",
                    "Over $10,000",
                  ])}
                  {field(
                    "qualification",
                    "Relevant financial qualification or employment?",
                    ["Yes", "No"],
                  )}
                </div>
                <div className="divider" />
                <div className="between">
                  <h3>Market knowledge</h3>
                  <span className="muted">
                    {quiz + 1} / {questions.length}
                  </span>
                </div>
                <div className="quiz-progress">
                  {questions.map((q, i) => (
                    <button
                      type="button"
                      key={q.q}
                      className={
                        quiz === i
                          ? "active"
                          : data[("quiz" + i) as keyof Application]
                            ? "answered"
                            : ""
                      }
                      onClick={() => setQuiz(i)}
                      aria-label={"Question " + (i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <fieldset className="quiz-question">
                  <legend>{questions[quiz].q}</legend>
                  {questions[quiz].a.map((answer) => (
                    <label className="radio-option" key={answer}>
                      <input
                        type="radio"
                        value={answer}
                        {...register(("quiz" + quiz) as keyof Application)}
                      />
                      <span>{answer}</span>
                    </label>
                  ))}
                  {errors[("quiz" + quiz) as keyof Application] && (
                    <span className="field-error">Choose an answer.</span>
                  )}
                </fieldset>
                <div className="between">
                  <button
                    type="button"
                    className="text-button"
                    disabled={quiz === 0}
                    onClick={() => setQuiz(quiz - 1)}
                  >
                    ← Previous question
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={quiz === 4}
                    onClick={() => setQuiz(quiz + 1)}
                  >
                    Next question →
                  </button>
                </div>
                {Object.keys(errors).some((k) => k.startsWith("quiz")) && (
                  <p className="field-error" role="alert">
                    Answer all five knowledge questions before continuing.
                  </p>
                )}
              </>
            )}
            {step === 5 && (
              <>
                <OnboardingCardHeading
                  icon={"↗"}
                  title={"Make it your own"}
                  description={"Select a preference for this demo application."}
                />
                <fieldset className="account-options">
                  <legend>Account type</legend>
                  {["Standard", "Raw"].map((a) => (
                    <label
                      key={a}
                      className={
                        "account-option " + (data.account === a ? "chosen" : "")
                      }
                    >
                      <input type="radio" value={a} {...register("account")} />
                      <strong>{a}</strong>
                      <p>
                        {a === "Standard"
                          ? "Spread-based pricing concept"
                          : "Commission-based pricing concept"}
                      </p>
                      <small>Final pricing to be confirmed</small>
                    </label>
                  ))}
                </fieldset>
                <div className="field-grid">
                  <div className="field">
                    <label>Trading platform</label>
                    <div className="fixed-value">
                      MetaTrader 5 <span>MT5</span>
                    </div>
                  </div>
                  {field("currency", "Base currency (demo assumption)", [
                    "USD",
                  ])}
                </div>
                <div className="quiet-note">
                  Leverage, account availability, pricing and supported
                  currencies will be confirmed before launch. Choosing a
                  preference does not open an account.
                </div>
              </>
            )}
            {step === 6 && (
              <>
                <OnboardingCardHeading
                  icon={"▤"}
                  title={"Verify your identity"}
                  description={
                    "Photograph your document and take a quick selfie. The camera takes each photo automatically."
                  }
                />
                {field(
                  "documentType",
                  "Identity document",
                  documentOptions(data.country),
                  "text",
                  "Documents accepted for residents of " +
                    (data.country || "your country") +
                    ".",
                )}
                {kycError && (
                  <div className="error-note" role="alert">
                    {kycError}
                  </div>
                )}
                {(errors.identity || errors.identityBack || errors.selfie) && (
                  <div className="error-note" role="alert">
                    {needsBack(data.documentType)
                      ? "Photograph both sides of your document and take your selfie to continue."
                      : "Photograph your passport and take your selfie to continue."}
                  </div>
                )}
                {!kyc ? (
                  !kycError && (
                    <p className="quiet-note">Preparing secure verification…</p>
                  )
                ) : phone ? (
                  <KycFlow
                    session={kyc.session}
                    status={kyc.status}
                    onStatus={applyKyc}
                  />
                ) : (
                  <KycHandoff
                    session={kyc.session}
                    status={kyc.status}
                    onStatus={applyKyc}
                  />
                )}
                <div className="divider" />
                <div
                  className={"kyc-file" + (data.addressProof ? " done" : "")}
                >
                  <span className="kyc-step-icon" aria-hidden="true">
                    {data.addressProof ? "✓" : "⌂"}
                  </span>
                  <div>
                    <strong>Proof of address</strong>
                    <small>
                      {data.addressProof
                        ? "Uploaded"
                        : "A utility bill or bank statement from the last 3 months. PDF, JPG or PNG, up to 4 MB."}
                    </small>
                  </div>
                  <label
                    className={
                      "button " + (data.addressProof ? "secondary" : "primary")
                    }
                  >
                    {addressBusy
                      ? "Uploading…"
                      : data.addressProof
                        ? "Replace"
                        : "Upload file"}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      disabled={!kyc || addressBusy}
                      onChange={(e) => {
                        void uploadAddress(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {errors.addressProof && (
                  <p className="field-error" role="alert">
                    {errors.addressProof.message}
                  </p>
                )}
                <p className="quiet-note">
                  Your photos are sent over an encrypted connection, stored
                  privately and only visible to the FC Capital review team.
                </p>
              </>
            )}
            {step === 7 && (
              <>
                <OnboardingCardHeading
                  icon={"✓"}
                  title={"Everything in one place"}
                  description={"Check the sample details before submitting."}
                />
                {[
                  [
                    "Contact details",
                    0,
                    [
                      ["Name", data.firstName + " " + data.lastName],
                      ["Email", data.email],
                      ["Phone", data.phone],
                      ["Residence", data.country],
                      [
                        "Marketing",
                        data.marketing ? "Opted in" : "Not selected",
                      ],
                    ],
                  ],
                  [
                    "Personal information",
                    2,
                    [
                      ["Date of birth", data.dob],
                      ["Nationality", data.nationality],
                      ["Place of birth", data.birthplace],
                      [
                        "Address",
                        [data.address, data.city, data.postal]
                          .filter(Boolean)
                          .join(", "),
                      ],
                      ["Tax residence", data.taxCountry],
                      [
                        "TIN",
                        data.noTin
                          ? "Not provided: " + data.tinReason
                          : data.tin,
                      ],
                      ["US person", data.usPerson],
                      ["Politically exposed person", data.pep],
                    ],
                  ],
                  [
                    "Financial profile",
                    3,
                    [
                      ["Employment", data.employment],
                      ["Occupation", data.occupation || "Not applicable"],
                      ["Annual income", data.income],
                      ["Net worth", data.netWorth],
                      ["Liquid assets", data.liquidAssets],
                      ["Expected deposit", data.deposit],
                      [
                        "Source of funds",
                        data.source === "Other"
                          ? data.sourceOther
                          : data.source,
                      ],
                      ["Purpose", data.purpose],
                    ],
                  ],
                  [
                    "Trading experience",
                    4,
                    [
                      ["Experience", data.experience],
                      ["Frequency", data.frequency],
                      ["Trade size", data.tradeSize],
                      ["Relevant qualification", data.qualification],
                      ...questions.map((q, i) => [
                        q.q,
                        String(data[("quiz" + i) as keyof Application]),
                      ]),
                    ],
                  ],
                  [
                    "Account preferences",
                    5,
                    [
                      ["Account", data.account],
                      ["Platform", "MetaTrader 5"],
                      ["Currency", data.currency + " (demo)"],
                    ],
                  ],
                  [
                    "Documents",
                    6,
                    [
                      [
                        "Identity",
                        data.documentType +
                          (data.identity ? " · photographed" : " · missing"),
                      ],
                      ...(needsBack(data.documentType)
                        ? [
                            [
                              "Back side",
                              data.identityBack ? "Photographed" : "Missing",
                            ],
                          ]
                        : []),
                      ["Selfie", data.selfie ? "Captured" : "Missing"],
                      [
                        "Proof of address",
                        data.addressProof ? "Uploaded" : "Missing",
                      ],
                    ],
                  ],
                ].map(([title, target, rows]) => (
                  <details className="review-group" key={String(title)} open>
                    <summary>{String(title)}</summary>
                    <button
                      type="button"
                      className="review-edit"
                      onClick={() => setStep(Number(target))}
                      aria-label={"Edit " + title}
                    >
                      Edit ↗
                    </button>
                    <dl>
                      {(rows as string[][]).map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                ))}
                <div className="divider" />
                {check(
                  "accuracy",
                  "I have reviewed the fictional information in this demo application.",
                )}
                {check(
                  "risk",
                  "I understand leveraged trading can result in losses and this demo does not assess my suitability.",
                )}
                {check(
                  "terms",
                  <>
                    I acknowledge the{" "}
                    <button
                      type="button"
                      className="inline-link"
                      onClick={() => setModal("Demo terms & privacy")}
                    >
                      demo terms and privacy notice
                    </button>
                    , and understand no live account is being opened.
                  </>,
                )}
                <p className="quiet-note">
                  Submitting saves a fixed fictional Alex Morgan application and
                  your account preference in MongoDB, then attempts a test admin
                  notification. Your entered personal details are not sent.
                  Private test uploads, if any, are linked to the test record.
                  No applicant email is sent.
                </p>
              </>
            )}
            <div className="form-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setStep(step - 1);
                    clearErrors();
                    setNotice("");
                  }}
                >
                  ← Back
                </button>
              ) : (
                <Link href="/" className="text-button">
                  ← Back to website
                </Link>
              )}
              <button
                className="button primary"
                type="submit"
                disabled={busy || !ready}
              >
                {busy
                  ? "Saving test application…"
                  : step === 7
                    ? "Submit demo application"
                    : step === 0
                      ? "Continue to verification"
                      : step === 1
                        ? "Verify & continue"
                        : "Continue"}{" "}
                <span>→</span>
              </button>
            </div>
          </form>
          <p className="form-footer">
            FC CAPITAL · INTERACTIVE PREVIEW
            <br />
            Your application does not create a live account or grant access to
            the separate CRM.
          </p>
        </main>
      </div>
      {modal && (
        <Modal
          title={modal}
          onClose={() => {
            setModal("");
            setSaved(false);
          }}
        >
          {modal === "Reset demo?" ? (
            <>
              <p>Clear the sample application and start again in this tab?</p>
              <button
                className="button primary"
                onClick={() => {
                  reset(empty);
                  setKyc(null);
                  sessionStorage.removeItem(KYC_STORAGE);
                  setStep(0);
                  setVerified("");
                  setQuiz(0);
                  setNotice("Demo reset.");
                  sessionStorage.removeItem("fc-capital-receipt");
                  setModal("");
                }}
              >
                Reset sample application
              </button>
            </>
          ) : saved ? (
            <>
              <p>
                {storageError
                  ? "This browser could not save your progress. Stay on this page to avoid losing it."
                  : "Your sample progress is saved in this browser tab. Return here to continue. Closing the tab may clear it."}
              </p>
              <Link className="button primary" href="/">
                Return to homepage →
              </Link>
              <button
                className="button secondary"
                onClick={() => {
                  setModal("");
                  setSaved(false);
                }}
              >
                Keep going
              </button>
            </>
          ) : (
            <>
              <p>
                {modal === "Need a hand?"
                  ? "Use “Fill sample details” to explore the flow. Verification uses 246810 and uploads use sample attachments. Support contacts will be configured before launch."
                  : "This prototype accepts fictional sample information only. Progress is stored in session storage in this browser tab; submission saves only a fixed fictional applicant and account preference in MongoDB. A test email goes only to the administrator. Final legal terms, privacy notices and business details must be supplied before launch."}
              </p>
              <button className="button secondary" onClick={() => setModal("")}>
                Got it
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
