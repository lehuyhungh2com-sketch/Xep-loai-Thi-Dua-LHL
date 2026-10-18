import {
  Criteria,
  ClassItem,
  Campus,
  SchoolSettings,
  ScoreLog,
  EvaluationConfig,
} from '../types';

export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  advancedClassesRatio: 0.7, // Lớp tiên tiến trở lên = 70%/tổng số lớp toàn trường
  excellentClassesRatio: 0.35, // Lớp xuất sắc: 35%/70% tổng số lớp
  goodClassesRatio: 0.35, // Lớp tiên tiến: 35%/70% tổng số lớp
  allowMainCampusExceed70: true, // Riêng trường chính xem xét CLB và HSG tỉnh để vượt 70%
  mainWeakBaseThreshold: 2, // 2 con điểm yếu bắt đầu trừ
  mainWeakBasePoints: 1, // Trừ 1đ cơ sở
  mainWeakStepPoints: 0.5, // Thêm 1 con điểm yếu trừ thêm 0.5đ
  subWeakThreshold: 5, // Các phân hiệu: 5 con điểm yếu trở lên
  subWeakPenalty: 2, // Trừ 2đ
  subWeakMaxCap: 2, // Trừ không quá 2đ
  mainA1GoodThreshold: 13, // Trường chính lớp A1 đạt 13 điểm tốt
  mainA2A3GoodThreshold: 10, // Trường chính lớp A2, A3 đạt 10 con điểm tốt
  subGoodThreshold: 5, // Các phân hiệu đạt 5 con điểm tốt
  goodScoreBonus: 2, // Cộng 2đ
  goodScoreMaxCap: 2, // Cộng không quá 2đ
  dormitoryMaxCap: 3, // Vi phạm bán trú trừ không quá 3 điểm
  ceremonyMaxCap: 0.5, // Đội nghi lễ tối đa không quá 0.5đ/lớp
  lostFoundValueThreshold: 200000, // Giá trị từ 200.000đ trở đi
};

