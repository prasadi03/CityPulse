import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { DepartmentId, UserSession } from '../types/citypulse';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAppLanguage } from '../i18n';
import {
  getAreaLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const [roleTab, setRoleTab] = useState<'citizen' | 'worker'>('citizen');
  const [citizenMode, setCitizenMode] = useState<'phone' | 'email' | 'signup'>(
    'phone'
  );

  // Citizen fields
  const [phone, setPhone] = useState('9845011223');
  const [otp, setOtp] = useState('123456');
  const [email, setEmail] = useState('ananya@citypulse.in');
  const [citizenPassword, setCitizenPassword] = useState('pulse2026');
  const [signupName, setSignupName] = useState('');
  const [signupContact, setSignupContact] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupArea, setSignupArea] = useState('indiranagar');

  // Worker fields
  const [employeeId, setEmployeeId] = useState('BESCOM-101');
  const [workerPassword, setWorkerPassword] = useState('bescom123');
  const [workerDept, setWorkerDept] = useState<DepartmentId>('electricity');

  const [demoOpen, setDemoOpen] = useState(false);
  const [errorState, setErrorState] = useState<{
    key?: string;
    fallback?: string;
  } | null>(null);

  const areas = dataService.getAreas();
  const departments = dataService.getDepartmentList();
  const demoCreds = dataService.getDemoCredentials();

  const resolvedError = errorState
    ? errorState.key
      ? t(errorState.key)
      : errorState.fallback || ''
    : '';

  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    if (citizenMode === 'phone') {
      const res = dataService.loginCitizenPhone(phone, otp);
      if (!res.ok) {
        setErrorState({ key: res.errorKey, fallback: res.error });
        return;
      }
      onLoginSuccess(res.session);
    } else if (citizenMode === 'email') {
      const res = dataService.loginCitizenEmail(email, citizenPassword);
      if (!res.ok) {
        setErrorState({ key: res.errorKey, fallback: res.error });
        return;
      }
      onLoginSuccess(res.session);
    } else {
      const res = dataService.signupCitizen({
        name: signupName,
        contact: signupContact,
        password: signupPassword,
        areaId: signupArea,
      });
      if (!res.ok) {
        setErrorState({ key: res.errorKey, fallback: res.error });
        return;
      }
      onLoginSuccess(res.session);
    }
  };

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);
    const res = dataService.loginWorker({
      employeeId,
      password: workerPassword,
      departmentId: workerDept,
    });
    if (!res.ok) {
      setErrorState({ key: res.errorKey, fallback: res.error });
      return;
    }
    onLoginSuccess(res.session);
  };

  const handleGuestContinue = () => {
    const guestSession = dataService.loginAsGuest();
    onLoginSuccess(guestSession);
  };

  const fillDemoWorker = (w: {
    employeeId: string;
    password: string;
    departmentId: DepartmentId;
  }) => {
    setRoleTab('worker');
    setEmployeeId(w.employeeId);
    setWorkerPassword(w.password);
    setWorkerDept(w.departmentId);
    setErrorState(null);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FF9B71]/25 text-[#964825] mx-auto">
            <Zap className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#5A4A42]">
            {t('login:title')}
          </h1>
          <p className="text-base font-medium text-[#7A6A62]">
            {t('common:tagline')}
          </p>
        </div>

        {/* Main Login Card */}
        <div className="cp-card p-6 sm:p-7 space-y-6">
          {/* Role Toggle Tabs */}
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#FFF9F2] border border-[#F0E6DF]"
            role="tablist"
            aria-label={t('login:roleAria')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={roleTab === 'citizen'}
              onClick={() => {
                setRoleTab('citizen');
                setErrorState(null);
              }}
              className={`min-h-11 px-2 py-1.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
                roleTab === 'citizen'
                  ? 'bg-white text-[#5A4A42] shadow-xs border border-[#F0E6DF]'
                  : 'text-[#7A6A62] hover:text-[#5A4A42]'
              }`}
            >
              <User className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('common:roles.citizen')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={roleTab === 'worker'}
              onClick={() => {
                setRoleTab('worker');
                setErrorState(null);
              }}
              className={`min-h-11 px-2 py-1.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
                roleTab === 'worker'
                  ? 'bg-white text-[#5A4A42] shadow-xs border border-[#F0E6DF]'
                  : 'text-[#7A6A62] hover:text-[#5A4A42]'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('common:roles.worker')}</span>
            </button>
          </div>

          {/* CITIZEN LOGIN / SIGNUP */}
          {roleTab === 'citizen' ? (
            <div className="space-y-4">
              {citizenMode !== 'signup' && (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('phone');
                      setErrorState(null);
                    }}
                    className={`flex-1 min-h-10 px-2 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer ${
                      citizenMode === 'phone'
                        ? 'bg-[#FFF0E6] border-[#FF9B71] text-[#5A4A42]'
                        : 'bg-white border-[#F0E6DF] text-[#7A6A62]'
                    }`}
                  >
                    {t('login:phoneOtpTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('email');
                      setErrorState(null);
                    }}
                    className={`flex-1 min-h-10 px-2 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer ${
                      citizenMode === 'email'
                        ? 'bg-[#FFF0E6] border-[#FF9B71] text-[#5A4A42]'
                        : 'bg-white border-[#F0E6DF] text-[#7A6A62]'
                    }`}
                  >
                    {t('login:emailPassTab')}
                  </button>
                </div>
              )}

              <form onSubmit={handleCitizenSubmit} className="space-y-4">
                {citizenMode === 'phone' && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="cit-phone"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:mobileLabel')}
                      </label>
                      <input
                        id="cit-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('login:mobilePlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="cit-otp"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:otpLabel')}
                      </label>
                      <input
                        id="cit-otp"
                        type="text"
                        inputMode="numeric"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder={t('login:otpPlaceholder')}
                        className="cp-input w-full px-4 tabular-nums"
                      />
                      <p className="text-xs text-[#7A6A62]">
                        {localizeDigits(
                          t('login:otpDemoHint', { otp: '123456' }),
                          language,
                          useNativeNumerals
                        )}
                      </p>
                    </div>
                  </>
                )}

                {citizenMode === 'email' && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="cit-email"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:emailLabel')}
                      </label>
                      <input
                        id="cit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('login:emailPlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="cit-pass"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:passwordLabel')}
                      </label>
                      <input
                        id="cit-pass"
                        type="password"
                        value={citizenPassword}
                        onChange={(e) => setCitizenPassword(e.target.value)}
                        placeholder={t('login:passwordPlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                  </>
                )}

                {citizenMode === 'signup' && (
                  <>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="su-name"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:fullNameLabel')}
                      </label>
                      <input
                        id="su-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder={t('login:fullNamePlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="su-contact"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:emailOrMobileLabel')}
                      </label>
                      <input
                        id="su-contact"
                        type="text"
                        value={signupContact}
                        onChange={(e) => setSignupContact(e.target.value)}
                        placeholder={t('login:emailOrMobilePlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="su-area"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:homeAreaLabel')}
                      </label>
                      <select
                        id="su-area"
                        value={signupArea}
                        onChange={(e) => setSignupArea(e.target.value)}
                        className="cp-input w-full px-4 cursor-pointer"
                      >
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {getAreaLabel(a.id, language, a.name)} (
                            {getZoneLabel(a.zone, language)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="su-pass"
                        className="block text-sm font-semibold text-[#5A4A42]"
                      >
                        {t('login:createPasswordLabel')}
                      </label>
                      <input
                        id="su-pass"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder={t('login:createPasswordPlaceholder')}
                        className="cp-input w-full px-4"
                      />
                    </div>
                  </>
                )}

                {resolvedError && (
                  <p
                    role="alert"
                    className="text-sm font-medium text-[#9E2A2B] bg-[#FF6B6B]/15 px-3.5 py-2.5 rounded-xl"
                  >
                    {resolvedError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-base transition-colors cursor-pointer"
                >
                  {citizenMode === 'signup'
                    ? t('login:submitSignup')
                    : t('login:submitCitizen')}
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm pt-1">
                {citizenMode === 'signup' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('phone');
                      setErrorState(null);
                    }}
                    className="font-semibold text-[#964825] hover:underline cursor-pointer"
                  >
                    {t('login:backToCitizenSignin')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('signup');
                      setErrorState(null);
                    }}
                    className="font-semibold text-[#964825] hover:underline cursor-pointer"
                  >
                    {t('login:signup')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGuestContinue}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#7A6A62] hover:text-[#5A4A42] cursor-pointer"
                >
                  <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{t('login:continueAsGuest')}</span>
                </button>
              </div>
            </div>
          ) : (
            /* WORKER LOGIN */
            <form onSubmit={handleWorkerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="wrk-dept"
                  className="block text-sm font-semibold text-[#5A4A42]"
                >
                  {t('login:deptLabel')}
                </label>
                <select
                  id="wrk-dept"
                  value={workerDept}
                  onChange={(e) => setWorkerDept(e.target.value as DepartmentId)}
                  className="cp-input w-full px-4 cursor-pointer"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {getDepartmentLabel(d.id, t)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wrk-id"
                  className="block text-sm font-semibold text-[#5A4A42]"
                >
                  {t('login:employeeIdLabel')}
                </label>
                <input
                  id="wrk-id"
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder={t('login:employeeIdPlaceholder')}
                  className="cp-input w-full px-4"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="wrk-pass"
                  className="block text-sm font-semibold text-[#5A4A42]"
                >
                  {t('login:passwordLabel')}
                </label>
                <input
                  id="wrk-pass"
                  type="password"
                  value={workerPassword}
                  onChange={(e) => setWorkerPassword(e.target.value)}
                  placeholder={t('login:workerPassPlaceholder')}
                  className="cp-input w-full px-4"
                />
              </div>

              {resolvedError && (
                <p
                  role="alert"
                  className="text-sm font-medium text-[#9E2A2B] bg-[#FF6B6B]/15 px-3.5 py-2.5 rounded-xl"
                >
                  {resolvedError}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-12 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-base transition-colors cursor-pointer"
              >
                {t('login:submitWorker')}
              </button>
            </form>
          )}
        </div>

        {/* Collapsible Demo Access Box */}
        <div className="cp-card overflow-hidden">
          <button
            type="button"
            onClick={() => setDemoOpen((prev) => !prev)}
            aria-expanded={demoOpen}
            className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-[#5A4A42] hover:bg-[#FFF9F2] transition-colors cursor-pointer text-left"
          >
            <span>{t('login:demoAccessToggle')}</span>
            {demoOpen ? (
              <ChevronUp className="w-4 h-4 text-[#7A6A62] shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#7A6A62] shrink-0" />
            )}
          </button>

          {demoOpen && (
            <div className="px-5 pb-4 pt-1 border-t border-[#F5EDE6] space-y-3 text-xs text-[#7A6A62]">
              <div className="space-y-1.5">
                <div className="font-semibold text-[#5A4A42]">
                  {t('login:demoCitizenAccounts')}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleTab('citizen');
                      setCitizenMode('phone');
                      setPhone(demoCreds.citizenPhone.phone);
                      setOtp(demoCreds.citizenPhone.otp);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#F0E6DF] hover:bg-[#FFF0E6] text-[#5A4A42] font-medium cursor-pointer"
                  >
                    {t('login:demoPhoneBtn', {
                      phone: demoCreds.citizenPhone.phone,
                      otp: demoCreds.citizenPhone.otp,
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleTab('citizen');
                      setCitizenMode('email');
                      setEmail(demoCreds.citizenEmail.email);
                      setCitizenPassword(demoCreds.citizenEmail.password);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#F0E6DF] hover:bg-[#FFF0E6] text-[#5A4A42] font-medium cursor-pointer"
                  >
                    {t('login:demoEmailBtn', {
                      email: demoCreds.citizenEmail.email,
                      password: demoCreds.citizenEmail.password,
                    })}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-[#5A4A42]">
                  {t('login:demoWorkerAccounts')}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {demoCreds.workers.map((w) => (
                    <button
                      key={w.employeeId}
                      type="button"
                      onClick={() => fillDemoWorker(w)}
                      className="text-left px-3 py-2 rounded-xl bg-[#FFF9F2] border border-[#F0E6DF] hover:bg-[#FFF0E6] text-[#5A4A42] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="font-semibold">
                        {getDepartmentLabel(w.departmentId, t)}
                      </span>
                      <span className="tabular-nums text-[#7A6A62] shrink-0">
                        {w.employeeId} / {w.password}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
