import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdjustmentAppeal, AppealType } from '../../types';
import { canReviewAppeals, canSubmitAppeal, ROLE_METADATA } from '../../utils/rbac';
import {
  FileQuestion,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  MessageSquare,
  ShieldCheck,
  Send,
  AlertCircle,
  FileCheck,
  Layers,
  Award,
} from 'lucide-react';

const APPEAL_TYPE_LABELS: Record<AppealType, { label: string; color: string }> = {
  remove_penalty: { label: 'Hủy bỏ điểm trừ / Khiếu nại lỗi', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  add_bonus: { label: 'Đề nghị cộng điểm thưởng / Thành tích', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  adjust_score: { label: 'Điều chỉnh số lượng vi phạm', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  dispute_violation: { label: 'Xác minh lại sự việc vi phạm', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const AppealsManager: React.FC = () => {
  const {
    appeals,
    submitAppeal,
    reviewAppeal,
    currentUser,
    userRole,
    classes,
    campuses,
    criteria,
    selectedWeek,
  } = useApp();

  if (!currentUser) return null;

  // GVCN state
  const isGVCN = userRole === 'gvcn';
  const myClass = classes.find((c) => c.id === currentUser.classId) || classes[0];
  const myCampus = campuses.find((c) => c.id === myClass?.campusId) || campuses[0];

  const canReview = canReviewAppeals(currentUser);

  // Form State for GVCN
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetWeek, setTargetWeek] = useState(selectedWeek);
  const [appealType, setAppealType] = useState<AppealType>('remove_penalty');
  const [criteriaName, setCriteriaName] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [proposedPoints, setProposedPoints] = useState<number>(1);
  const [formError, setFormError] = useState('');

  // Review Dialog State for BGH / TPT
  const [selectedAppealForReview, setSelectedAppealForReview] = useState<AdjustmentAppeal | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [autoAdjustScore, setAutoAdjustScore] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Visible Appeals: GVCN only sees their class; Reviewers see their campus or all
  const visibleAppeals = appeals.filter((a) => {
    if (isGVCN) {
      if (currentUser.classId && a.classId !== currentUser.classId) return false;
    } else if (currentUser.campusId && (userRole === 'campus_admin' || userRole === 'tpt_doi')) {
      if (a.campusId !== currentUser.campusId) return false;
    }

    if (statusFilter !== 'all' && a.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchClass = a.className.toLowerCase().includes(q);
      const matchTeacher = a.teacherName.toLowerCase().includes(q);
      const matchReason = a.reason.toLowerCase().includes(q);
      const matchCampus = a.campusName.toLowerCase().includes(q);
      if (!matchClass && !matchTeacher && !matchReason && !matchCampus) return false;
    }

    return true;
  });

  const handleSubmitNewAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setFormError('Vui lòng nhập lý do giải trình / đề nghị điều chỉnh cụ thể.');
      return;
    }

    const res = submitAppeal({
      classId: myClass.id,
      className: myClass.name,
      campusId: myCampus.id,
      campusName: myCampus.name,
      week: targetWeek,
      appealType,
      criteriaName: criteriaName.trim() || 'Nội quy chung',
      reason: reason.trim(),
      evidenceNotes: evidenceNotes.trim() || undefined,
      proposedPoints: Number(proposedPoints) || 1,
    });

    if (res.success) {
      setShowCreateModal(false);
      setReason('');
      setEvidenceNotes('');
      setFormError('');
    } else {
      setFormError(res.message);
    }
  };

  const handleConfirmReview = (status: 'approved' | 'rejected') => {
    if (!selectedAppealForReview) return;
    reviewAppeal(selectedAppealForReview.id, status, reviewNotes, autoAdjustScore);
    setSelectedAppealForReview(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <FileQuestion size={22} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
              Phản hồi & Đề nghị điều chỉnh điểm thi đua
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Kênh trao đổi chính thức giữa Giáo viên chủ nhiệm, Đội Cờ đỏ và Ban Giám hiệu / TPT Đội.
            Mọi phản hồi và quyết định phê duyệt đều được lưu vết kiểm toán đầy đủ.
          </p>
        </div>

        {/* Action Button for GVCN */}
        {isGVCN && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm cursor-pointer shrink-0"
          >
            <PlusCircle size={16} />
            <span>Gửi phản hồi lớp {myClass?.name}</span>
          </button>
        )}
      </div>

      {/* Role Notice Card */}
      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 flex items-start gap-3 text-xs sm:text-sm text-blue-900">
        <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Quyền hạn của bạn: </span>
          <span className="font-semibold text-blue-700">{ROLE_METADATA[userRole]?.name}</span> —{' '}
          {isGVCN
            ? `Chỉ có quyền xem và gửi phản hồi đối với lớp ${myClass?.name} (${myCampus?.name}).`
            : canReview
            ? 'Bạn có thẩm quyền xét duyệt, phê chuẩn hoặc từ chối các đề nghị điều chỉnh điểm thi đua.'
            : 'Chế độ xem các khiếu nại đã giải quyết.'}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo lớp, giáo viên chủ nhiệm, nội dung lý do khiếu nại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs sm:text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái ({visibleAppeals.length})</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="approved">Đã chấp thuận</option>
            <option value="rejected">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Appeals List Cards */}
      <div className="space-y-3">
        {visibleAppeals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 size={36} className="mx-auto text-slate-300 mb-2" />
            Không có phản hồi hoặc đề nghị điều chỉnh nào trong danh sách.
          </div>
        ) : (
          visibleAppeals.map((appeal) => {
            const typeInfo = APPEAL_TYPE_LABELS[appeal.appealType];
            return (
              <div
                key={appeal.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      Lớp {appeal.className}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {appeal.campusName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Tuần {appeal.week}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {appeal.proposedPoints !== undefined && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {appeal.proposedPoints > 0 ? `+${appeal.proposedPoints}đ` : `${appeal.proposedPoints}đ`}
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-semibold text-slate-800">
                    Tiêu chí liên quan: <span className="text-blue-700 font-bold">{appeal.criteriaName}</span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <strong>Lý do giải trình:</strong> {appeal.reason}
                    {appeal.evidenceNotes && (
                      <div className="text-xs text-slate-500 mt-1">
                        <strong>Minh chứng:</strong> {appeal.evidenceNotes}
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
                    <span>GVCN: <strong className="text-slate-600">{appeal.teacherName}</strong></span>
                    <span>Gửi lúc: {new Date(appeal.createdAt).toLocaleString('vi-VN')}</span>
                    {appeal.reviewedAt && (
                      <span>
                        Duyệt bởi: <strong className="text-slate-600">{appeal.reviewerName}</strong> ({new Date(appeal.reviewedAt).toLocaleString('vi-VN')})
                      </span>
                    )}
                  </div>

                  {appeal.reviewNotes && (
                    <div className="text-xs p-2.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                      <strong>Ý kiến phản hồi của BGH:</strong> {appeal.reviewNotes}
                    </div>
                  )}
                </div>

                {/* Status & Review Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {appeal.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock size={12} />
                      <span>Chờ phê duyệt</span>
                    </span>
                  )}
                  {appeal.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={12} />
                      <span>Đã chấp thuận</span>
                    </span>
                  )}
                  {appeal.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      <XCircle size={12} />
                      <span>Đã từ chối</span>
                    </span>
                  )}

                  {canReview && appeal.status === 'pending' && (
                    <button
                      onClick={() => {
                        setSelectedAppealForReview(appeal);
                        setReviewNotes('');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Xét duyệt
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Submit Appeal (GVCN) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <Send size={18} className="text-blue-600" />
                Gửi đề nghị điều chỉnh điểm lớp {myClass?.name}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewAppeal} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tuần thi đua</label>
                  <select
                    value={targetWeek}
                    onChange={(e) => setTargetWeek(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <option key={w} value={w}>Tuần {w}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại đề xuất</label>
                  <select
                    value={appealType}
                    onChange={(e) => setAppealType(e.target.value as AppealType)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="remove_penalty">Hủy bỏ điểm trừ / Khiếu nại</option>
                    <option value="add_bonus">Đề xuất cộng thưởng</option>
                    <option value="adjust_score">Điều chỉnh số lượng vi phạm</option>
                    <option value="dispute_violation">Xác minh lại sự việc vi phạm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu chí liên quan</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tác phong đồng phục, Lao động vệ sinh, Chào cờ..."
                  value={criteriaName}
                  onChange={(e) => setCriteriaName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm đề nghị điều chỉnh</label>
                <input
                  type="number"
                  step="0.5"
                  value={proposedPoints}
                  onChange={(e) => setProposedPoints(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do / Giải trình chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Nêu rõ diễn biến sự việc, tên học sinh và lý do khách quan cần xem xét lại..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minh chứng / Người xác nhận (nếu có)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Giấy phép của GV bộ môn, bác bảo vệ ký nhận lúc 17h..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Gửi đề nghị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Review Appeal (BGH / TPT) */}
      {selectedAppealForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <FileCheck size={18} className="text-blue-600" />
                Xét duyệt phản hồi lớp {selectedAppealForReview.className} (Tuần {selectedAppealForReview.week})
              </h3>
              <button
                onClick={() => setSelectedAppealForReview(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                <div><strong>Lớp:</strong> {selectedAppealForReview.className} ({selectedAppealForReview.campusName})</div>
                <div><strong>GVCN:</strong> {selectedAppealForReview.teacherName}</div>
                <div><strong>Tiêu chí:</strong> {selectedAppealForReview.criteriaName}</div>
                <div><strong>Lý do giải trình:</strong> {selectedAppealForReview.reason}</div>
                {selectedAppealForReview.evidenceNotes && (
                  <div><strong>Minh chứng:</strong> {selectedAppealForReview.evidenceNotes}</div>
                )}
                <div><strong>Điểm đề xuất:</strong> +{selectedAppealForReview.proposedPoints || 1}đ</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ý kiến kết luận của BGH / TPT Đội
                </label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú xác nhận sau khi kiểm tra sổ trực hoặc trao đổi với GVCN..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  id="autoAdjust"
                  checked={autoAdjustScore}
                  onChange={(e) => setAutoAdjustScore(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoAdjust" className="cursor-pointer">
                  Tự động ghi nhận biên bản bù điểm vào bảng thi đua nếu chấp thuận
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppealForReview(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview('rejected')}
                  className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-semibold"
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmReview('approved')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  Phê duyệt chấp thuận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