// Full criteria database extracted directly from "Tiêu chí xếp loại lớp 2026 - 2027.pdf"
export const OFFICIAL_CRITERIA_DATABASE: Criteria[] = [
  // 1. Chuyên cần (Nghỉ học có phép không trừ điểm)
  {
    id: 'CC01',
    code: 'CC01',
    legacyId: 'crit_cc_01',
    name: 'Sau tiết 1 không báo cáo là nghỉ học không có lý do',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chuyên cần',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Nghỉ học không phép sau tiết 1 không báo cáo. Nghỉ học có phép không trừ điểm.',
  },
  {
    id: 'CC02',
    code: 'CC02',
    legacyId: 'crit_cc_02',
    name: 'Bỏ tiết không có lý do',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chuyên cần',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Có mặt tại trường nhưng tự ý bỏ tiết không có lý do chính đáng.',
  },

  // 2. Hành vi ứng xử
  {
    id: 'HV01',
    code: 'HV01',
    legacyId: 'crit_hv_01',
    name: 'HS đánh nhau',
    point: 10,
    points: 10,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh tham gia ẩu đả, đánh nhau trong hoặc ngoài trường.',
  },
  {
    id: 'HV02',
    code: 'HV02',
    legacyId: 'crit_hv_02',
    name: 'HS bị đánh',
    point: 5,
    points: 5,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh bị đánh trong các vụ việc xô xát.',
  },
  {
    id: 'HV03',
    code: 'HV03',
    legacyId: 'crit_hv_03',
    name: 'Hút thuốc lá, thuốc lá điện tử, chất gây nghiện, cờ bạc (Bị kỷ luật)',
    point: 10,
    points: 10,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh vi phạm chất kích thích, cờ bạc, thuốc lá điện tử, bị hội đồng kỷ luật xử lý.',
  },
  {
    id: 'HV04',
    code: 'HV04',
    legacyId: 'crit_hv_04',
    name: 'Trộm cắp bị hạ 1 bậc hạnh kiểm',
    point: 10,
    points: 10,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Hành vi trộm cắp tài sản của nhà trường hoặc bạn học, bị hạ 1 bậc hạnh kiểm.',
  },
  {
    id: 'HV05',
    code: 'HV05',
    legacyId: 'crit_hv_05',
    name: 'Nói tục, chửi bậy',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Phát ngôn thiếu văn hóa, nói tục chửi bậy trong khuôn viên trường học.',
  },
  {
    id: 'HV06',
    code: 'HV06',
    legacyId: 'crit_hv_06',
    name: 'Đi xe trong trường không đúng quy định',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đi xe đạp, xe đạp điện trong sân trường, không dắt xe vào nhà xe theo quy định.',
  },
  {
    id: 'HV07',
    code: 'HV07',
    legacyId: 'crit_hv_07',
    name: 'Ăn quà Trong trường',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Ăn quà vặt trong lớp học, sân trường, gây mất mỹ quan và vệ sinh chung.',
  },
  {
    id: 'HV08',
    code: 'HV08',
    legacyId: 'crit_hv_08',
    name: 'Sử dụng chất thải nhựa, hộp xốp',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Mang theo hoặc sử dụng đồ nhựa dùng 1 lần, hộp xốp gây hại môi trường trong trường học.',
  },
  {
    id: 'HV09',
    code: 'HV09',
    legacyId: 'crit_hv_09',
    name: 'Đá bóng trong trường không đúng nơi quy định',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đá bóng ở hành lang, trước cửa lớp học hoặc khu vực cấm.',
  },
  {
    id: 'HV10',
    code: 'HV10',
    legacyId: 'crit_hv_10',
    name: 'HS ra khỏi cổng trường trong buổi học khi không có sự cho phép của giáo viên',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Hành vi ứng xử',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Tự ý ra khỏi cổng trường giữa giờ học khi chưa được sự đồng ý của thầy cô giáo.',
  },

  // 3. Tác phong - Trang phục
  {
    id: 'TP01',
    code: 'TP01',
    legacyId: 'crit_tp_01',
    name: 'HS mặc quần mài rách',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Mặc trang phục không đúng tác phong học sinh (quần bò rách, mài te tua).',
  },
  {
    id: 'TP02',
    code: 'TP02',
    legacyId: 'crit_tp_02',
    name: 'Không sơ vin',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không bỏ áo vào quần (không sơ vin) theo quy định nề nếp tác phong.',
  },
  {
    id: 'TP03',
    code: 'TP03',
    legacyId: 'crit_tp_03',
    name: 'Đi dép lê, dẫm quai',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đi dép không có quai hậu, dép lê hoặc dẫm bẹp quai dép khi đến trường.',
  },
  {
    id: 'TP04',
    code: 'TP04',
    legacyId: 'crit_tp_04',
    name: 'Không đeo khăn quàng',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đội viên không đeo khăn quàng đỏ trong các buổi học tập và hoạt động Đội.',
  },
  {
    id: 'TP05',
    code: 'TP05',
    legacyId: 'crit_tp_05',
    name: 'HS nhuộm tóc màu sặc sỡ, đánh phấn, sơn móng tay',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Nhuộm tóc khác màu đen/tự nhiên, trang điểm son phấn, sơn móng tay chân.',
  },
  {
    id: 'TP06',
    code: 'TP06',
    legacyId: 'crit_tp_06',
    name: 'Vi phạm đồng phục vào thứ 2,4,6 (Các ngày còn lại mặc bình thường áo phải có cổ bẻ)',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lỗi/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không mặc đúng đồng phục quy định vào các ngày thứ 2, 4, 6 hoặc mặc áo không có cổ bẻ vào ngày thường.',
  },
  {
    id: 'TP07',
    code: 'TP07',
    legacyId: 'crit_tp_07',
    name: 'Không đeo phù hiệu',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không đeo phù hiệu học sinh trên ngực áo theo quy chế.',
  },
  {
    id: 'TP08',
    code: 'TP08',
    legacyId: 'crit_tp_08',
    name: 'Đeo phù hiệu không đúng, vẽ bậy lên phù hiệu (đối với phân hiệu có làm PH)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Tác phong - Trang phục',
    unit: 'lần',
    period: 'week',
    scope: 'sub_with_badge',
    condition: 'Chỉ áp dụng với các phân hiệu có cấp và yêu cầu đeo phù hiệu.',
    isActive: true,
    description: 'Làm hỏng, vẽ bậy hoặc đeo phù hiệu sai quy cách.',
  },

  // 4. Sinh hoạt TT (TPT Đội, Lớp trực đánh giá trực tiếp)
  {
    id: 'SH01',
    code: 'SH01',
    legacyId: 'crit_sh_01',
    name: 'Xếp hàng chậm, lộn xộn, mất trật tự bị nhắc nhở',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Sinh hoạt TT',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Xếp hàng chào cờ, thể dục giữa giờ hoặc tập trung chậm chạp, gây mất trật tự.',
  },
  {
    id: 'SH02',
    code: 'SH02',
    legacyId: 'crit_sh_02',
    name: 'Sinh hoạt lớp đầu giờ HS chạy lộn xộn, ồn ào',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Sinh hoạt TT',
    unit: 'buổi',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: '15 phút truy bài/sinh hoạt đầu giờ không nghiêm túc, mất trật tự.',
  },
  {
    id: 'SH03',
    code: 'SH03',
    legacyId: 'crit_sh_03',
    name: 'HS trốn SHTT',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Sinh hoạt TT',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh cố tình trốn sinh hoạt tập thể, chào cờ, thể dục giữa giờ.',
  },

  // 5. Lao động, vệ sinh
  {
    id: 'VS01',
    code: 'VS01',
    legacyId: 'crit_vs_01',
    name: 'Trực nhật bẩn (không làm trực nhật)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không phân công hoặc không thực hiện trực nhật, để lớp bẩn.',
  },
  {
    id: 'VS02',
    code: 'VS02',
    legacyId: 'crit_vs_02',
    name: 'Trực nhật muộn',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đến giờ vào học nhưng lớp vẫn chưa quét dọn, lau bảng xong.',
  },
  {
    id: 'VS03',
    code: 'VS03',
    legacyId: 'crit_vs_03',
    name: 'Chưa đổ rác',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Rác trong sọt lớp học chưa được mang đi đổ theo quy định.',
  },
  {
    id: 'VS04',
    code: 'VS04',
    legacyId: 'crit_vs_04',
    name: 'Đổ rác không đúng nơi quy định',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Vứt rác bừa bãi ra sân trường, bồn hoa hoặc đổ rác sai vị trí.',
  },
  {
    id: 'VS05',
    code: 'VS05',
    legacyId: 'crit_vs_05',
    name: 'Vệ sinh khu vực chung bẩn',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Khu vực hành lang, sân trường được phân công vệ sinh chưa sạch sẽ.',
  },
  {
    id: 'VS06',
    code: 'VS06',
    legacyId: 'crit_vs_06',
    name: 'Vệ sinh bồn hoa',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Lao động, vệ sinh',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Bồn hoa, cây cảnh của lớp để cỏ mọc um tùm, có rác thải.',
  },

  // 6. Bảo vệ của công (Làm hư, hỏng phải đền Theo QĐ của nhà trường)
  {
    id: 'VC01',
    code: 'VC01',
    legacyId: 'crit_vc_01',
    name: 'Tất cả HS ra sinh hoạt tập thể hoặc ra về không tắt các thiết bị điện',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bảo vệ của công',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không tắt quạt, đèn, máy chiếu khi ra khỏi phòng học gây lãng phí điện.',
  },
  {
    id: 'VC02',
    code: 'VC02',
    legacyId: 'crit_vc_02',
    name: 'Vẽ bậy (bàn ghế, tường, nơi công cộng)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bảo vệ của công',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Viết, vẽ bậy lên bàn ghế, tường lớp học hoặc khu vực công cộng.',
  },
  {
    id: 'VC03',
    code: 'VC03',
    legacyId: 'crit_vc_03',
    name: 'Làm vỡ cửa kính. Làm hỏng đồ dùng của nhà trường',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bảo vệ của công',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Làm hư hại trang thiết bị, cửa kính, bàn ghế của nhà trường (phải bồi thường theo quy định).',
  },

  // 7. Trật tự ATGT
  {
    id: 'GT01',
    code: 'GT01',
    legacyId: 'crit_gt_01',
    name: 'Không đội mũ bảo hiểm khi đi xe đạp điện, hoặc ngồi sau xe gắn máy, xe điện',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Trật tự ATGT',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không đội mũ bảo hiểm khi điều khiển xe đạp điện hoặc ngồi sau xe máy, xe điện.',
  },
  {
    id: 'GT02',
    code: 'GT02',
    legacyId: 'crit_gt_02',
    name: 'Đội mũ bảo hiểm khi đi xe nhưng không cài quai',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Trật tự ATGT',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đội mũ bảo hiểm đối phó, không cài quai an toàn đúng quy cách.',
  },
  {
    id: 'GT03',
    code: 'GT03',
    legacyId: 'crit_gt_03',
    name: 'Xếp xe không ngay ngắn, không đúng nơi QĐ',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Trật tự ATGT',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Xe để lộn xộn trong nhà xe, để sai vị trí khu vực của lớp.',
  },
  {
    id: 'GT04',
    code: 'GT04',
    legacyId: 'crit_gt_04',
    name: 'Vượt đèn đỏ, đi hàng 3- 4 gây cản trở, ách tắc giao thông',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Trật tự ATGT',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đi xe dàn hàng ngang, lạng lách, không tuân thủ luật an toàn giao thông.',
  },

  // 8. Chất lượng học tập
  {
    id: 'HT01',
    code: 'HT01',
    legacyId: 'crit_ht_01',
    name: 'Tiết học xếp loại trung bình',
    point: 5,
    points: 5,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chất lượng học tập',
    unit: 'tiết',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Tiết học bị giáo viên bộ môn đánh giá giờ học loại Trung bình trong sổ đầu bài.',
  },
  {
    id: 'HT02',
    code: 'HT02',
    legacyId: 'crit_ht_02',
    name: '2 Tiết học xếp loại khá',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chất lượng học tập',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Trong tuần có 2 tiết học xếp loại Khá bị trừ 2 điểm.',
  },
  {
    id: 'HT03',
    code: 'HT03',
    legacyId: 'crit_ht_03',
    name: 'Các phân hiệu: 5 con điểm yếu trở lên (trừ không quá 2đ)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chất lượng học tập',
    unit: 'tuần',
    period: 'week',
    scope: 'sub_only',
    maxCap: 2,
    calculationRule: 'weak_score_sub',
    condition: 'Chỉ áp dụng cho các Phân hiệu: Từ 5 con điểm yếu trở lên trừ 2đ (khống chế trừ không quá 2đ).',
    isActive: true,
    description: 'Quy định ưu đãi cho các phân hiệu: Dưới 5 con điểm yếu không trừ, từ 5 con trở lên trừ trần 2đ.',
  },
  {
    id: 'HT04',
    code: 'HT04',
    legacyId: 'crit_ht_04',
    name: 'Trường chính: 2 con điểm yếu (Thêm 1 con điểm yếu trở đi trừ thêm 0,5đ)',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chất lượng học tập',
    unit: 'con',
    period: 'week',
    scope: 'main_only',
    calculationRule: 'weak_score_main',
    condition: 'Chỉ áp dụng cho Trường chính: 2 con điểm yếu đầu trừ 1đ, thêm mỗi con điểm yếu tiếp theo trừ thêm 0.5đ.',
    isActive: true,
    description: 'Công thức lũy tiến cho trường chính: 2 con đầu trừ 1đ, từ con thứ 3 mỗi con trừ thêm 0.5đ.',
  },
  {
    id: 'HT05',
    code: 'HT05',
    legacyId: 'crit_ht_05',
    name: 'Sử dụng điện thoại trong giờ hành chính (Tịch thu đến hết năm học với trả lại)',
    point: 5,
    points: 5,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Chất lượng học tập',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh dùng điện thoại trong giờ học khi không được giáo viên cho phép.',
  },

  // 9. Quy chế thi
  {
    id: 'QC01',
    code: 'QC01',
    legacyId: 'crit_qc_01',
    name: 'HS vi phạm quy chế thi (lớp bị trừ điểm tháng, HS hạ hạnh kiểm 1 bậc, không xét thi đua)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Quy chế thi',
    unit: 'lần/HS',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Học sinh vi phạm quy chế kiểm tra/thi định kỳ (quay cóp, mang tài liệu).',
  },

  // 10. Đóng góp – Sổ đầu bài
  {
    id: 'DG01',
    code: 'DG01',
    legacyId: 'crit_db_01',
    name: 'Đóng góp các khoản thu của Liên đội không đúng thời gian quy định (Trừ điểm tuần)',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đóng góp – Sổ đầu bài',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Lớp nộp các khoản quỹ đội, kế hoạch nhỏ chậm muộn so với thông báo.',
  },
  {
    id: 'SDB01',
    code: 'SDB01',
    legacyId: 'crit_db_02',
    name: 'Sổ đầu bài ghi thiếu, ký thiếu 1 tiết (lỗi của lớp)',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đóng góp – Sổ đầu bài',
    unit: 'tiết',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Ban cán sự lớp không đưa sổ đầu bài để giáo viên bộ môn ghi ký đủ số tiết trong tuần.',
  },

  // 11. Đội cờ đỏ (CD01 - CD04)
  {
    id: 'CD01',
    code: 'CD01',
    legacyId: 'crit_cd_01',
    name: 'Thành viên cờ đỏ không tham gia giao ban',
    point: 5,
    points: 5,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đội cờ đỏ',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đội viên cờ đỏ đại diện của lớp vắng mặt trong buổi giao ban định kỳ sáng thứ 6.',
  },
  {
    id: 'CD02',
    code: 'CD02',
    legacyId: 'crit_cd_02',
    name: 'Đi giao ban muộn',
    point: 3,
    points: 3,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đội cờ đỏ',
    unit: 'lần/em',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đội viên cờ đỏ đi muộn giờ giao ban Liên đội.',
  },
  {
    id: 'CD03',
    code: 'CD03',
    legacyId: 'crit_cd_03',
    name: 'Không mang sổ theo dõi',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đội cờ đỏ',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Đội viên cờ đỏ đi chấm hoặc giao ban không mang theo sổ ghi chép nề nếp.',
  },
  {
    id: 'CD04',
    code: 'CD04',
    legacyId: 'crit_cd_04',
    name: 'Không mang sổ đầu bài',
    point: 2,
    points: 2,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Đội cờ đỏ',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Không mang sổ đầu bài nộp cho Tổng phụ trách theo lịch kiểm tra.',
  },

  // 12. Bán trú (Áp dụng trường chính)
  {
    id: 'BT01',
    code: 'BT01',
    legacyId: 'crit_bt_01',
    name: 'Vi phạm nội quy bán trú lần 1 (Nhắc nhở)',
    point: 0,
    points: 0,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bán trú',
    unit: 'lần',
    period: 'week',
    scope: 'main_only',
    isActive: true,
    description: 'Vi phạm lần 1: Ban quản lý bán trú lập biên bản nhắc nhở (không trừ điểm).',
  },
  {
    id: 'BT02',
    code: 'BT02',
    legacyId: 'crit_bt_02',
    name: 'Vi phạm nội quy bán trú lần 2 (Trừ 1 điểm/1 HS)',
    point: 1,
    points: 1,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bán trú',
    unit: 'lần/HS',
    period: 'week',
    scope: 'main_only',
    maxCap: 3,
    isActive: true,
    description: 'Vi phạm lần 2: Trừ 1 điểm/1 HS (Trừ không quá 3 điểm/tuần).',
  },
  {
    id: 'BT03',
    code: 'BT03',
    legacyId: 'crit_bt_03',
    name: 'Vi phạm nội quy bán trú lần 3 (Đình chỉ ăn, trừ 3 điểm/1 HS)',
    point: 3,
    points: 3,
    type: 'penalty',
    type_vn: 'TRU',
    category: 'Bán trú',
    unit: 'lần/HS',
    period: 'week',
    scope: 'main_only',
    maxCap: 3,
    calculationRule: 'dormitory_step',
    isActive: true,
    description: 'Vi phạm lần 3: Đình chỉ ăn bán trú, trừ 3 điểm/1 HS (Khống chế trần trừ không quá 3 điểm).',
  },

  // =========================================================================
  // c. ĐIỂM THƯỞNG HÀNG TUẦN (BONUSES - type: 'bonus' / CỘNG)
  // =========================================================================

  // 1. Học tập (Điểm tốt 9-10đ cộng vào tuần)
  {
    id: 'TT01',
    code: 'TT01',
    legacyId: 'crit_tt_01',
    name: 'Sổ đầu bài ghi, ký đầy đủ',
    point: 3,
    points: 3,
    type: 'bonus',
    type_vn: 'CONG',
    category: 'Học tập',
    unit: 'tuần',
    period: 'week',
    scope: 'all',
    isActive: true,
    description: 'Sổ đầu bài của lớp được giáo viên bộ môn ghi nhận đầy đủ, không thiếu sót chữ ký.',
  },
  {
    id: 'TT02',
    code: 'TT02',
    legacyId: 'crit_tt_02',
    name: 'Các phân hiệu: Đạt 5 con điểm tốt (Điểm 9-10)',
    point: 2,
    points: 2,
    type: 'bonus',
    type_vn: 'CONG',
    category: 'Học tập',
    unit: 'tuần',
    period: 'week',
    scope: 'sub_only',
    maxCap: 2,
    calculationRule: 'good_score_sub',
    condition: 'Áp dụng cho các phân hiệu: Đạt từ 5 con điểm tốt (9-10) trong tuần được cộng 2đ.',
    isActive: true,
    description: 'Quy định riêng cho các phân hiệu đạt mốc 5 con điểm tốt (cộng không quá 2 điểm).',
  },
  {
    id: 'TT03',
    code: 'TT03',
    legacyId: 'crit_tt_03',
    name: 'Trường chính: Các lớp A1 đạt 13 điểm tốt (Cộng không quá 2 điểm)',
    point: 2,
    points: 2,
    type: 'bonus',
    type_vn: 'CONG',
    category: 'Học tập',
    unit: 'tuần',
    period: 'week',
    scope: 'main_only',
    targetClassType: 'A1',
    maxCap: 2,
    calculationRule: 'good_score_main_a1',
    condition: 'Chỉ áp dụng cho các lớp A1 trường chính (6A1, 7A1, 8A1, 9A1): Đạt từ 13 điểm tốt.',
    isActive: true,
    description: 'Quy định riêng cho các lớp chọn A1 trường chính: Đạt từ 13 con điểm 9-10 cộng 2đ (tối đa 2đ).',
  },
  {
    id: 'TT04',
    code: 'TT04',
    legacyId: 'crit_tt_04',
    name: 'Trường chính: Các lớp A2, A3 đạt 10 con điểm tốt (Cộng không quá 2 điểm)',
    point: 2,
    points: 2,
    type: 'bonus',
    type_vn: 'CONG',
    category: 'Học tập',
    unit: 'tuần',
    period: 'week',
    scope: 'main_only',
    targetClassType: 'A2_A3',
    maxCap: 2,
    calculationRule: 'good_score_main_a2a3',
    condition: 'Chỉ áp dụng cho các lớp A2, A3 trường chính: Đạt từ 10 con điểm tốt.',
    isActive: true,
    description: 'Quy định riêng cho lớp A2, A3 trường chính: Đạt từ 10 con điểm 9-10 cộng 2đ (tối đa 2đ).',
  },

  // 2. HS nhặt được của rơi
  {
    id: 'CR01',
    code: 'CR01',
    legacyId: 'crit_cr_01',
    name: 'Nhặt được tiền và đồ rơi có giá trị từ 200.00đ trở đi',
    point: 0.5,
    points: 0.5,
    type: 'bonus',
    type_vn: 'CONG',
    category: 'HS nhặt được của rơi',
    unit: 'lần',
    period: 'week',
    scope: 'all',
    isActive: true,
    condition: 'Giá trị từ 200.000đ trở đi; nộp phụ trách Đội để tìm người trả lại hoặc vào quỹ Đội.',
    description: 'Học sinh nhặt được của rơi có giá trị từ 200.000đ trở lên nộp phụ trách Đội (+0.5đ).',
  },
];

