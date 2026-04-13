/**
 * Lucide 아이콘 목록 + 카테고리
 * - 전체: lucide-react가 export 하는 모든 icons 사용
 * - 카테고리: Lucide 공식 카테고리를 기반으로 한 큐레이션 매핑
 */

import { icons, type LucideIcon } from "lucide-react";

// icons는 { [PascalCaseName]: LucideIcon } 형태의 레코드
const allEntries = Object.entries(icons) as Array<[string, LucideIcon]>;

export interface IconEntry {
  name: string;
  Icon: LucideIcon;
}

export const LUCIDE_ALL: IconEntry[] = allEntries.map(([name, Icon]) => ({
  name,
  Icon,
}));

export const LUCIDE_ICONS_MAP = new Map(LUCIDE_ALL.map((e) => [e.name, e.Icon]));

/**
 * 카테고리 매핑 — Lucide 공식 카테고리 일부를 큐레이션
 * 카테고리별로 대표 아이콘 이름들 (PascalCase) 배열.
 * 검색은 별도로 동작하며, 이 카테고리는 빠른 탐색용.
 */
export const LUCIDE_CATEGORIES: Record<string, string[]> = {
  "파일 & 폴더": [
    "File", "FileText", "FileCode", "FileImage", "FileVideo", "FileAudio",
    "FileArchive", "FileSpreadsheet", "FilePlus", "FileMinus", "FileSearch",
    "Files", "Folder", "FolderOpen", "FolderPlus", "FolderMinus", "FolderTree",
    "FolderArchive", "Archive", "ArchiveRestore", "HardDrive", "Save", "Copy",
    "Paperclip", "Download", "Upload",
  ],
  "편집 & 텍스트": [
    "Pencil", "PencilLine", "Edit", "Edit2", "Edit3", "Type", "TypeOutline",
    "Text", "Heading1", "Heading2", "Heading3", "Bold", "Italic", "Underline",
    "Strikethrough", "AlignLeft", "AlignCenter", "AlignRight", "AlignJustify",
    "List", "ListOrdered", "ListChecks", "ListTodo", "Quote", "Code",
    "Code2", "Hash", "Link", "Link2", "Unlink", "Scissors", "Clipboard",
    "ClipboardCopy", "ClipboardPaste", "Eraser", "Trash", "Trash2",
  ],
  "레이아웃 & 디자인": [
    "Layout", "LayoutGrid", "LayoutList", "LayoutTemplate", "LayoutDashboard",
    "Grid", "Grid2x2", "Grid3x3", "Columns", "Columns2", "Columns3", "Rows",
    "Rows2", "Rows3", "Sidebar", "SidebarOpen", "SidebarClose", "Square",
    "Circle", "Triangle", "Hexagon", "Pentagon", "Octagon", "Diamond", "Star",
    "Layers", "Layers2", "Layers3", "Palette", "Paintbrush", "Paintbrush2",
    "PaintBucket", "Pipette", "Eye", "EyeOff", "Maximize", "Minimize",
  ],
  "커뮤니케이션": [
    "MessageCircle", "MessageSquare", "MessagesSquare", "Mail", "MailOpen",
    "MailPlus", "MailMinus", "Send", "Phone", "PhoneCall", "PhoneIncoming",
    "PhoneOutgoing", "Mic", "MicOff", "Video", "VideoOff", "Webcam",
    "Headphones", "AtSign", "Hash", "Bell", "BellOff", "BellPlus", "BellRing",
    "Inbox", "Outbox",
  ],
  "미디어 & 사진": [
    "Image", "Images", "Camera", "CameraOff", "Video", "VideoOff", "Film",
    "Music", "Music2", "Music3", "Music4", "Play", "PlayCircle", "Pause",
    "PauseCircle", "Square", "SkipBack", "SkipForward", "FastForward", "Rewind",
    "Volume", "Volume1", "Volume2", "VolumeX", "Disc", "Disc2", "Disc3",
    "Mic", "Radio", "Tv", "Tv2", "Speaker", "Headphones", "Podcast",
  ],
  "사람 & 소셜": [
    "User", "UserCircle", "UserPlus", "UserMinus", "UserCheck", "UserX",
    "UserCog", "Users", "UsersRound", "Heart", "HeartHandshake", "HeartPulse",
    "HeartOff", "ThumbsUp", "ThumbsDown", "Smile", "Frown", "Meh", "Laugh",
    "Angry", "Hand", "HandMetal", "Handshake", "HandHeart", "Baby",
  ],
  "도구 & 설정": [
    "Settings", "Settings2", "Sliders", "SlidersHorizontal", "SlidersVertical",
    "Wrench", "Hammer", "Cog", "Wrench", "ToolCase", "Drill", "Axe",
    "Scissors", "PaintRoller", "Key", "KeyRound", "KeySquare", "Lock",
    "LockOpen", "Unlock", "Shield", "ShieldCheck", "ShieldAlert", "ShieldOff",
    "Filter", "FilterX", "Funnel", "Power", "Plug", "PlugZap", "Zap",
  ],
  "화살표 & 탐색": [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUpRight",
    "ArrowUpLeft", "ArrowDownRight", "ArrowDownLeft", "ArrowBigUp",
    "ArrowBigDown", "ArrowBigLeft", "ArrowBigRight", "ChevronUp", "ChevronDown",
    "ChevronLeft", "ChevronRight", "ChevronsUp", "ChevronsDown", "ChevronsLeft",
    "ChevronsRight", "MoveUp", "MoveDown", "MoveLeft", "MoveRight", "Move",
    "Navigation", "Navigation2", "Compass", "Map", "MapPin", "Locate",
    "LocateFixed", "Route", "Milestone",
  ],
  "자연 & 날씨": [
    "Sun", "Moon", "Stars", "Cloud", "CloudRain", "CloudSnow", "CloudLightning",
    "CloudSun", "CloudMoon", "CloudFog", "CloudDrizzle", "CloudHail",
    "Cloudy", "Wind", "Snowflake", "Droplet", "Droplets", "Umbrella",
    "Rainbow", "Sunrise", "Sunset", "Tornado", "Thermometer", "Flame",
    "Leaf", "LeafyGreen", "TreePine", "TreeDeciduous", "TreePalm", "Flower",
    "Flower2", "Sprout", "Mountain", "MountainSnow", "Waves",
  ],
  "상태 & 알림": [
    "Check", "CheckCheck", "CheckCircle", "CheckCircle2", "CheckSquare",
    "X", "XCircle", "XSquare", "AlertCircle", "AlertTriangle", "AlertOctagon",
    "Info", "HelpCircle", "Bell", "BellRing", "BellOff", "Loader",
    "LoaderCircle", "CircleDot", "CircleDashed", "CircleEllipsis", "Activity",
    "Zap", "Clock", "Clock1", "Clock2", "Clock3", "Timer", "Hourglass",
  ],
  "기기 & 개발": [
    "Laptop", "Laptop2", "Monitor", "Smartphone", "Tablet", "TabletSmartphone",
    "Watch", "Tv", "Server", "ServerCog", "Database", "HardDrive",
    "Cpu", "MemoryStick", "Keyboard", "Mouse", "MouseOff", "Printer",
    "Scan", "Usb", "Plug", "PlugZap", "Cable", "Wifi", "WifiOff", "Bluetooth",
    "Terminal", "TerminalSquare", "Code", "Code2", "Braces", "Brackets",
    "Bug", "Github", "Gitlab",
  ],
  "비즈니스 & 쇼핑": [
    "ShoppingCart", "ShoppingBag", "ShoppingBasket", "Store", "Package",
    "PackageOpen", "PackagePlus", "Truck", "Gift", "GiftCard", "Tag",
    "Tags", "Receipt", "CreditCard", "Wallet", "DollarSign", "Euro",
    "PoundSterling", "IndianRupee", "JapaneseYen", "Banknote", "Coins",
    "Building", "Building2", "Briefcase", "BriefcaseBusiness", "Landmark",
    "ChartBar", "ChartPie", "ChartLine", "TrendingUp", "TrendingDown",
  ],
};

/** LUCIDE_CATEGORIES에 존재하지 않는 아이콘 이름은 무시하고, 실제 존재하는 것만 반환 */
export function getLucideIconsByCategory(category: string): IconEntry[] {
  const names = LUCIDE_CATEGORIES[category] ?? [];
  return names
    .map((name) => {
      const Icon = LUCIDE_ICONS_MAP.get(name);
      return Icon ? { name, Icon } : null;
    })
    .filter((e): e is IconEntry => e !== null);
}
