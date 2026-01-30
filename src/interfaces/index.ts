
export const PostStatus = {
  PUBLISHED: "published",
  DRAFT: "draft",
  PENDING: "pending",
  HIDDEN: "hidden",
  REJECTED: "rejected",
  ARCHIVED: "archived",
} as const;
export type PostStatus = typeof PostStatus[keyof typeof PostStatus];

export const PostStatusLabels: Record<PostStatus, string> = {
  [PostStatus.PUBLISHED]: "已发布",
  [PostStatus.DRAFT]: "草稿",
  [PostStatus.PENDING]: "待审核",
  [PostStatus.HIDDEN]: "隐藏",
  [PostStatus.REJECTED]: "已拒绝",
  [PostStatus.ARCHIVED]: "已归档",
};

export const PostType = {
  THEORY: "theory",
  HELP: "help",
  DEBATE: "debate",
  CHAT: "chat",
} as const;
export type PostType = typeof PostType[keyof typeof PostType];

export const PostTypeLabels: Record<PostType, string> = {
  [PostType.THEORY]: "理论",
  [PostType.HELP]: "求助",
  [PostType.DEBATE]: "讨论",
  [PostType.CHAT]: "闲聊",
};

export const ReportStatus = {
  PENDING: "pending",
  RESOLVED: "resolved",
  REJECTED: "rejected",
} as const;
export type ReportStatus = typeof ReportStatus[keyof typeof ReportStatus];

export const ReportStatusLabels: Record<ReportStatus, string> = {
  [ReportStatus.PENDING]: "待处理",
  [ReportStatus.RESOLVED]: "已解决",
  [ReportStatus.REJECTED]: "已驳回",
};

export const ReportReason = {
  COMPLIANCE: "compliance",
  SUPERSTITION: "superstition",
  SCAM: "scam",
  ATTACK: "attack",
  SPAM: "spam",
} as const;
export type ReportReason = typeof ReportReason[keyof typeof ReportReason];

export const ReportReasonLabels: Record<ReportReason, string> = {
  [ReportReason.COMPLIANCE]: "违规违法",
  [ReportReason.SUPERSTITION]: "封建迷信",
  [ReportReason.SCAM]: "诈骗广告",
  [ReportReason.ATTACK]: "人身攻击",
  [ReportReason.SPAM]: "垃圾内容",
};

export const RoleType = {
  SUPER_ADMIN: "super_admin",
  NORMAL_ADMIN: "admin",
  USER: "user",
} as const;
export type RoleType = typeof RoleType[keyof typeof RoleType];

export const RoleTypeLabels: Record<RoleType, string> = {
  [RoleType.SUPER_ADMIN]: "超级管理员",
  [RoleType.NORMAL_ADMIN]: "普通管理员",
  [RoleType.USER]: "普通用户",
};

export const TagCategory = {
  SUBJECT: "subject",
  TECHNIQUE: "technique",
  CUSTOM: "custom",
} as const;
export type TagCategory = typeof TagCategory[keyof typeof TagCategory];

export const TagCategoryLabels: Record<TagCategory, string> = {
  [TagCategory.SUBJECT]: "事类",
  [TagCategory.TECHNIQUE]: "技法",
  [TagCategory.CUSTOM]: "自定义",
};

export const TagScope = {
  GENERAL: "general",
  LIUYAO: "liuyao",
  BAZI: "bazi",
  QIMEN: "qimen",
  MEIHUA: "meihua",
  ZIWEI: "ziwei",
} as const;
export type TagScope = typeof TagScope[keyof typeof TagScope];

export interface ResourceLike {
  name?: string;
  meta?: {
    originalCode?: string;
    [key: string]: unknown;
  };
  list?: string;
  [key: string]: unknown;
}

export type UserPermission = string;

export const TagScopeLabels: Record<TagScope, string> = {
  [TagScope.GENERAL]: "通用",
  [TagScope.LIUYAO]: "六爻",
  [TagScope.BAZI]: "八字",
  [TagScope.QIMEN]: "奇门",
  [TagScope.MEIHUA]: "梅花",
  [TagScope.ZIWEI]: "紫微",
};