/**
 * Evaluates whether a criteria is applicable for a specific class
 */
export function isCriteriaApplicableForClass(
  criteria: Criteria,
  targetClass: ClassItem,
  campus: Campus
): { applicable: boolean; reason?: string } {
  // Check active
  if (!criteria.isActive) {
    return { applicable: false, reason: 'Tiêu chí đang tạm khóa' };
  }

  // Check Scope
  if (criteria.scope === 'main_only' && campus.type !== 'main') {
    return { applicable: false, reason: 'Tiêu chí chỉ áp dụng cho Trường chính' };
  }
  if (criteria.scope === 'sub_only' && campus.type !== 'sub') {
    return { applicable: false, reason: 'Tiêu chí chỉ áp dụng cho các Phân hiệu' };
  }

  // Check Target Grades
  if (criteria.targetGrades && criteria.targetGrades.length > 0) {
    if (!criteria.targetGrades.includes(targetClass.grade)) {
      return {
        applicable: false,
        reason: `Chỉ áp dụng cho Khối ${criteria.targetGrades.join(', ')} (Lớp hiện tại: Khối ${targetClass.grade})`,
      };
    }
  }

  // Check targetClassType for main campus (A1 vs A2, A3)
  if (campus.type === 'main' && criteria.targetClassType) {
    const isA1 = targetClass.name.endsWith('A1');
    if (criteria.targetClassType === 'A1' && !isA1) {
      return { applicable: false, reason: 'Chỉ áp dụng cho lớp A1 trường chính' };
    }
    if (criteria.targetClassType === 'A2_A3' && isA1) {
      return { applicable: false, reason: 'Chỉ áp dụng cho lớp A2, A3 trường chính' };
    }
  }

  return { applicable: true };
}

