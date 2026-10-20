import {
  BookOpen,
  Castle,
  FlaskConical,
  Globe2,
  Film,
  Cpu,
  Swords,
  Trophy,
  ScrollText,
  UserRound,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Clock3,
  Search,
  ChevronRight,
  Menu,
  LogOut,
  Flag,
  CircleHelp,
  Volume2,
  VolumeX,
  Plus,
  ArrowLeft,
  RotateCcw,
  Crown,
  Target,
  Zap,
  CheckCircle2,
} from "lucide-react";
export const icons = {
  book: BookOpen,
  castle: Castle,
  flask: FlaskConical,
  globe: Globe2,
  film: Film,
  cpu: Cpu,
  swords: Swords,
  trophy: Trophy,
  scroll: ScrollText,
  user: UserRound,
  shield: Shield,
  sparkles: Sparkles,
  arrow: ArrowRight,
  check: Check,
  x: X,
  clock: Clock3,
  search: Search,
  chevron: ChevronRight,
  menu: Menu,
  logout: LogOut,
  flag: Flag,
  help: CircleHelp,
  volume: Volume2,
  mute: VolumeX,
  plus: Plus,
  back: ArrowLeft,
  refresh: RotateCcw,
  crown: Crown,
  target: Target,
  zap: Zap,
  success: CheckCircle2,
};
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Component = icons[name as keyof typeof icons] ?? Shield;
  return (
    <Component size={size} strokeWidth={1.8} aria-hidden="true" {...props} />
  );
}
export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
export function DemoNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className="demo-note">
      <Icon name="sparkles" size={16} />
      <span>
        {children ??
          "Modo demonstração · jogadores e dados ilustrativos. Sem multiplayer ou IA conectados."}
      </span>
    </div>
  );
}
