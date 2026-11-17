import React, { useState } from 'react';
import {
  Camera,
  CheckCircle2,
  MessageSquare,
  Send,
  Calendar,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { DepartmentId, UserSession } from '../types/citypulse';
import {
  DepartmentBadge,
  EmptyState,
  IssueStatusBadge,
} from './StatusPrimitives';
import { TranslatableText } from './TranslatableText';
import { useAppLanguage } from '../i18n';
import {
  formatDateLocalized,
  formatRelativeTimeText,
  formatTimeLocalized,
  getAreaLabel,
  getCategoryLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface CitizenReportProps {
  session: UserSession;
  onRequestSignIn: () => void;
}

export const CitizenReport: React.FC<CitizenReportProps> = ({
  session,
  onRequestSignIn,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const departments = dataService.getDepartmentList();
  const areas = dataService.getAreas();
  const defaultArea =
    session.role === 'citizen' && session.areaId
      ? session.areaId
      : areas[0].id;

  // 3-Step Report Form State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [deptId, setDeptId] = useState<DepartmentId>('electricity');
  const [category, setCategory] = useState<string>(
    dataService.getCategoriesForDepartment('electricity')[0]
  );
  const [areaId, setAreaId] = useState<string>(defaultArea);
  const [description, setDescription] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(
    undefined
  );
  const [formErrorState, setFormErrorState] = useState<{
    key?: string;
    fallback?: string;
  } | null>(null);
  const [submitSuccessId, setSubmitSuccessId] = useState<string | null>(null);

  // Follow-up comment drafts keyed by issueId
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const myReports = dataService.getMyReports(session);
  const categories = dataService.getCategoriesForDepartment(deptId);
  const isGuest = session.role === 'guest';

  const resolvedFormError = formErrorState
    ? formErrorState.key
      ? t(formErrorState.key)
      : formErrorState.fallback || ''
    : '';

  const handleSelectDept = (nextDept: DepartmentId) => {
    setDeptId(nextDept);
    const cats = dataService.getCategoriesForDepartment(nextDept);
    setCategory(cats[0] ?? '');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    setFormErrorState(null);
    const res = dataService.submitCitizenReport(session, {
      departmentId: deptId,
      category,
      areaId,
      description,
      photoDataUrl,
    });
    if (!res.ok) {
      setFormErrorState({
        key:
          res.error === 'Please enter a short description first.'
            ? 'errors:descriptionRequired'
            : undefined,
        fallback: res.error,
      });
      return;
    }
    setSubmitSuccessId(res.issue.id);
    setDescription('');
    setPhotoDataUrl(undefined);
    setStep(1);
  };

  const handlePostComment = (issueId: string) => {
    const text = commentDrafts[issueId] ?? '';
    const res = dataService.addCitizenComment(session, issueId, text);
    if (res.ok) {
      setCommentDrafts((prev) => ({ ...prev, [issueId]: '' }));
    }
  };

  const selectedAreaObj = areas.find((a) => a.id === areaId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#5A4A42]">
          {t('report:title')}
        </h1>
        <p className="text-sm text-[#7A6A62] mt-0.5">
          {localizeDigits(t('report:subtitle'), language, useNativeNumerals)}
        </p>
      </div>

      {/* 3-Step Report Form */}
      <div className="cp-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#5A4A42]">
            {t('report:newReportTitle')}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {[1, 2, 3].map((num) => (
              <span
                key={num}
                className={`h-7 px-3 rounded-full inline-flex items-center whitespace-nowrap ${
                  step === num
                    ? 'bg-[#FF9B71] text-[#5A4A42]'
                    : step > num
                    ? 'bg-[#EAF8F0] text-[#0D3B20]'
                    : 'bg-[#FFF9F2] text-[#7A6A62] border border-[#F0E6DF]'
                }`}
              >
                {localizeDigits(
                  t('report:stepBadge', { step: num }),
                  language,
                  useNativeNumerals
                )}
              </span>
            ))}
          </div>
        </div>

        {isGuest ? (
          <div className="rounded-2xl bg-[#FFF0E6]/65 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#5A4A42]">
                {t('report:guestTitle')}
              </p>
              <p className="text-sm text-[#7A6A62]">{t('report:guestDesc')}</p>
            </div>
            <button
              type="button"
              onClick={onRequestSignIn}
              className="h-11 px-5 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              {t('report:signInToReport')}
            </button>
          </div>
        ) : (
          <>
            {submitSuccessId && (
              <div className="rounded-2xl bg-[#EAF8F0] border border-[#5FCB8A]/50 px-4 py-3 text-sm font-semibold text-[#0D3B20] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {t('report:submitSuccess', { id: submitSuccessId })}
                </span>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#5A4A42]">
                    {localizeDigits(
                      t('report:chooseDepartment'),
                      language,
                      useNativeNumerals
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectDept(d.id)}
                        className={`min-h-10 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                          deptId === d.id
                            ? 'bg-[#FF9B71] border-[#FF9B71] text-[#5A4A42]'
                            : 'bg-white border-[#F0E6DF] text-[#7A6A62] hover:bg-[#FFF0E6]'
                        }`}
                      >
                        {getDepartmentLabel(d.id, t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#5A4A42]">
                    {t('report:chooseCategory')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`min-h-10 px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors cursor-pointer ${
                          category === cat
                            ? 'bg-[#FFF0E6] border-[#FF9B71] text-[#5A4A42]'
                            : 'bg-[#FFF9F2] border-[#F0E6DF] text-[#7A6A62]'
                        }`}
                      >
                        {getCategoryLabel(cat, t)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-11 px-6 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>{t('report:nextStep2')}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="rep-area"
                    className="block text-sm font-semibold text-[#5A4A42]"
                  >
                    {localizeDigits(
                      t('report:chooseArea'),
                      language,
                      useNativeNumerals
                    )}
                  </label>
                  <select
                    id="rep-area"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="cp-input w-full px-4 cursor-pointer"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {getAreaLabel(a.id, language, a.name)} (
                        {t('common:zoneWithLabel', {
                          zone: getZoneLabel(a.zone, language),
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="rep-desc"
                    className="block text-sm font-semibold text-[#5A4A42]"
                  >
                    {t('report:descriptionLabel')}
                  </label>
                  <textarea
                    id="rep-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('report:descriptionPlaceholder')}
                    className="cp-input w-full p-4 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[#5A4A42]">
                    {t('report:optionalPhoto')}
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="h-11 px-4 rounded-full bg-[#FFF9F2] border border-[#F0E6DF] hover:bg-[#FFF0E6] text-sm font-semibold text-[#5A4A42] inline-flex items-center gap-2 cursor-pointer">
                      <Camera className="w-4 h-4 text-[#964825]" aria-hidden="true" />
                      <span>
                        {photoDataUrl
                          ? t('report:changePhoto')
                          : t('report:uploadPhoto')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>
                    {photoDataUrl && (
                      <img
                        src={photoDataUrl}
                        alt={t('report:uploadPreviewAlt')}
                        className="h-14 w-14 rounded-xl object-cover border border-[#F0E6DF]"
                      />
                    )}
                  </div>
                </div>

                {resolvedFormError && (
                  <p className="text-sm font-medium text-[#9E2A2B]">
                    {resolvedFormError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-11 px-5 rounded-full border border-[#F0E6DF] bg-white hover:bg-[#FFF0E6] text-sm font-semibold text-[#5A4A42] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('common:actions.back')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!description.trim()) {
                        setFormErrorState({ key: 'errors:descriptionRequired' });
                        return;
                      }
                      setFormErrorState(null);
                      setStep(3);
                    }}
                    className="h-11 px-6 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>{t('report:reviewReport')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#FFF9F2] border border-[#F0E6DF] p-4 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-[#5A4A42]">
                      {t('report:reviewDepartment')}{' '}
                    </span>
                    <span>{getDepartmentLabel(deptId, t)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#5A4A42]">
                      {t('report:reviewCategory')}{' '}
                    </span>
                    <span>{getCategoryLabel(category, t)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#5A4A42]">
                      {t('report:reviewArea')}{' '}
                    </span>
                    <span>
                      {selectedAreaObj
                        ? `${getAreaLabel(
                            selectedAreaObj.id,
                            language,
                            selectedAreaObj.name
                          )} (${t('common:zoneWithLabel', {
                            zone: getZoneLabel(selectedAreaObj.zone, language),
                          })})`
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#5A4A42]">
                      {t('report:reviewDetails')}{' '}
                    </span>
                    <span>{description}</span>
                  </div>
                </div>

                {resolvedFormError && (
                  <p className="text-sm font-medium text-[#9E2A2B]">
                    {resolvedFormError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-11 px-5 rounded-full border border-[#F0E6DF] bg-white hover:bg-[#FFF0E6] text-sm font-semibold text-[#5A4A42] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{t('common:actions.edit')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="h-11 px-6 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm cursor-pointer"
                  >
                    {t('report:submitBtn')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* My Reports Tracker */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#5A4A42]">
          {localizeDigits(
            t('report:myReportsTitle', { count: myReports.length }),
            language,
            useNativeNumerals
          )}
        </h2>

        {myReports.length === 0 ? (
          <EmptyState
            title={t('report:noReportsTitle')}
            description={t('report:noReportsDesc')}
          />
        ) : (
          <div className="space-y-4">
            {myReports.map((rep) => (
              <div key={rep.id} className="cp-card p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#7A6A62] tabular-nums">
                        {rep.id}
                      </span>
                      <DepartmentBadge
                        departmentId={rep.departmentId}
                        label={getDepartmentLabel(rep.departmentId, t)}
                      />
                    </div>
                    <h3 className="text-base font-bold text-[#5A4A42]">
                      <TranslatableText text={rep.title} autoTranslate />
                    </h3>
                    <p className="text-sm text-[#7A6A62]">
                      <TranslatableText text={rep.description} autoTranslate />
                    </p>
                  </div>

                  <IssueStatusBadge
                    status={rep.status}
                    scheduled={rep.scheduled}
                  />
                </div>

                {rep.scheduled && (
                  <div className="rounded-xl bg-[#E8F4FD] px-4 py-2.5 text-sm font-semibold text-[#0B4F78] flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      {t('report:scheduledLine', {
                        date: formatDateLocalized(
                          rep.scheduled.date,
                          language,
                          useNativeNumerals
                        ),
                        time: formatTimeLocalized(
                          rep.scheduled.time,
                          language,
                          useNativeNumerals
                        ),
                      })}
                      {rep.scheduled.etaNote ? ` · ${rep.scheduled.etaNote}` : ''}
                    </span>
                  </div>
                )}

                {rep.photoDataUrl && (
                  <img
                    src={rep.photoDataUrl}
                    alt={t('report:attachmentAlt')}
                    className="h-28 rounded-xl object-cover border border-[#F0E6DF]"
                  />
                )}

                {/* Simple Vertical Timeline */}
                <div className="rounded-2xl bg-[#FFF9F2] border border-[#F5EDE6] p-4 space-y-3">
                  <div className="text-xs font-bold text-[#5A4A42]">
                    {t('report:timelineTitle')}
                  </div>
                  <div className="space-y-2.5">
                    {rep.timeline.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-[#5A4A42]">
                            {ev.actorName}:{' '}
                          </span>
                          <span className="text-[#7A6A62]">
                            <TranslatableText text={ev.message} autoTranslate />
                          </span>
                        </div>
                        <span className="text-xs text-[#7A6A62] whitespace-nowrap shrink-0 tabular-nums">
                          {formatRelativeTimeText(
                            ev.timestamp,
                            t,
                            language,
                            useNativeNumerals
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citizen Follow-Up Comment */}
                {!isGuest && (
                  <div className="flex items-center gap-2 pt-1">
                    <MessageSquare
                      className="w-4 h-4 text-[#9C8B82] shrink-0"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={commentDrafts[rep.id] ?? ''}
                      onChange={(e) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [rep.id]: e.target.value,
                        }))
                      }
                      placeholder={t('report:commentPlaceholder')}
                      className="cp-input flex-1 px-3.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handlePostComment(rep.id)}
                      className="h-11 px-4 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-4 h-4" aria-hidden="true" />
                      <span>{t('common:actions.send')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