/**
 * Calculates exact points, applied caps, and descriptive formula for any criteria and quantity
 */
export function calculateCriteriaPoints(
  criteria: Criteria,
  quantity: number,
  targetClass: ClassItem,
  campus: Campus,
  config: EvaluationConfig = DEFAULT_EVALUATION_CONFIG
): {
  pointsPerUnit: number;
  totalPoints: number; // Signed: positive if bonus, negative if penalty
  appliedCap?: number;
  calculationDetail: string;
  isDisciplinary: boolean;
} {
  const isBonus = criteria.type === 'bonus';
  let totalMagnitude = 0;
  let calculationDetail = '';
  let appliedCap: number | undefined = undefined;
  let isDisciplinary = false;

  // Check disciplinary
  if (
    criteria.id === 'HV03' ||
    criteria.id === 'HV04' ||
    criteria.code === 'HV03' ||
    criteria.code === 'HV04' ||
    criteria.legacyId === 'crit_hv_03' ||
    criteria.legacyId === 'crit_hv_04' ||
    criteria.id === 'crit_hv_03' ||
    criteria.id === 'crit_hv_04' ||
    criteria.name.includes('Bị kỷ luật') ||
    criteria.name.includes('hạ 1 bậc hạnh kiểm')
  ) {
    isDisciplinary = true;
  }

  // Check specific calculation rules defined in PDF
  switch (criteria.calculationRule) {
    // 1. Điểm yếu tại Trường chính: 2 con điểm yếu trừ 1đ, mỗi con tiếp theo trừ 0.5đ
    case 'weak_score_main': {
      const baseThreshold = config.mainWeakBaseThreshold; // 2
      const basePoints = config.mainWeakBasePoints; // 1
      const stepPoints = config.mainWeakStepPoints; // 0.5

      if (quantity < baseThreshold) {
        totalMagnitude = 0;
        calculationDetail = `Dưới ${baseThreshold} con điểm yếu (${quantity} con): Chưa chạm ngưỡng trừ điểm`;
      } else {
        const extraCount = quantity - baseThreshold;
        totalMagnitude = basePoints + extraCount * stepPoints;
        calculationDetail = `${baseThreshold} con đầu trừ ${basePoints}đ + ${extraCount} con tiếp theo x ${stepPoints}đ = -${totalMagnitude}đ`;
      }
      break;
    }

    // 2. Điểm yếu tại Các phân hiệu: từ 5 con điểm yếu trở lên trừ 2đ (trừ không quá 2đ)
    case 'weak_score_sub': {
      const threshold = config.subWeakThreshold; // 5
      const penalty = config.subWeakPenalty; // 2
      const cap = config.subWeakMaxCap; // 2

      if (quantity < threshold) {
        totalMagnitude = 0;
        calculationDetail = `Dưới ${threshold} con điểm yếu (${quantity} con): Chưa chạm ngưỡng trừ điểm`;
      } else {
        totalMagnitude = Math.min(penalty, cap);
        appliedCap = cap;
        calculationDetail = `Đạt ${quantity} con điểm yếu (≥ ${threshold} con): Trừ ${penalty}đ (Giới hạn trừ không quá ${cap}đ)`;
      }
      break;
    }

    // 3. Điểm tốt Trường chính lớp A1: 13 con điểm tốt cộng 2đ (cộng không quá 2đ)
    case 'good_score_main_a1': {
      const threshold = config.mainA1GoodThreshold; // 13
      const bonus = config.goodScoreBonus; // 2
      const cap = config.goodScoreMaxCap; // 2

      if (quantity < threshold) {
        totalMagnitude = 0;
        calculationDetail = `Lớp A1 đạt ${quantity}/${threshold} điểm tốt: Chưa đủ định mức để cộng điểm`;
      } else {
        totalMagnitude = Math.min(bonus, cap);
        appliedCap = cap;
        calculationDetail = `Lớp A1 đạt ${quantity} điểm tốt (≥ ${threshold} con): Cộng ${bonus}đ (Giới hạn tối đa ${cap}đ)`;
      }
      break;
    }

    // 4. Điểm tốt Trường chính lớp A2, A3: 10 con điểm tốt cộng 2đ (cộng không quá 2đ)
    case 'good_score_main_a2a3': {
      const threshold = config.mainA2A3GoodThreshold; // 10
      const bonus = config.goodScoreBonus; // 2
      const cap = config.goodScoreMaxCap; // 2

      if (quantity < threshold) {
        totalMagnitude = 0;
        calculationDetail = `Lớp A2/A3 đạt ${quantity}/${threshold} điểm tốt: Chưa đủ định mức để cộng điểm`;
      } else {
        totalMagnitude = Math.min(bonus, cap);
        appliedCap = cap;
        calculationDetail = `Lớp A2/A3 đạt ${quantity} điểm tốt (≥ ${threshold} con): Cộng ${bonus}đ (Giới hạn tối đa ${cap}đ)`;
      }
      break;
    }

    // 5. Điểm tốt Các phân hiệu: 5 con điểm tốt cộng 2đ
    case 'good_score_sub': {
      const threshold = config.subGoodThreshold; // 5
      const bonus = config.goodScoreBonus; // 2

      if (quantity < threshold) {
        totalMagnitude = 0;
        calculationDetail = `Phân hiệu đạt ${quantity}/${threshold} điểm tốt: Chưa đủ định mức`;
      } else {
        totalMagnitude = bonus;
        calculationDetail = `Phân hiệu đạt ${quantity} điểm tốt (≥ ${threshold} con): Cộng ${bonus}đ`;
      }
      break;
    }

    // 6. Bán trú trường chính: Lần 3 đình chỉ ăn, trừ 3đ/HS (Trừ không quá 3 điểm)
    case 'dormitory_step': {
      const cap = config.dormitoryMaxCap; // 3
      const raw = criteria.points * quantity;
      totalMagnitude = Math.min(raw, cap);
      appliedCap = cap;
      calculationDetail = `${quantity} HS vi phạm bán trú x ${criteria.points}đ = ${raw}đ (Giới hạn trừ không quá ${cap}đ)`;
      break;
    }

    // 7. Đội nghi lễ phục vụ Liên đội cả năm: 0.1đ/1 em, tối đa không quá 0.5đ/lớp
    case 'ceremony_team': {
      const cap = config.ceremonyMaxCap; // 0.5
      const raw = Number((criteria.points * quantity).toFixed(2));
      totalMagnitude = Math.min(raw, cap);
      appliedCap = cap;
      calculationDetail = `${quantity} em đội nghi lễ x ${criteria.points}đ = ${raw}đ (Tối đa không quá ${cap}đ/lớp)`;
      break;
    }

    // 8. Các trường hợp tiêu chuẩn có thể có maxCap
    default: {
      const raw = criteria.points * quantity;
      if (criteria.maxCap && raw > criteria.maxCap) {
        totalMagnitude = criteria.maxCap;
        appliedCap = criteria.maxCap;
        calculationDetail = `${quantity} ${criteria.unit} x ${criteria.points}đ = ${raw}đ (Giới hạn tối đa ${criteria.maxCap}đ)`;
      } else {
        totalMagnitude = raw;
        calculationDetail = `${quantity} ${criteria.unit} x ${criteria.points}đ = ${raw}đ`;
      }
      break;
    }
  }

  // Format final signed points
  const totalPoints = isBonus ? totalMagnitude : -totalMagnitude;

  return {
    pointsPerUnit: criteria.points,
    totalPoints,
    appliedCap,
    calculationDetail,
    isDisciplinary,
  };
}

