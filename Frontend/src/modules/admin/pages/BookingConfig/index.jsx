import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  FiSliders, FiLoader, FiFileText, FiImage, FiPlusCircle, FiAlertTriangle, FiMessageCircle,
  FiAlertOctagon, FiTarget, FiPercent, FiDollarSign, FiRepeat, FiSave, FiX, FiPlus, FiCalendar
} from 'react-icons/fi';
import bookingFeaturesAdminService from '../../services/bookingFeaturesAdminService';
import { PageHeader, Card, Toggle, Field, Button } from '../../components/adminUi';
import { inputClass } from '../../components/adminFormat';

/**
 * Booking Configuration
 *
 * Every booking feature built for the user and worker apps is switched on/off
 * and tuned here: notes, problem media, add-ons, emergency bookings, chat,
 * disputes, worker assignment, commission default, payouts and recurring
 * bookings. Changes are saved together and pushed to open apps immediately.
 */

const NumberInput = ({ value, onChange, min, max, step = 1, suffix, disabled }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={inputClass}
    />
    {suffix && <span className="shrink-0 text-xs text-gray-500">{suffix}</span>}
  </div>
);

const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      {description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

const FREQUENCIES = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Every 2 weeks' },
  { key: 'monthly', label: 'Monthly' }
];

const BookingConfig = () => {
  const [config, setConfig] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newReason, setNewReason] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bookingFeaturesAdminService.getConfig();
      if (res.success) {
        setConfig(res.config);
        setSaved(res.config);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load booking configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key) => (value) => setConfig((prev) => ({ ...prev, [key]: value }));

  // Only changed keys are sent, so a save never overwrites a value another
  // admin changed meanwhile on a field this admin did not touch.
  const changes = useMemo(() => {
    if (!config || !saved) return {};
    return Object.fromEntries(
      Object.entries(config).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(saved[k]))
    );
  }, [config, saved]);
  const dirty = Object.keys(changes).length > 0;

  const weightTotal = config
    ? (Number(config.assignmentDistanceWeight) || 0) + (Number(config.assignmentRatingWeight) || 0)
      + (Number(config.assignmentAcceptanceWeight) || 0) + (Number(config.assignmentCompletionWeight) || 0)
    : 0;

  const save = async () => {
    if (!dirty) return;
    if (Object.values(changes).some((v) => v === '')) {
      toast.error('Please fill in every number field');
      return;
    }
    setSaving(true);
    try {
      const res = await bookingFeaturesAdminService.updateConfig(changes);
      if (res.success) {
        setConfig(res.config);
        setSaved(res.config);
        toast.success('Booking configuration saved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <FiLoader className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Could not load booking configuration.
          <button onClick={load} className="ml-3 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Retry</button>
        </div>
      </div>
    );
  }

  const toggleFrequency = (key) => {
    const list = config.recurringFrequencies || [];
    const next = list.includes(key) ? list.filter((f) => f !== key) : [...list, key];
    if (next.length === 0) {
      toast.error('Keep at least one frequency');
      return;
    }
    set('recurringFrequencies')(next);
  };

  const addReason = () => {
    const r = newReason.trim();
    if (!r) return;
    if ((config.disputeReasons || []).includes(r)) return toast.error('That reason already exists');
    set('disputeReasons')([...(config.disputeReasons || []), r]);
    setNewReason('');
  };

  return (
    <div className="p-4 pb-28 sm:p-6 sm:pb-28">
      <PageHeader
        icon={FiSliders}
        title="Booking Configuration"
        description="Switch booking features on or off and set their limits. Saved changes reach the user and worker apps immediately."
      />

      <div className="space-y-6">
        {/* Notes */}
        <Card title="Customer Notes" icon={FiFileText}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleRow label="Instructions at checkout" description="Customers can add notes for the professional (gate code, parking, details of the problem)." checked={config.isCustomerNotesEnabled} onChange={set('isCustomerNotesEnabled')} />
            <Field label="Maximum length" hint="Characters, 50–2000.">
              <NumberInput value={config.customerNotesMaxLength} onChange={set('customerNotesMaxLength')} min={50} max={2000} suffix="chars" />
            </Field>
          </div>
        </Card>

        {/* Media */}
        <Card title="Problem Photos & Videos" icon={FiImage}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Photos per booking" hint="0 hides photo upload.">
              <NumberInput value={config.maxIssuePhotos} onChange={set('maxIssuePhotos')} min={0} max={10} />
            </Field>
            <ToggleRow label="Video upload" description="Customers can attach short videos of the problem." checked={config.isIssueVideoEnabled} onChange={set('isIssueVideoEnabled')} />
            <Field label="Videos per booking">
              <NumberInput value={config.maxIssueVideos} onChange={set('maxIssueVideos')} min={0} max={3} disabled={!config.isIssueVideoEnabled} />
            </Field>
            <Field label="Max video size">
              <NumberInput value={config.maxIssueVideoSizeMB} onChange={set('maxIssueVideoSizeMB')} min={1} max={100} suffix="MB" disabled={!config.isIssueVideoEnabled} />
            </Field>
            <Field label="Max video length">
              <NumberInput value={config.maxIssueVideoDurationSec} onChange={set('maxIssueVideoDurationSec')} min={5} max={300} suffix="sec" disabled={!config.isIssueVideoEnabled} />
            </Field>
          </div>
        </Card>

        {/* Add-ons */}
        <Card title="Add-ons" icon={FiPlusCircle}>
          <ToggleRow label="Add-ons at checkout" description="Show the extras configured on the Add-ons page for each service. Prices are taxed like the service and paid to the worker per their commission." checked={config.isAddOnsEnabled} onChange={set('isAddOnsEnabled')} />
        </Card>

        {/* Emergency */}
        <Card title="Emergency Bookings" icon={FiAlertTriangle}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ToggleRow label="Emergency booking" description="Offered only on categories marked “Emergency available” in category settings." checked={config.isEmergencyEnabled} onChange={set('isEmergencyEnabled')} />
            <Field label="Surcharge type">
              <select value={config.emergencySurchargeType} onChange={(e) => set('emergencySurchargeType')(e.target.value)} className={inputClass}>
                <option value="fixed">Fixed amount (₹)</option>
                <option value="percentage">Percentage of service</option>
              </select>
            </Field>
            <Field label={config.emergencySurchargeType === 'percentage' ? 'Surcharge (%)' : 'Surcharge (₹)'} hint="Added to the service amount; GST applies.">
              <NumberInput value={config.emergencySurchargeValue} onChange={set('emergencySurchargeValue')} min={0} suffix={config.emergencySurchargeType === 'percentage' ? '%' : '₹'} />
            </Field>
            <Field label="Search radius" hint="Wider than the normal search.">
              <NumberInput value={config.emergencySearchRadius} onChange={set('emergencySearchRadius')} min={1} max={200} suffix="km" />
            </Field>
            <Field label="Workers alerted at once" hint="First alert wave size for emergencies.">
              <NumberInput value={config.emergencyFirstWaveSize} onChange={set('emergencyFirstWaveSize')} min={1} max={50} />
            </Field>
            <Field label="Search time limit" hint="Booking is cancelled if nobody accepts.">
              <NumberInput value={config.emergencyMaxSearchTime} onChange={set('emergencyMaxSearchTime')} min={1} max={60} suffix="min" />
            </Field>
          </div>
        </Card>

        {/* Chat */}
        <Card title="Customer ↔ Professional Chat" icon={FiMessageCircle}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ToggleRow label="Booking chat" description="Customer and assigned professional can message each other inside the booking." checked={config.isChatEnabled} onChange={set('isChatEnabled')} />
            <ToggleRow label="Photos in chat" description="Allow sending images in chat." checked={config.isChatImageEnabled} onChange={set('isChatImageEnabled')} />
            <ToggleRow label="Hide phone numbers" description="Masks phone numbers typed in messages to keep contact on-platform." checked={config.chatMaskPhoneNumbers} onChange={set('chatMaskPhoneNumbers')} />
            <Field label="Close chat after booking ends" hint="Chat becomes read-only after this many hours. 0 closes it immediately.">
              <NumberInput value={config.chatCloseAfterHours} onChange={set('chatCloseAfterHours')} min={0} max={720} suffix="hours" />
            </Field>
          </div>
        </Card>

        {/* Disputes */}
        <Card title="Disputes" icon={FiAlertOctagon}>
          <div className="grid gap-4 sm:grid-cols-3">
            <ToggleRow label="Dispute reporting" description="Customers and professionals can report a problem on a finished or cancelled booking." checked={config.isDisputeEnabled} onChange={set('isDisputeEnabled')} />
            <Field label="Reporting window" hint="Days after the booking ends.">
              <NumberInput value={config.disputeWindowDays} onChange={set('disputeWindowDays')} min={1} max={90} suffix="days" />
            </Field>
            <Field label="Evidence photos per message">
              <NumberInput value={config.maxDisputeEvidence} onChange={set('maxDisputeEvidence')} min={0} max={10} />
            </Field>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-gray-700">Reasons customers can choose</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(config.disputeReasons || []).map((r) => (
                <span key={r} className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  {r}
                  <button
                    type="button"
                    aria-label={`Remove ${r}`}
                    onClick={() => {
                      if (config.disputeReasons.length <= 1) return toast.error('Keep at least one reason');
                      set('disputeReasons')(config.disputeReasons.filter((x) => x !== r));
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex max-w-md gap-2">
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value.slice(0, 100))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReason(); } }}
                placeholder="Add a reason"
                className={inputClass}
              />
              <Button variant="secondary" onClick={addReason}><FiPlus /> Add</Button>
            </div>
          </div>
        </Card>

        {/* Assignment */}
        <Card title="Worker Assignment" icon={FiTarget}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Strategy" hint="Smart ranks nearby workers by the weights below; Distance alerts the closest first.">
              <select value={config.assignmentStrategy} onChange={(e) => set('assignmentStrategy')(e.target.value)} className={inputClass}>
                <option value="smart">Smart (distance, rating, acceptance, completion)</option>
                <option value="distance">Distance only</option>
              </select>
            </Field>
            <Field label="Minimum rating" hint="Workers below this (with 3+ reviews) are not alerted. 0 disables.">
              <NumberInput value={config.assignmentMinRating} onChange={set('assignmentMinRating')} min={0} max={5} step={0.1} suffix="★" />
            </Field>
            <Field label="Stats window" hint="Acceptance and completion rates look back this far.">
              <NumberInput value={config.assignmentStatsWindowDays} onChange={set('assignmentStatsWindowDays')} min={7} max={365} suffix="days" />
            </Field>
          </div>

          {config.assignmentStrategy === 'smart' && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Ranking weights</span>
                <span className={`text-xs font-semibold ${weightTotal > 0 ? 'text-gray-500' : 'text-red-600'}`}>Total {weightTotal} (relative, need not add to 100)</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Distance"><NumberInput value={config.assignmentDistanceWeight} onChange={set('assignmentDistanceWeight')} min={0} max={100} /></Field>
                <Field label="Rating"><NumberInput value={config.assignmentRatingWeight} onChange={set('assignmentRatingWeight')} min={0} max={100} /></Field>
                <Field label="Acceptance rate"><NumberInput value={config.assignmentAcceptanceWeight} onChange={set('assignmentAcceptanceWeight')} min={0} max={100} /></Field>
                <Field label="Completion rate"><NumberInput value={config.assignmentCompletionWeight} onChange={set('assignmentCompletionWeight')} min={0} max={100} /></Field>
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Wave 1 size" hint="Workers alerted first (the wave timer is on the Settings page).">
              <NumberInput value={config.wave1Size} onChange={set('wave1Size')} min={1} max={50} />
            </Field>
            <Field label="Wave 2 size"><NumberInput value={config.wave2Size} onChange={set('wave2Size')} min={1} max={50} /></Field>
            <Field label="Wave 3 size" hint="Wave 4 alerts everyone left."><NumberInput value={config.wave3Size} onChange={set('wave3Size')} min={1} max={50} /></Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ToggleRow label="Skip ahead on rejection" description="When everyone alerted rejects, alert the next wave immediately instead of waiting." checked={config.autoReassignOnReject} onChange={set('autoReassignOnReject')} />
            <ToggleRow label="Reassign when a worker cancels" description="If the assigned worker cancels before arriving, find another one instead of cancelling the customer's booking." checked={config.autoReassignOnWorkerCancel} onChange={set('autoReassignOnWorkerCancel')} />
            <Field label="Max reassignments per booking">
              <NumberInput value={config.maxReassignments} onChange={set('maxReassignments')} min={0} max={10} disabled={!config.autoReassignOnWorkerCancel} />
            </Field>
          </div>
        </Card>

        {/* Commission */}
        <Card title="Default Commission" icon={FiPercent}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default commission type" hint="Percentage uses the service payout % on the Settings page. Category and worker overrides are on the Commission page.">
              <select value={config.defaultCommissionType} onChange={(e) => set('defaultCommissionType')(e.target.value)} className={inputClass}>
                <option value="percentage">Percentage (Settings → service payout %)</option>
                <option value="fixed">Fixed amount per booking</option>
              </select>
            </Field>
            {config.defaultCommissionType === 'fixed' && (
              <Field label="Fixed commission per booking" hint="Kept by the platform from the service amount (excluding GST).">
                <NumberInput value={config.defaultFixedCommission} onChange={set('defaultFixedCommission')} min={0} suffix="₹" />
              </Field>
            )}
          </div>
        </Card>

        {/* Payouts */}
        <Card title="Payouts" icon={FiDollarSign}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum withdrawal" hint="Smallest amount a worker can request.">
              <NumberInput value={config.minWithdrawalAmount} onChange={set('minWithdrawalAmount')} min={0} suffix="₹" />
            </Field>
          </div>
        </Card>

        {/* Scheduled bookings */}
        <Card title="Scheduled Bookings & Worker Availability" icon={FiCalendar}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Keep searching until" hint="A future booking stays open until this long before its slot, then is cancelled if nobody accepted. Never shorter than the normal search time.">
              <NumberInput value={config.scheduledBookingCutoffHours} onChange={set('scheduledBookingCutoffHours')} min={0} max={72} suffix="hours before the slot" />
            </Field>
            <Field label="Expected job length" hint="Used to tell whether two bookings of one worker overlap.">
              <NumberInput value={config.scheduledJobDurationMinutes} onChange={set('scheduledJobDurationMinutes')} min={15} max={600} suffix="min" />
            </Field>
            <Field label="Travel buffer" hint="Extra time kept free around each job for travel.">
              <NumberInput value={config.scheduledTravelBufferMinutes} onChange={set('scheduledTravelBufferMinutes')} min={0} max={240} suffix="min" />
            </Field>
            <ToggleRow label="Scheduled bookings reach busy workers" description="Workers who are on a job right now still get alerts for future bookings (overlapping slots are always skipped)." checked={config.allowBusyWorkersForScheduled} onChange={set('allowBusyWorkersForScheduled')} />
            <ToggleRow label="Instant bookings skip busy workers" description="A worker who is at work right now does not get instant booking alerts." checked={config.excludeBusyWorkersForInstant} onChange={set('excludeBusyWorkersForInstant')} />
          </div>
        </Card>

        {/* Recurring */}
        <Card title="Recurring Bookings" icon={FiRepeat}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ToggleRow label="Recurring bookings" description="Customers can repeat a slot booking weekly, fortnightly or monthly." checked={config.isRecurringEnabled} onChange={set('isRecurringEnabled')} />
            <Field label="Max visits per plan">
              <NumberInput value={config.recurringMaxOccurrences} onChange={set('recurringMaxOccurrences')} min={2} max={52} />
            </Field>
            <Field label="Discount per visit" hint="On the service amount. 0 disables.">
              <NumberInput value={config.recurringDiscountPercentage} onChange={set('recurringDiscountPercentage')} min={0} max={50} suffix="%" />
            </Field>
            <Field label="Book each visit ahead by" hint="The visit is created and the worker search starts this early.">
              <NumberInput value={config.recurringLeadHours} onChange={set('recurringLeadHours')} min={1} max={168} suffix="hours" />
            </Field>
          </div>
          <div className="mt-4">
            <span className="text-xs font-semibold text-gray-700">Frequencies offered</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {FREQUENCIES.map((f) => {
                const active = (config.recurringFrequencies || []).includes(f.key);
                return (
                  <button
                    type="button"
                    key={f.key}
                    onClick={() => toggleFrequency(f.key)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-[#163B66] bg-[#163B66] text-white' : 'border-gray-300 bg-white text-gray-600'}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className={`fixed bottom-16 lg:bottom-0 right-0 left-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur transition-transform lg:left-[278px] ${dirty ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-gray-600">{Object.keys(changes).length} unsaved change{Object.keys(changes).length === 1 ? '' : 's'}</span>
          <Button variant="secondary" onClick={() => setConfig(saved)} disabled={saving}>Discard</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfig;