export interface ILibraryBook {
  id: string;
  title: string;
  author?: string;
  dynasty?: string;
  category?: string;
  status: 'draft' | 'reviewed' | 'published';
  cover_url?: string;
  description?: string;
  source_type: 'wiki' | 'github' | 'legacy' | 'manual';
  created_at: string;
  source_payload?: Record<string, unknown>;
  is_manually_reviewed?: boolean;
  slice_enabled?: boolean;
  progress?: number;
  source_url?: string;
  pdf_url?: string;
  volume_type?: 'none' | 'upper' | 'lower';
}

export const LibraryBookStatus = {
  DRAFT: "draft",
  REVIEWED: "reviewed",
  PUBLISHED: "published",
} as const;
export type LibraryBookStatus = typeof LibraryBookStatus[keyof typeof LibraryBookStatus];

export const LibraryBookStatusLabels: Record<LibraryBookStatus, string> = {
  [LibraryBookStatus.DRAFT]: "草稿",
  [LibraryBookStatus.REVIEWED]: "已审核",
  [LibraryBookStatus.PUBLISHED]: "已发布",
};

export const LibraryBookSourceType = {
  WIKI: "wiki",
  GITHUB: "github",
  LEGACY: "legacy",
  MANUAL: "manual",
} as const;
export type LibraryBookSourceType = typeof LibraryBookSourceType[keyof typeof LibraryBookSourceType];

export const LibraryBookSourceTypeLabels: Record<LibraryBookSourceType, string> = {
  [LibraryBookSourceType.WIKI]: "Wiki",
  [LibraryBookSourceType.GITHUB]: "GitHub",
  [LibraryBookSourceType.LEGACY]: "旧系统",
  [LibraryBookSourceType.MANUAL]: "手动录入",
};

export interface IPost {
  id: string;
  title: string;
  content: string;
  status: PostStatus;
  type: PostType;
  user_id: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  like_count: number;
  comment_count?: number;
  share_count?: number;
  reply_count: number;
  is_urgent: boolean;
  sticky_until?: string;
  bounty?: number;
  divination_record_id?: string;
  category_id?: string;
  summary?: string;
  slug?: string;
  cover_image?: string;
  tags?: string[];
}

export interface IComment {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  status: string; 
  like_count?: number;
  post?: {
      title: string;
  };
  author?: {
      nickname: string;
      avatar_url?: string;
      email?: string;
  };
}

export const BalanceType = {
  COIN: "coin",
  FREE_COIN: "free_coin",
} as const;
export type BalanceType = typeof BalanceType[keyof typeof BalanceType];

export const BalanceTypeLabels: Record<BalanceType, string> = {
  [BalanceType.COIN]: "易币",
  [BalanceType.FREE_COIN]: "赠币",
};

export const TransactionType = {
  RECHARGE: "recharge",
  CONSUME: "consume",
  REFUND: "refund",
  SYSTEM_GRANT: "system_grant",
  CHECK_IN: "check_in",
  SPEND: "spend",
} as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const TransactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.RECHARGE]: "充值",
  [TransactionType.CONSUME]: "消费",
  [TransactionType.REFUND]: "退款",
  [TransactionType.SYSTEM_GRANT]: "系统发放",
  [TransactionType.CHECK_IN]: "签到",
  [TransactionType.SPEND]: "支出",
};

export interface ICoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_type: BalanceType;
  transaction_type: TransactionType;
  description: string;
  related_batch_id?: string;
  created_at: string;
  user?: {
    id: string;
    nickname: string;
    avatar_url: string;
    email: string;
  };
}

export interface ITag {
    id: string;
    name: string;
    category: TagCategory;
    scope: TagScope;
    created_at: string;
    updated_at?: string;
    usage_count?: number;
    is_recommended?: boolean;
    recommended_rank?: number;
}

export interface IRechargeOption {
    id: string;
    label: string;
    amount_cny: number;
    coins_amount: number;
    sort_order: number;
    is_recommend: boolean;
    is_active: boolean;
    created_at: string;
    description?: string;
}

export interface IAuditLog {
    id: string;
    action: string;
    resource: string;
    target_id: string;
    created_at: string;
    operator_id: string;
    operator?: {
        nickname: string;
        avatar_url: string;
    };
    previous_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
}