/**
 * Finds the corresponding month for a given school week based on settings
 */
export function getMonthForWeek(week: number, monthWeeksMap?: Record<number, number[]>): number {
  const map = monthWeeksMap || {
    9: [1, 2, 3, 4],
    10: [5, 6, 7, 8],
    11: [9, 10, 11, 12, 13],
    12: [14, 15, 16, 17, 18],
    1: [19, 20, 21, 22],
    2: [23, 24, 25, 26],
    3: [27, 28, 29, 30],
    4: [31, 32, 33, 34],
    5: [35],
  };
  for (const [mStr, weeks] of Object.entries(map)) {
    if (weeks && weeks.includes(week)) {
      return Number(mStr);
    }
  }
  // Default fallback: weeks 1-4 = Sep, 5-8 = Oct, 9-13 = Nov, 14-18 = Dec, 19-22 = Jan, 23-26 = Feb, 27-30 = Mar, 31-35 = Apr
  if (week <= 4) return 9;
  if (week <= 8) return 10;
  if (week <= 13) return 11;
  if (week <= 18) return 12;
  if (week <= 22) return 1;
  if (week <= 26) return 2;
  if (week <= 30) return 3;
  return 4;
}

/**
 * Finds semester for a given month or week
 */
export function getSemesterForWeek(week: number): 1 | 2 {
  return week <= 18 ? 1 : 2;
}

export function getSemesterForMonth(month: number): 1 | 2 {
  return [9, 10, 11, 12].includes(month) ? 1 : 2;
}

/**
 * Robust criteria finder matching by id (CC01, CD01...), code, or legacyId
 */
export function findCriteriaByIdOrCode(
  criteriaList: Criteria[] | undefined | null,
  idOrCode: string | undefined | null
): Criteria | undefined {
  if (!criteriaList || !idOrCode) return undefined;
  const query = idOrCode.trim();
  return criteriaList.find(
    (c) =>
      c.id === query ||
      c.code === query ||
      c.code?.toLowerCase() === query.toLowerCase() ||
      c.id?.toLowerCase() === query.toLowerCase() ||
      c.legacyId === query
  );
}
